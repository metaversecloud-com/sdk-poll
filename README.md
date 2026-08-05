<div align="center">
<img src="https://global-uploads.webflow.com/62e7004a0f9b3a63b980ac3c/62e70c84dd3aac06fb2ac2b6_topia-logo-blue-2x.png" style="width: 120px; margin-bottom: 20px" alt="Topia logo">
</div>

# Poll

## Introduction / Summary

Poll is a single-question, single-choice voting app for Topia worlds. An admin drops the poll key asset, opens it in the drawer, and configures a question, between **2 and 10** answer options, and a results-display mode (percentage or raw vote count). Visitors clicking the same key asset see the question, cast one vote, and immediately see the tally rendered on each option button. Re-clicking a different option is allowed and moves the visitor's vote from the old option to the new one.

State lives entirely on the key dropped asset's data object — no world data object, no per-visitor data object, no scene-drop scoping. Every controller resolves the poll by `credentials.assetId`, so each dropped poll asset is its own independent poll.

## Key Features

### Canvas elements & interactions

- **Poll key asset:** the dropped asset the visitor clicks. Its `assetId` from the interactive URL params is how the server locates the poll's data object. Any dropped asset that opens this app will initialize itself as an empty poll on first `GET /poll` if no data object exists yet.

### Drawer content

- **Visitor view (`Home`):** renders the poll question and one button per non-empty answer. Buttons are unstyled outline until a vote is cast; the visitor's current selection renders as a filled `btn`. Vote counts (as percentages or raw counts, per `displayMode`) appear on each button once the visitor has voted, or immediately for admins. If no poll is configured, shows "There is currently no poll configured." A **Refresh** button re-fetches the poll (there is no server-driven push — see _Real-time transport_ below).
- **Admin view (`AdminView`):** reached by toggling the cog icon in the header (only rendered when `visitor.isAdmin`). Contains the question input (max **150** chars), 2-10 option inputs (each max **100** chars), a Percentage / Number of Votes radio group, a **Save** button, and a **Reset** button. Save routes through a `ConfirmationModal`; the modal copy switches between _Override poll?_ (question or answers changed — data will be erased), _Update poll?_ (only display mode changed — no data loss), and _Reset poll?_.

### Admin features

- **Save (crucial):** when the question text or any answer changed vs. the previously-fetched values, `PUT /poll` is called with `crucial: true` and rebuilds `options` from scratch (all vote counts zeroed) and clears `results`.
- **Save (non-crucial):** when only `displayMode` changed, `PUT /poll` is called with `crucial: false` and spreads the existing data object, updating only `displayMode`. Votes are preserved.
- **Reset:** `POST /admin/reset` overwrites the data object with `defaultPoll` (empty question, empty answers, `percentage` mode, empty options/results).

### Admin gating

Admin gating is **client-side only**. The cog icon is hidden unless `visitor.isAdmin` (`Visitor.get(...).isAdmin` from the SDK, delivered by `GET /visitor`). No server route calls `visitor.isAdmin`, so any caller with a valid interactive nonce can hit `PUT /poll` and `POST /admin/reset` directly. Treat these as trusted-client endpoints.

## Required Assets with Unique Names

The app does not require or look up any assets by `uniqueName`. `uniqueName` is passed through interactive params and forwarded to the server as part of `Credentials`, but no controller reads it — polls are resolved solely by `credentials.assetId`.

| Unique Name Pattern | Placed by | Description                                                                                                   |
| ------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| _(none required)_   | Manually  | Any dropped asset whose click opens this app becomes a poll key asset. Its data object holds the entire poll. |

## Technical Architecture

### Data Objects

#### Dropped Asset (poll key asset)

Attached to the clicked dropped asset. Initialized to `defaultPoll` on first `GET /poll` if not yet present (see `initializeDroppedAssetDataObject`).

