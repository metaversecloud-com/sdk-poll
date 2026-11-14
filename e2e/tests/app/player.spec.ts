// What players see and do: the question, voting, changing a vote, and how results are shown.
import { Page } from "@playwright/test";
import { EMPTY_POLL, expect, poll, test, totalVotes } from "../../fixtures";

const option = (page: Page, answer: string) => page.getByRole("button", { name: new RegExp(`^${answer}`) });

test("a new poll asset starts empty and says no poll is configured", async ({ page, world }) => {
  await world.seed();
  await page.goto(world.url("/"));

  await expect(page.getByText("There is currently no poll configured.")).toBeVisible();
  expect(await world.poll()).toEqual(EMPTY_POLL);
  expect((await world.events("analytics")).map((a) => a.analyticName)).toEqual(["starts"]);
});

test("shows the question and every answer, without results before voting", async ({ page, world }) => {
  await world.seed({ assetData: poll({ votes: { "profile-a": 0, "profile-b": 1 } }) });
  await page.goto(world.url("/"));

  await expect(page.getByRole("heading", { name: "Favourite season?" })).toBeVisible();
  for (const answer of ["Spring", "Summer", "Autumn", "Winter"]) await expect(option(page, answer)).toHaveText(answer);
  await expect(page.getByText("%")).toHaveCount(0);
});

test("voting records the vote in Topia and reveals the percentages", async ({ page, world }) => {
  await world.seed({ assetData: poll({ votes: { "profile-a": 0, "profile-b": 1, "profile-c": 1 } }) });
  await page.goto(world.url("/"));

  await option(page, "Summer").click();

  await expect(option(page, "Summer")).toHaveText("Summer75%");
  await expect(option(page, "Spring")).toHaveText("Spring25%");
  await expect(option(page, "Autumn")).toHaveText("Autumn0%");
  await expect(option(page, "Summer")).toHaveClass(/^btn /);
  await expect(option(page, "Spring")).toHaveClass(/btn-outline/);

  const stored = await world.poll();
  expect(stored.results[world.profileId]).toEqual({ answer: 1 });
  expect(stored.options).toEqual({ "0": { votes: 1 }, "1": { votes: 3 }, "2": { votes: 0 }, "3": { votes: 0 } });
  expect(await world.events("analytics")).toContainEqual(
    expect.objectContaining({ analyticName: "completions", profileId: world.profileId, uniqueKey: world.profileId }),
  );
});

test("count mode shows the number of votes per answer", async ({ page, world }) => {
  await world.seed({ assetData: poll({ displayMode: "count", votes: { "profile-a": 2, "profile-b": 2 } }) });
  await page.goto(world.url("/"));

  await option(page, "Autumn").click();

  await expect(option(page, "Autumn")).toHaveText("Autumn3 votes");
  await expect(option(page, "Winter")).toHaveText("Winter0 votes");
});

test("changing the vote moves it to the new answer", async ({ page, world }) => {
  await world.seed({ assetData: poll({ displayMode: "count", votes: { "profile-a": 0 } }) });
  await page.goto(world.url("/"));

  await option(page, "Spring").click();
  await expect(option(page, "Spring")).toHaveText("Spring2 votes");
  await option(page, "Winter").click();

  await expect(option(page, "Winter")).toHaveText("Winter1 votes");
  await expect(option(page, "Spring")).toHaveText("Spring1 votes");
  const stored = await world.poll();
  expect(stored.results[world.profileId]).toEqual({ answer: 3 });
  expect(totalVotes(stored)).toBe(2);
});

test("clicking the same answer again doesn't count twice", async ({ page, world }) => {
  await world.seed({ assetData: poll({ displayMode: "count" }) });
  await page.goto(world.url("/"));

  await option(page, "Summer").click();
  await expect(option(page, "Summer")).toHaveText("Summer1 votes");
  await option(page, "Summer").click();
  await expect(option(page, "Summer")).toBeEnabled();

  await expect(option(page, "Summer")).toHaveText("Summer1 votes");
  expect(totalVotes(await world.poll())).toBe(1);
});

test("a returning player sees their earlier vote and the results", async ({ page, world }) => {
  await world.seed({ assetData: poll({ votes: { [world.profileId]: 2, "profile-a": 0 } }) });
  await page.goto(world.url("/"));

  await expect(option(page, "Autumn")).toHaveText("Autumn50%");
  await expect(option(page, "Autumn")).toHaveClass(/^btn /);
});

test("Refresh picks up other players' votes", async ({ page, world }) => {
  await world.seed({ assetData: poll({ displayMode: "count" }), players: { 43: { profileId: "profile-other" } } });
  await page.goto(world.url("/"));
  await option(page, "Spring").click();
  await expect(option(page, "Spring")).toHaveText("Spring1 votes");

  const other = await page.request.post(world.api("/vote", world.as(43, "profile-other")), {
    data: { optionId: 0, profileId: "profile-other" },
  });
  expect(other.ok()).toBe(true);
  await page.getByRole("button", { name: "Refresh" }).click();

  await expect(option(page, "Spring")).toHaveText("Spring2 votes");
});

test("two players voting in turn are both counted", async ({ browser, world }) => {
  await world.seed({ assetData: poll({ displayMode: "count" }), players: { 43: { profileId: "profile-other" } } });
  const first = await browser.newPage();
  const second = await browser.newPage();
  await first.goto(world.url("/"));
  await second.goto(world.url("/", world.as(43, "profile-other")));

  await option(first, "Winter").click();
  await expect(option(first, "Winter")).toHaveText("Winter1 votes");
  await option(second, "Winter").click();

  await expect(option(second, "Winter")).toHaveText("Winter2 votes");
  expect((await world.poll()).results).toEqual({ [world.profileId]: { answer: 3 }, "profile-other": { answer: 3 } });
  await first.close();
  await second.close();
});

test("admins see results without voting", async ({ page, world }) => {
  await world.seed({ isAdmin: true, assetData: poll({ votes: { "profile-a": 0, "profile-b": 0, "profile-c": 0, "profile-d": 3 } }) });
  await page.goto(world.url("/"));

  await expect(option(page, "Spring")).toHaveText("Spring75%");
  await expect(option(page, "Winter")).toHaveText("Winter25%");
  expect((await world.poll()).results[world.profileId]).toBeUndefined();
});

test("only admins get the settings button", async ({ page, world }) => {
  await world.seed({ assetData: poll() });
  await page.goto(world.url("/"));
  await expect(page.getByRole("heading", { name: "Favourite season?" })).toBeVisible();
  await expect(page.locator("button.icon-with-rounded-border")).toHaveCount(0);

  await world.seed({ isAdmin: true, assetData: poll() });
  await page.reload();
  await expect(page.locator("button.icon-with-rounded-border")).toBeVisible();
});

test("shows an error when the poll asset can't be loaded", async ({ page, world }) => {
  await world.seed({ withAsset: false });
  await page.goto(world.url("/"));

  await expect(page.locator(".text-error")).toContainText("Error");
});
