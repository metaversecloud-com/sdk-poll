// Rules the server must enforce on its own: who may change the poll, one vote per player, valid
// answers only, and every vote counted when many arrive at once. Players can call /api directly
// with their own session credentials, so the browser's checks don't count.
import { INTERACTIVE_SECRET } from "../../constants";
import { EMPTY_POLL, expect, poll, test, totalVotes } from "../../fixtures";

const ISSUE = "EXP-438";

test.describe("admin routes reject players", () => {
  const calls = [
    {
      name: "replace the poll",
      method: "put",
      path: "/poll",
      data: { crucial: true, question: "Hijacked?", answers: ["Yes", "Also yes"], displayMode: "count" },
    },
    { name: "change the display mode", method: "put", path: "/poll", data: { crucial: false, displayMode: "count" } },
    { name: "reset the poll", method: "post", path: "/admin/reset" },
  ] as const;

  for (const call of calls) {
    test(call.name, async ({ page, world }) => {
      test.fail(true, `${ISSUE}: PUT /poll and POST /admin/reset never check isAdmin`);
      await world.seed({ isAdmin: false, assetData: poll({ votes: { "profile-a": 1 } }) });
      const before = await world.poll();

      const response = await page.request[call.method](world.api(call.path), { data: "data" in call ? call.data : undefined });

      expect(response.ok()).toBe(false);
      expect(await world.poll()).toEqual(before);
    });
  }
});

test.describe("one vote per player", () => {
  test("a player can't add votes under made-up profile ids", async ({ page, world }) => {
    test.fail(true, `${ISSUE}: /vote counts the vote for the profileId in the request body`);
    await world.seed({ assetData: poll() });

    for (let i = 0; i < 5; i++) {
      await page.request.post(world.api("/vote"), { data: { optionId: 0, profileId: `sock-puppet-${i}` } });
    }

    expect(totalVotes(await world.poll())).toBeLessThanOrEqual(1);
  });

  test("a player can't change another player's vote", async ({ page, world }) => {
    test.fail(true, `${ISSUE}: /vote counts the vote for the profileId in the request body`);
    await world.seed({ assetData: poll({ votes: { "profile-victim": 2 } }) });

    await page.request.post(world.api("/vote"), { data: { optionId: 0, profileId: "profile-victim" } });

    expect((await world.poll()).results["profile-victim"]).toEqual({ answer: 2 });
  });

  test("a vote without a profile id is rejected", async ({ page, world }) => {
    await world.seed({ assetData: poll() });

    const response = await page.request.post(world.api("/vote"), { data: { optionId: 0 } });

    expect(response.status()).toBe(400);
    expect(totalVotes(await world.poll())).toBe(0);
  });
});

test.describe("only real answers can be voted for", () => {
  for (const optionId of [7, -1, "Spring"]) {
    test(`a vote for option ${JSON.stringify(optionId)} is rejected`, async ({ page, world }) => {
      test.fail(true, `${ISSUE}: /vote doesn't check optionId against the poll's answers`);
      await world.seed({ assetData: poll() });

      const response = await page.request.post(world.api("/vote"), { data: { optionId, profileId: world.profileId } });

      expect(response.ok()).toBe(false);
      expect(Object.keys((await world.poll()).options)).toEqual(["0", "1", "2", "3"]);
    });
  }

  test("a vote on a poll that was reset is rejected", async ({ page, world }) => {
    test.fail(true, `${ISSUE}: /vote accepts votes when no poll is configured`);
    await world.seed({ assetData: EMPTY_POLL });

    const response = await page.request.post(world.api("/vote"), { data: { optionId: 0, profileId: world.profileId } });

    expect(response.ok()).toBe(false);
    expect(await world.poll()).toEqual(EMPTY_POLL);
  });
});

