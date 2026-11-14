import { APIRequestContext, test as base, expect } from "@playwright/test";
import { INTERACTIVE_KEY, MOCK_TOPIA_URL } from "./constants";

export const KEY_ASSET_ID = "key-asset";
export const SCENE_DROP_ID = "scene-1";
export const VISITOR_ID = 42;

// ---- Poll data ----

export type Poll = {
  question: string;
  answers: string[];
  displayMode: "percentage" | "count";
  options: Record<string, { votes: number }>;
  results: Record<string, { answer: number }>;
};

/** What a freshly dropped (or reset) poll asset holds: server/constants.ts defaultPoll. */
export const EMPTY_POLL: Poll = { question: "", answers: [], displayMode: "percentage", options: {}, results: {} };

/**
 * A configured poll's data object. `votes` maps profileIds to the answer index they chose; option
 * counts are derived from it, as the server keeps them.
 */
export const poll = ({
  question = "Favourite season?",
  answers = ["Spring", "Summer", "Autumn", "Winter"],
  displayMode = "percentage",
  votes = {},
}: { question?: string; answers?: string[]; displayMode?: Poll["displayMode"]; votes?: Record<string, number> } = {}): Poll => {
  const options: Poll["options"] = Object.fromEntries(answers.map((_, i) => [String(i), { votes: 0 }]));
  for (const answer of Object.values(votes)) options[answer].votes += 1;
  return {
    question,
    answers,
    displayMode,
    options,
    results: Object.fromEntries(Object.entries(votes).map(([profileId, answer]) => [profileId, { answer }])),
  };
};

/** Total votes across all options. */
export const totalVotes = (data: Poll) => Object.values(data.options).reduce((sum, o) => sum + o.votes, 0);

export type SeedOptions = {
  isAdmin?: boolean;
  /** Visitor is standing inside the asset's zone. */
  inZone?: boolean;
  /** false = the dropped asset the app was opened from doesn't exist in the world. */
  withAsset?: boolean;
  /** Extra dropped-asset fields (assetName, topLayerURL, uniqueName, ...). */
  asset?: Record<string, unknown>;
  /** The dropped asset's data object. */
  assetData?: Record<string, unknown>;
  /** The world's data object. */
  worldData?: Record<string, unknown>;
  /** The visitor's data object. */
  visitorData?: Record<string, unknown>;
  /** Badges the visitor already owns. */
  badges?: string[];
  /** Further dropped assets in the world, keyed by id. */
  extraAssets?: Record<string, Record<string, unknown>>;
  /** Other players in the world: visitorId -> profileId and admin flag. Open the app as one with world.as(). */
  players?: Record<number, { profileId: string; isAdmin?: boolean }>;
};

/** One isolated Topia world in mock-topia, plus helpers to open the app inside it. */
export class TopiaWorld {
  readonly displayName = "E2E Player";

  constructor(
    readonly urlSlug: string,
    readonly profileId: string,
    private request: APIRequestContext,
  ) {}

  async seed({
    isAdmin = false,
    inZone = true,
    withAsset = true,
    asset = {},
    assetData = {},
    worldData = {},
    visitorData = {},
    badges = [],
    extraAssets = {},
    players = {},
  }: SeedOptions = {}) {
    const assets: Record<string, any> = { ...extraAssets };
    if (withAsset) {
      assets[KEY_ASSET_ID] = {
        id: KEY_ASSET_ID,
        assetName: "E2E Asset",
        position: { x: 500, y: 500 },
        uniqueName: "e2e-asset",
        sceneDropId: SCENE_DROP_ID,
        topLayerURL: "https://example.invalid/e2e-asset.png",
        ...asset,
        dataObject: assetData,
      };
    }

    const response = await this.request.post(`${MOCK_TOPIA_URL}/__mock/worlds/${this.urlSlug}`, {
      data: {
        dataObject: worldData,
        assets,
        visitors: {
          ...Object.fromEntries(
            Object.entries(players).map(([visitorId, { profileId, isAdmin: admin = false }]) => [
              visitorId,
              { isAdmin: admin, profileId, displayName: profileId, landmarkZonesString: "", privateZoneId: "", dataObject: {}, inventory: [] },
            ]),
          ),
          [VISITOR_ID]: {
            isAdmin,
            profileId: this.profileId,
            displayName: this.displayName,
            landmarkZonesString: inZone ? Object.keys(assets).join(",") : "",
            privateZoneId: "",
            dataObject: visitorData,
            inventory: badges.map((name) => ({
              id: `owned-${name}`,
              item_id: `owned-${name}`,
              status: "ACTIVE",
              item: { name, type: "BADGE", image_url: "" },
            })),
          },
        },
      },
    });
    if (!response.ok()) throw new Error(`Seeding mock world failed: ${response.status()}`);
  }