```ts
{
  question: string;                                        // Poll question text
  answers: string[];                                       // Ordered non-empty option labels
  displayMode: "percentage" | "count";                     // Results rendering mode
  options: {
    [optionIndex: string]: { votes: number };              // Index (as string) into `answers`
  };
  results: {
    [profileId: string]: { answer: number };               // Which option index this visitor chose
  };
}
```

Notes:

- `options` keys are the numeric index of the answer in `answers`, stringified.
- `results` records the visitor's most recent vote only; changing vote overwrites the prior entry and decrements the previous option's `votes` (floored at 0) before incrementing the new one.
- Vote-count totals are recomputed on the client by summing `options[i].votes`.

## API Endpoints

All routes mount under `/api`. Every route calls `getCredentials(req.query)`, which requires `interactiveNonce`, `interactivePublicKey`, `urlSlug`, `visitorId` in the query string and verifies `process.env.INTERACTIVE_KEY === query.interactivePublicKey`. No route enforces admin.

| Method | Route            | Auth | Description                                                                                                                                                                                                                                                                 |
| ------ | ---------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/`              | —    | Sanity check. Returns `{ message: "Hello from server!" }`.                                                                                                                                                                                                                  |
| `GET`  | `/system/health` | —    | Returns `appVersion`, `status`, `serverStartDate`, and the values of `NODE_ENV`, `INSTANCE_DOMAIN`, `INTERACTIVE_KEY`, `S3_BUCKET`.                                                                                                                                         |
| `GET`  | `/visitor`       | —    | Returns `{ visitor: { isAdmin, profileId } }` from `Visitor.get(visitorId, urlSlug)`. Drives the client-side admin gate.                                                                                                                                                    |
| `GET`  | `/poll`          | —    | Fetches (or lazily initializes) the poll data object for `assetId`. Fires the `starts` analytic on every call. Returns `{ success, poll }`.                                                                                                                                 |
| `PUT`  | `/poll`          | —    | Updates the poll. Body `{ crucial: boolean, displayMode, question?, answers? }`. `crucial: true` requires non-empty question and ≥ 2 non-empty answers, rebuilds `options` (zeroed), and clears `results`. `crucial: false` only updates `displayMode`. Fires `pollUpdate`. |
| `POST` | `/vote`          | —    | Body `{ optionId, profileId }`. Moves the visitor's vote from any previous option to `optionId` and records `results[profileId] = { answer: optionId }`. Fires `completions`.                                                                                               |
| `POST` | `/admin/reset`   | —    | Overwrites the data object with `defaultPoll`. **Not** admin-gated on the server.                                                                                                                                                                                           |

Concurrency: writes take a `lockId` on `updateDataObject` (`voteUpdate` bucketed to a 10-second window, `pollUpdate` timestamped) with `releaseLock: true`.

## Analytics

All analytics are emitted via the SDK's `analytics: [...]` option on `droppedAsset.updateDataObject`. `uniqueKey` is `profileId` throughout, so each event dedupes at the profile level.

| Event         | Fired when                                                      | Where                 |
| ------------- | --------------------------------------------------------------- | --------------------- |
| `starts`      | `GET /poll` — every fetch of the poll, including refresh calls. | `handleGetPoll.ts`    |
| `pollUpdate`  | `PUT /poll` — admin Save, whether crucial or display-mode-only. | `handleUpdatePoll.ts` |
| `completions` | `POST /vote` — visitor casts (or changes) their vote.           | `handleVote.ts`       |

No analytics fire for `POST /admin/reset` or `GET /visitor`.

## Environment Variables

Create a `.env` in the root directory. See `.env-example` for a template.

| Variable               | Description                                                                                                                                                                        | Required |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `INTERACTIVE_KEY`      | Topia interactive app public key. Checked against `interactivePublicKey` on every request.                                                                                         | Yes      |
| `INTERACTIVE_SECRET`   | Topia interactive app secret. Passed to the SDK's `Topia` constructor.                                                                                                             | Yes      |
| `INSTANCE_DOMAIN`      | Topia API domain (`api.topia.io` for production, `api-stage.topia.io` for staging). Defaults to `api.topia.io`.                                                                    | No       |
| `INSTANCE_PROTOCOL`    | Defaults to `https`.                                                                                                                                                               | No       |
| `PORT`                 | Server port. Defaults to `3000`.                                                                                                                                                   | No       |
| `NODE_ENV`             | When `"development"`, enables permissive CORS for `localhost:3000` and `localhost:5173` and verbose error logs; otherwise the server serves the built client from `client/build/`. | No       |
| `S3_BUCKET`            | Not read anywhere in the app logic; only echoed back by `GET /system/health`.                                                                                                      | No       |
| `SKIP_PREFLIGHT_CHECK` | Legacy CRA flag, present in `.env` but not consumed by the Vite client build.                                                                                                      | No       |

### Where to find `INTERACTIVE_KEY` and `INTERACTIVE_SECRET`

- [Topia Dev Account Dashboard](https://dev.topia.io/t/dashboard/integrations)
- [Topia Production Account Dashboard](https://topia.io/t/dashboard/integrations)

## Getting Started

```bash
# from the app root
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# create a .env at the app root (see Environment Variables above)
cp .env-example .env