test.describe("poll settings are validated by the server", () => {
  const save = (answers: string[], questionText = "Pick one") => ({ crucial: true, question: questionText, answers, displayMode: "count" });

  test("an empty question or a single answer is rejected", async ({ page, world }) => {
    await world.seed({ isAdmin: true, assetData: poll() });
    const before = await world.poll();

    for (const data of [save(["A", "B"], "   "), save(["Only one", " "])]) {
      const response = await page.request.put(world.api("/poll"), { data });
      expect(response.status()).toBe(400);
      expect((await response.json()).message).toBe("Question required and at least two answers.");
    }
    expect(await world.poll()).toEqual(before);
  });

  test("more than ten answers are rejected", async ({ page, world }) => {
    test.fail(true, `${ISSUE}: the 10-answer limit exists only in the admin form`);
    await world.seed({ isAdmin: true, assetData: poll() });

    const response = await page.request.put(world.api("/poll"), { data: save(Array.from({ length: 50 }, (_, i) => `Answer ${i}`)) });

    expect(response.ok()).toBe(false);
    expect((await world.poll()).answers).toHaveLength(4);
  });

  test("an over-long question or answer is rejected", async ({ page, world }) => {
    test.fail(true, `${ISSUE}: the 150/100-character limits exist only in the admin form`);
    await world.seed({ isAdmin: true, assetData: poll() });

    const longAnswer = await page.request.put(world.api("/poll"), { data: save(["x".repeat(5000), "B"]) });
    const longQuestion = await page.request.put(world.api("/poll"), { data: save(["A", "B"], "q".repeat(5000)) });

    expect(longAnswer.ok()).toBe(false);
    expect(longQuestion.ok()).toBe(false);
    expect((await world.poll()).question).toBe("Favourite season?");
  });

  test("an unknown display mode is rejected", async ({ page, world }) => {
    test.fail(true, `${ISSUE}: displayMode isn't validated`);
    await world.seed({ isAdmin: true, assetData: poll() });

    const response = await page.request.put(world.api("/poll"), { data: { crucial: false, displayMode: "<b>raw</b>" } });

    expect(response.ok()).toBe(false);
    expect((await world.poll()).displayMode).toBe("percentage");
  });
});

test("players don't receive who voted for what", async ({ page, world }) => {
  test.fail(true, `${ISSUE}: GET /poll returns every player's choice keyed by profileId`);
  await world.seed({ assetData: poll({ votes: { "profile-alice": 0, "profile-bob": 3 } }) });

  const { poll: received } = await (await page.request.get(world.api("/poll"))).json();

  expect(JSON.stringify(received)).not.toContain("profile-alice");
  expect(JSON.stringify(received)).not.toContain("profile-bob");
});

test.describe("simultaneous votes", () => {
  test("twenty players voting at once are all counted", async ({ page, world }) => {
    test.fail(true, `${ISSUE}: /vote rewrites options and results from a stale read, so simultaneous votes are lost`);
    await world.seed({ assetData: poll({ displayMode: "count" }) });
    const players = Array.from({ length: 20 }, (_, i) => `profile-voter-${i}`);

    const responses = await Promise.all(
      players.map((profileId, i) =>
        page.request.post(world.api("/vote", { profileId, visitorId: String(100 + i) }), { data: { optionId: i % 4, profileId } }),
      ),
    );

    for (const response of responses) expect(await response.text()).not.toContain(INTERACTIVE_SECRET);
    expect(responses.filter((r) => !r.ok()), "failed votes").toHaveLength(0);
    const stored = await world.poll();
    expect(Object.keys(stored.results).sort()).toEqual([...players].sort());
    expect(totalVotes(stored)).toBe(20);
  });

  test("votes one after another are all counted", async ({ page, world }) => {
    await world.seed({ assetData: poll({ displayMode: "count" }) });

    for (let i = 0; i < 5; i++) {
      const profileId = `profile-seq-${i}`;
      const response = await page.request.post(world.api("/vote", { profileId }), { data: { optionId: 1, profileId } });
      expect(response.ok()).toBe(true);
    }

    expect((await world.poll()).options["1"]).toEqual({ votes: 5 });
  });
});
