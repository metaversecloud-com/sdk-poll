// Admin settings: creating, editing and resetting a poll from the cog menu.
import { Page } from "@playwright/test";
import { EMPTY_POLL, expect, poll, test, totalVotes } from "../../fixtures";

const openSettings = async (page: Page) => {
  await page.locator("button.icon-with-rounded-border").click();
  await expect(page.getByRole("heading", { name: "Create or Update Poll" })).toBeVisible();
};
const closeSettings = async (page: Page) => {
  await page.locator("button.icon-with-rounded-border").click();
  await expect(page.getByRole("heading", { name: "Create or Update Poll" })).toBeHidden();
};
const question = (page: Page) => page.locator("#titleInput");
const optionInput = (page: Page, n: number) => page.getByPlaceholder(`Option ${n}`, { exact: true });
const addOption = (page: Page) => page.locator("button.btn-icon");
const confirm = async (page: Page, title: string) => {
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("button", { name: "Yes" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeHidden();
};

test("an admin creates a poll that players can vote on", async ({ page, world }) => {
  await world.seed({ isAdmin: true });
  await page.goto(world.url("/"));
  await expect(page.getByText("There is currently no poll configured.")).toBeVisible();
  await openSettings(page);

  await question(page).fill("  Lunch today?  ");
  await optionInput(page, 1).fill("Pizza");
  await optionInput(page, 2).fill("Tacos");
  await addOption(page).click();
  await optionInput(page, 3).fill("Salad");
  await page.getByLabel("Number of Votes").check();
  await page.getByRole("button", { name: "Save" }).click();
  await confirm(page, "Override poll?");

  expect(await world.poll()).toEqual({
    question: "Lunch today?",
    answers: ["Pizza", "Tacos", "Salad"],
    displayMode: "count",
    options: { "0": { votes: 0 }, "1": { votes: 0 }, "2": { votes: 0 } },
    results: {},
  });
  expect((await world.events("analytics")).map((a) => a.analyticName)).toContain("pollUpdate");

  await closeSettings(page);
  await expect(page.getByRole("heading", { name: "Lunch today?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Tacos/ })).toHaveText("Tacos0 votes");
});

test("the form loads the current poll", async ({ page, world }) => {
  await world.seed({ isAdmin: true, assetData: poll({ displayMode: "count" }) });
  await page.goto(world.url("/"));
  await openSettings(page);

  await expect(question(page)).toHaveValue("Favourite season?");
  await expect(optionInput(page, 4)).toHaveValue("Winter");
  await expect(page.getByLabel("Number of Votes")).toBeChecked();
});

test("changing only the display mode keeps the votes", async ({ page, world }) => {
  const votes = { "profile-a": 0, "profile-b": 1, "profile-c": 1 };
  await world.seed({ isAdmin: true, assetData: poll({ votes }) });
  await page.goto(world.url("/"));
  await openSettings(page);

  await page.getByLabel("Number of Votes").check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("No data will be lost.")).toBeVisible();
  await confirm(page, "Update poll?");

  expect(await world.poll()).toEqual(poll({ votes, displayMode: "count" }));
});

test("editing an answer erases the votes, after a warning", async ({ page, world }) => {
  await world.seed({ isAdmin: true, assetData: poll({ votes: { "profile-a": 0, "profile-b": 3 } }) });
  await page.goto(world.url("/"));
  await openSettings(page);

  await optionInput(page, 4).fill("Monsoon");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Current poll data and results will be erased.")).toBeVisible();
  await confirm(page, "Override poll?");

  const stored = await world.poll();
  expect(stored.answers).toEqual(["Spring", "Summer", "Autumn", "Monsoon"]);
  expect(stored.results).toEqual({});
  expect(totalVotes(stored)).toBe(0);
});

test("answering No in the warning changes nothing", async ({ page, world }) => {
  const seeded = poll({ votes: { "profile-a": 0 } });
  await world.seed({ isAdmin: true, assetData: seeded });
  await page.goto(world.url("/"));
  await openSettings(page);

  await question(page).fill("Something else?");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "No" }).click();

  await expect(page.getByRole("heading", { name: "Override poll?" })).toBeHidden();
  expect(await world.poll()).toEqual(seeded);
});

test("removing an answer saves the remaining ones in order", async ({ page, world }) => {
  await world.seed({ isAdmin: true, assetData: poll() });
  await page.goto(world.url("/"));
  await openSettings(page);

  await page.locator("div.flex", { has: optionInput(page, 2) }).getByRole("button").click();
  await page.getByRole("button", { name: "Save" }).click();
  await confirm(page, "Override poll?");

  expect((await world.poll()).answers).toEqual(["Spring", "Autumn", "Winter"]);
});

test("the form blocks an empty question or fewer than two answers", async ({ page, world }) => {
  await world.seed({ isAdmin: true });
  await page.goto(world.url("/"));
  await openSettings(page);

  await optionInput(page, 1).fill("Yes");
  await optionInput(page, 2).fill("No");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Question is required and at least two options must be non‑empty.").first()).toBeVisible();

  await question(page).fill("Ready?");
  await optionInput(page, 2).fill("   ");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Question is required and at least two options must be non‑empty.").first()).toBeVisible();

  await expect(page.getByRole("heading", { name: "Override poll?" })).toBeHidden();
  expect(await world.poll()).toEqual(EMPTY_POLL);
});

test("the form allows at most ten answers and caps text length", async ({ page, world }) => {
  await world.seed({ isAdmin: true });
  await page.goto(world.url("/"));
  await openSettings(page);

  for (let i = 0; i < 8; i++) await addOption(page).click();

  await expect(optionInput(page, 10)).toBeVisible();
  await expect(addOption(page)).toHaveCount(0);
  await expect(question(page)).toHaveAttribute("maxlength", "150");
  await expect(optionInput(page, 1)).toHaveAttribute("maxlength", "100");
});

test("blank answers are dropped when saving", async ({ page, world }) => {
  await world.seed({ isAdmin: true });
  await page.goto(world.url("/"));
  await openSettings(page);

  await question(page).fill("Tea or coffee?");
  await optionInput(page, 1).fill("Tea");
  await optionInput(page, 2).fill("Coffee");
  await addOption(page).click();
  await page.getByRole("button", { name: "Save" }).click();
  await confirm(page, "Override poll?");

  expect((await world.poll()).answers).toEqual(["Tea", "Coffee"]);
});

test("Reset erases the poll and its votes", async ({ page, world }) => {
  await world.seed({ isAdmin: true, assetData: poll({ votes: { "profile-a": 0 } }) });
  await page.goto(world.url("/"));
  await openSettings(page);

  await page.getByRole("button", { name: "Reset" }).click();
  await confirm(page, "Reset poll?");

  await expect.poll(() => world.poll()).toEqual(EMPTY_POLL);
});

test("after Reset the admin sees the empty poll without reloading", async ({ page, world }) => {
  test.fail(true, "EXP-438: Reset doesn't update the page; the old poll stays on screen until a refresh");
  await world.seed({ isAdmin: true, assetData: poll({ votes: { "profile-a": 0 } }) });
  await page.goto(world.url("/"));
  await openSettings(page);

  await page.getByRole("button", { name: "Reset" }).click();
  await confirm(page, "Reset poll?");
  await expect.poll(() => world.poll()).toEqual(EMPTY_POLL);
  await closeSettings(page);

  await expect(page.getByText("There is currently no poll configured.")).toBeVisible({ timeout: 3_000 });
});