# run client + server together
npm run dev
```

The dev server proxies the client at `localhost:5173` to the API server at `PORT` (default `3000`). To exercise the app end-to-end, drop this app's asset in a Topia world so its click opens the drawer with valid interactive URL params.

## For Developers

### Built With

#### Client

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

#### Server

![Node.js](https://img.shields.io/badge/node.js-%2343853D.svg?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-%23000000.svg?style=for-the-badge&logo=express&logoColor=white)

### App-specific notes

- **Real-time transport:** none. No SSE, no WebSocket, no server-driven push. Vote counts update only when the client re-fetches `GET /poll` — automatically after `handleVote` succeeds, and manually via the **Refresh** button. Concurrent voters will see stale counts until they refresh.
- **Vote model:** one vote per `profileId`, but re-voting is allowed. `handleVote` decrements the previous option's `votes` (floored at 0) and increments the newly-selected option in a single `updateDataObject`. There is no vote-locking or "poll closed" state — polls remain open indefinitely until an admin resets.
- **Option cap:** the client enforces **2 ≤ options ≤ 10** (`AdminView.tsx`, `minOptions`/`maxOptions`). The server only enforces the lower bound (≥ 2 non-empty answers) on the crucial-save path.
- **Save semantics:** `crucial: true` (question or answer text changed) rebuilds `options` zeroed and clears `results`. `crucial: false` (only display mode changed) preserves votes.
- **Reset semantics:** `POST /admin/reset` calls `updateDataObject(defaultPoll)`, which merges the empty defaults into the data object. Since `defaultPoll` explicitly sets `question: ""`, `answers: []`, `options: {}`, `results: {}`, this effectively clears the poll.
- **Server-side admin gate:** none. `handleUpdatePoll` and `handleResetScene` accept any caller with a valid `interactivePublicKey` — the admin restriction is enforced only by hiding the cog icon in the client.
- **Optimistic UI:** `handleVote` in `Home.tsx` sets `selectedOption` before the network call returns, so the visitor immediately sees their pick highlighted; if the vote fails, the state is _not_ rolled back.
- **`cleanReturnPayload` middleware:** strips `topia`, `credentials`, `jwt`, and `requestOptions` from every JSON response before send.
- **Scoping:** per-dropped-asset. No `sceneDropId`, no `uniqueName`, no world data object. `uniqueName` is passed through `Credentials` but no controller consumes it.

### Helpful links

- [SDK Developer docs](https://metaversecloud-com.github.io/mc-sdk-js/index.html)
- View it in action: [Dev](https://topia.io/poll-dev), [Prod](https://topia.io/poll-prod)
- [Notion One Pager](https://app.notion.com/p/topiaio/Poll-1d040e35bdb980ab8fb1f826cadc14c1?v=71f6c3828d3b4f33960326f9bde24781)