  async state() {
    const response = await this.request.get(`${MOCK_TOPIA_URL}/__mock/worlds/${this.urlSlug}`);
    return (await response.json()) as {
      dataObject: Record<string, any>;
      assets: Record<string, any>;
      visitors: Record<string, any>;
      events: Array<Record<string, any>>;
      unhandled: string[];
    };
  }

  async assetData(assetId = KEY_ASSET_ID) {
    return (await this.state()).assets[assetId]?.dataObject;
  }

  /** The poll as stored on the key asset's data object. */
  async poll() {
    return (await this.assetData()) as Poll;
  }

  /** Credential overrides that open the app as another seeded player (see SeedOptions.players). */
  as(visitorId: number, profileId: string) {
    return { visitorId: String(visitorId), profileId, username: profileId, displayName: profileId };
  }

  async visitorData() {
    return (await this.state()).visitors[VISITOR_ID].dataObject;
  }

  async events(type?: string) {
    const { events } = await this.state();
    return type ? events.filter((e) => e.type === type) : events;
  }

  /** Session credentials Topia appends to the app's iframe URL. */
  credentials(overrides: Record<string, string> = {}) {
    return new URLSearchParams({
      assetId: KEY_ASSET_ID,
      displayName: this.displayName,
      identityId: "identity-1",
      interactiveNonce: "e2e-nonce",
      interactivePublicKey: INTERACTIVE_KEY,
      profileId: this.profileId,
      sceneDropId: SCENE_DROP_ID,
      uniqueName: "e2e-asset",
      urlSlug: this.urlSlug,
      username: "e2e-player",
      visitorId: String(VISITOR_ID),
      ...overrides,
    });
  }

  /** App page URL as Topia opens it in the iframe. */
  url(path = "/", overrides: Record<string, string> = {}) {
    return `${path}?${this.credentials(overrides)}`;
  }

  /** App API path carrying the session credentials, as the client's backendAPI sends them. */
  api(path: string, overrides: Record<string, string> = {}) {
    return `/api${path}?${this.credentials(overrides)}`;
  }
}

export const test = base.extend<{ world: TopiaWorld }>({
  // Keep the browser hermetic: only the app itself is reachable (icons load from a real S3 bucket).
  page: async ({ page }, use) => {
    await page.route(
      (url) => url.hostname !== "localhost",
      (route) => route.abort(),
    );
    await use(page);
  },
  world: async ({ request }, use, testInfo) => {
    const id = `${testInfo.testId}-${testInfo.repeatEachIndex}-${testInfo.retry}`.replace(/[^a-zA-Z0-9-]/g, "");
    const world = new TopiaWorld(`world-${id}`, `profile-${id}`, request);
    await use(world);

    // Fail the test if the app called a public-API endpoint the mock doesn't implement (e.g. after an
    // @rtsdk/topia upgrade): it would otherwise pass against a 501 the real API never returns.
    expect((await world.state()).unhandled, "public-API calls mock-topia doesn't implement").toEqual([]);
    const outside = await (await request.get(`${MOCK_TOPIA_URL}/__mock/unhandled`)).json();
    expect(outside, "public-API calls mock-topia doesn't implement").toEqual([]);
  },
});

export { expect } from "@playwright/test";
