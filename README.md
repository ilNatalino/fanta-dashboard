# Fanta Dashboard

Fanta Dashboard is a local-first desktop web application for preparing and running a live **Classic Fantacalcio** auction. It gives one fantasy manager a single operational view of player availability, provider valuations, auction purchases, budgets, roster capacity, shortlists, and role-specific market movement.

The application runs entirely in the browser. It has no backend, user accounts, cloud synchronization, or external API dependency. The interface is currently in Italian.

## What the application does

Fanta Dashboard manages one player catalog and one active auction at a time.

### Player catalog

- Imports a provider CSV and validates the complete file before changing the saved catalog.
- Reports every validation problem with its row, field, and reason.
- Ignores additional provider columns that are not used by the application.
- Replaces an existing catalog atomically before an auction starts.
- Preserves shortlist associations for players that still match after catalog replacement and reports how many associations would be lost before confirmation.

### Auction setup

- Configures the number of teams, shared initial budget, and roster capacity for goalkeepers, defenders, midfielders, and forwards.
- Requires a name for the manager's main team and generates editable names for opponent teams.
- Provides these defaults:
  - 8 teams
  - 1,000 credits per team
  - 3 goalkeepers, 8 defenders, 8 midfielders, and 6 forwards
  - 3 purchases before role-price adaptation is shown
  - 5% tolerance for historical market perception
- Locks team count, budget, and roster structure after the auction starts. Team names, adaptation threshold, and historical-perception tolerance remain editable.

### Live auction command center

The main auction view is organized into three areas:

1. **Ranking and scarcity** — available players grouped by Classic role, with transparent sorting and remaining-player counts for every slot.
2. **Auction card** — the currently called player, provider data, market signals, shortlist membership, immediate alternatives, and purchase form.
3. **Main-team summary** — remaining budget, maximum spendable amount, occupied roster positions, and recorded purchases.

The default ranking uses descending PFC and then player name. It can also be sorted by slot, PMA, expected fantasy average, or expected starting probability. Shortlist categories can filter the ranking without changing its ordering rules.

For the called player, the application shows:

- real team, Classic role, and quality slot;
- PMA and PFC provider values;
- expected fantasy average and expected starting probability;
- historical market perception;
- auction-adjusted price when enough purchases exist in the same role;
- whether the main team's role is already full;
- up to three available alternatives from the same role and slot, ordered by PFC and name.

### Purchases and rosters

- Records only the final purchase: player, destination team, and final price. Individual bids are not tracked.
- Rejects duplicate purchases, prices above the selected team's remaining budget, and purchases for a full role.
- Supports correction of the destination team or final price.
- Supports confirmed purchase cancellation, returning the player to availability.
- Recalculates budgets, roster occupancy, scarcity, rankings, and market signals after every valid change.
- Provides a role-based main-roster view with spending, budget percentage, occupied positions, free positions, and acquired-slot distribution.
- Provides a compact all-team roster overview with purchases, remaining budget, maximum spendable amount, role occupancy, and role spending.
- Marks the auction complete automatically when every team fills every configured role position. There is no separate “close auction” action.
- Resets auction progress after confirmation while preserving the catalog, setup, team names, and shortlist.

### Shortlist

- Creates, renames, and deletes custom categories.
- Allows a player to belong to multiple categories at the same time.
- Keeps category membership after a player is purchased.
- Hides purchased players from the default shortlist view while allowing them to be shown explicitly.
- Uses the shortlist only for organization, filtering, and highlighting; it does not influence valuations, rankings, or alternatives.

## Calculations

### Historical market perception

The application compares PMA with PFC:

```text
historical difference = (PMA - PFC) / PFC
```

With the default 5% tolerance, a player is classified as:

- **In hype** when the difference is above +5%;
- **Undervalued** when the difference is below -5%;
- **In line** when the difference is within the tolerance.

The Italian interface displays these labels as `In hype`, `Sottovalutato`, and `In linea`.

### Auction-adjusted price

For each active purchase in the called player's role, the application calculates:

```text
purchase ratio = final price / PFC
```

Once the configured observation threshold is reached, it uses the median ratio for that role:

```text
auction-adjusted price = round(player PFC × median role ratio)
role deviation = round((median role ratio - 1) × 100%)
```

All active purchases participate in the calculation, including purchases made by the main team. Corrections and cancellations rebuild the result from the remaining active purchases. Before the threshold is reached, the interface reports insufficient data.

### Maximum spendable

The maximum spendable amount reserves one credit for every other unfilled position in a team's roster:

```text
maximum spendable = remaining budget - other roster positions still to fill
```

This value is presented separately from provider prices and auction market signals.

## Local persistence and recovery

Every valid operation is saved as one versioned application state in browser `localStorage`. A state-changing operation is reported as successful only after persistence succeeds.

The storage adapter keeps the current state and the previous valid copy:

- If the current copy is corrupted or incompatible, the application restores the previous valid copy and warns that the latest operation may have been lost.
- If neither copy is valid, the session is blocked instead of silently resetting data.
- From a blocked session, the problematic data can be exported for diagnosis or removed after explicit confirmation.
- A complete JSON backup can be exported and restored. Restore validates the entire backup and requires confirmation before replacing the current state.

Browser persistence is limited to the same device, browser, and profile. Use the JSON backup to transfer or preserve data manually.

## CSV format

The CSV header must contain each of these fields exactly once:

| Field | Requirement |
| --- | --- |
| `name` | Required; unique after trimming and case normalization |
| `team` | Required real-world club name |
| `role` | `P`, `D`, `C`, or `A` |
| `slot` | Positive integer; lower values represent stronger quality tiers |
| `pma` | Non-negative number |
| `pfc` | Positive number |
| `expectedFantamedia` | Numeric expected fantasy average |
| `expectedTitolarita` | Number from 0 to 100 |

Additional columns are ignored. Decimal values may use a dot or an Italian decimal comma; values containing commas must follow normal CSV quoting rules.

Example:

```csv
name,team,role,slot,pma,pfc,expectedFantamedia,expectedTitolarita
PLAYER_01,Example FC,P,1,28,30,6.2,95
PLAYER_02,Example FC,D,2,18,20,6.0,82
```

## Getting started

### Requirements

- A current Node.js release with npm
- Google Chrome to run the Playwright browser tests

### Install and run

```bash
npm ci
npm run dev
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173).

`npm run dev` compiles the TypeScript sources and starts the local static server. It does not watch source files, so restart the command after making changes.

### Quality checks

```bash
npm run typecheck
npm run build
npm test
```

The test suite uses Node's built-in test runner and Playwright. It covers the application through its public behavior, including CSV import, configuration, shortlist management, live-auction workflows, price adaptation, roster views, reset, backup, persistence failures, and corrupted-state recovery. The environment running the suite must allow local loopback servers and headless Chrome processes.

## Repository structure

```text
.
├── index.html                    # Browser entry point
├── styles.css                    # Application styling
├── src/
│   ├── catalog-application.ts    # Domain rules, state transitions, validation, and backup logic
│   ├── catalog-view.ts           # Rendering and browser interaction
│   ├── browser-storage.ts        # localStorage adapter with current and previous copies
│   └── main.ts                   # Application bootstrap
├── scripts/serve.mjs             # Local static server used by development and tests
├── tests/                        # Application and Playwright end-to-end tests
├── CONTEXT.md                    # Canonical Fantacalcio domain vocabulary
└── .scratch/fanta-mvp/           # MVP decisions, specification, fixtures, and throwaway prototypes
```

The production application uses browser-native APIs and compiled TypeScript without a frontend framework. TypeScript and Playwright are development dependencies only.

## Scope and limitations

Fanta Dashboard intentionally does not provide:

- Mantra roles or formats other than Classic `P/D/C/A`;
- multiple auction histories or more than one active auction;
- accounts, multi-user collaboration, cloud synchronization, or a backend;
- a mobile-specific interface;
- bid-by-bid history or current-bid tracking;
- automated recommendations, opponent-intention prediction, auction scoring, or optimization;
- an in-application CSV editor;
- guaranteed persistence in private browsing, after browser storage is cleared, or across devices without a backup.

The repository is an operational decision-support tool. Provider values, observed auction prices, and personal budget constraints remain deliberately separate so that the interface does not present inferred strategy as fact.
