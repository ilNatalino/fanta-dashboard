const REQUIRED_FIELDS = [
  "name",
  "team",
  "role",
  "slot",
  "pma",
  "pfc",
  "expectedFantamedia",
  "expectedTitolarita",
] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];
export type ClassicRole = "P" | "D" | "C" | "A";
const ROLE_NAMES: Record<ClassicRole, string> = { P: "POR", D: "DIF", C: "CEN", A: "ATT" };

export type Player = {
  name: string;
  team: string;
  role: ClassicRole;
  slot: number;
  pma: number;
  pfc: number;
  expectedFantamedia: number;
  expectedTitolarita: number;
};

export type AuctionConfiguration = {
  teamCount: number;
  initialBudget: number;
  rosterSlots: Record<ClassicRole, number>;
  adaptationThreshold: number;
  historicalMarketPerceptionTolerance: number;
};

export type Team = {
  id: string;
  name: string;
  isMain: boolean;
};

export type Purchase = {
  playerName: string;
  teamId: string;
  finalPrice: number;
};

export type ActiveAuction = {
  configuration: AuctionConfiguration;
  teams: Team[];
  purchases: Purchase[];
};

export type AuctionSetup = {
  configuration: AuctionConfiguration;
  teams: Team[];
};

export type ShortlistCategory = {
  name: string;
  playerNames: string[];
};

export type AppState = {
  version: 1;
  catalog: Player[];
  shortlistCategories: ShortlistCategory[];
  auctionSetup?: AuctionSetup;
  auction?: ActiveAuction;
};

export type ImportError = {
  row: number;
  field: string;
  reason: string;
};

export type ImportResult =
  | { status: "imported" }
  | { status: "confirmation-required"; lostAssociations: number }
  | { status: "replaced" }
  | { status: "blocked"; error: string }
  | { status: "invalid"; errors: ImportError[] };

export type StartAuctionInput = AuctionConfiguration & {
  mainTeamName: string;
  opponentTeamNames: string[];
};

export type StartAuctionResult =
  | { status: "started" }
  | { status: "invalid"; error: string };

export type UpdateAuctionConfigurationInput = {
  mainTeamName: string;
  opponentTeamNames: string[];
  adaptationThreshold: number;
  historicalMarketPerceptionTolerance: number;
};

export type UpdateAuctionConfigurationResult =
  | { status: "updated" }
  | { status: "invalid"; error: string };

export type ShortlistResult =
  | { status: "updated" }
  | { status: "confirmation-required"; associatedPlayers: number }
  | { status: "invalid"; error: string };

export type PurchaseResult =
  | { status: "purchased"; teamName: string; remainingBudget: number }
  | { status: "invalid"; error: string };

export type CorrectionResult =
  | { status: "corrected" }
  | { status: "invalid"; error: string };

export type CancellationResult =
  | { status: "cancelled" }
  | { status: "confirmation-required" }
  | { status: "invalid"; error: string };

export type ResetAuctionResult =
  | { status: "reset" }
  | { status: "confirmation-required" }
  | { status: "invalid"; error: string };

export type ExportBackupResult =
  | { status: "exported"; filename: string; contents: string }
  | { status: "unavailable"; error: string };

export type ImportBackupResult =
  | { status: "confirmation-required" }
  | { status: "restored" }
  | { status: "failed"; error: string }
  | { status: "invalid"; error: string };

export interface StateStorage {
  load(): AppState | null;
  save(state: AppState): void;
}

export function remainingTeamBudget(
  auction: Readonly<ActiveAuction>,
  teamId: string,
): number {
  const spent = auction.purchases
    .filter((purchase) => purchase.teamId === teamId)
    .reduce((total, purchase) => total + purchase.finalPrice, 0);
  return auction.configuration.initialBudget - spent;
}

export function occupiedTeamRoleSlots(
  auction: Readonly<ActiveAuction>,
  catalog: readonly Player[],
  teamId: string,
  role: ClassicRole,
): number {
  return auction.purchases.filter((purchase) =>
    purchase.teamId === teamId
    && catalog.find((player) => player.name === purchase.playerName)?.role === role
  ).length;
}

export function isAuctionComplete(
  auction: Readonly<ActiveAuction>,
  catalog: readonly Player[],
): boolean {
  const roles = Object.keys(ROLE_NAMES) as ClassicRole[];
  return auction.teams.every((team) => roles.every((role) =>
    occupiedTeamRoleSlots(auction, catalog, team.id, role)
      >= auction.configuration.rosterSlots[role]
  ));
}

export function maximumSpendable(
  auction: Readonly<ActiveAuction>,
  teamId: string,
): number {
  const occupiedSlots = auction.purchases.filter((purchase) => purchase.teamId === teamId).length;
  const rosterSize = Object.values(auction.configuration.rosterSlots)
    .reduce((total, slots) => total + slots, 0);
  const otherSlotsToFill = Math.max(rosterSize - occupiedSlots - 1, 0);
  return remainingTeamBudget(auction, teamId) - otherSlotsToFill;
}

export function rolePriceAdaptation(
  auction: Readonly<ActiveAuction>,
  catalog: readonly Player[],
  player: Readonly<Player>,
): { adaptedPrice: number; deviationPercent: number; observations: number } | null {
  const ratios = auction.purchases.flatMap((purchase) => {
    const purchasedPlayer = catalog.find((candidate) => candidate.name === purchase.playerName);
    return purchasedPlayer?.role === player.role
      ? [purchase.finalPrice / purchasedPlayer.pfc]
      : [];
  }).sort((left, right) => left - right);

  if (ratios.length < auction.configuration.adaptationThreshold) return null;

  const middle = Math.floor(ratios.length / 2);
  const median = ratios.length % 2 === 1
    ? ratios[middle]!
    : (ratios[middle - 1]! + ratios[middle]!) / 2;
  return {
    adaptedPrice: Math.round(player.pfc * median),
    deviationPercent: Math.round((median - 1) * 100),
    observations: ratios.length,
  };
}

export class CatalogApplication {
  #state: AppState | null;

  constructor(private readonly storage: StateStorage) {
    const saved = storage.load();
    this.#state = saved
      ? {
          ...saved,
          shortlistCategories: saved.shortlistCategories ?? [],
          auction: saved.auction
            ? { ...saved.auction, purchases: saved.auction.purchases ?? [] }
            : undefined,
        }
      : null;
  }

  observe(): Readonly<AppState> | null {
    return this.#state;
  }

  importCatalog(csv: string, replacementConfirmed = false): ImportResult {
    const parsed = validateCatalog(csv);

    if (parsed.errors.length > 0) {
      return { status: "invalid", errors: parsed.errors };
    }

    const state = this.#state;
    if (!state) {
      const nextState: AppState = {
        version: 1,
        catalog: parsed.players,
        shortlistCategories: [],
      };
      this.storage.save(nextState);
      this.#state = nextState;
      return { status: "imported" };
    }

    if (state.auction) {
      return {
        status: "blocked",
        error: "Per sostituire il Catalogo calciatori devi prima eseguire il Reset dell’asta.",
      };
    }

    const replacementNames = new Map(
      parsed.players.map((player) => [normalizeName(player.name), player.name]),
    );
    const lostAssociations = state.shortlistCategories.reduce(
      (total, category) => total + category.playerNames.filter(
        (playerName) => !replacementNames.has(normalizeName(playerName)),
      ).length,
      0,
    );
    if (!replacementConfirmed) return { status: "confirmation-required", lostAssociations };

    const nextState: AppState = {
      ...state,
      catalog: parsed.players,
      shortlistCategories: state.shortlistCategories.map((category) => ({
        ...category,
        playerNames: category.playerNames.flatMap((playerName) => {
          const replacementName = replacementNames.get(normalizeName(playerName));
          return replacementName ? [replacementName] : [];
        }),
      })),
    };
    this.storage.save(nextState);
    this.#state = nextState;
    return { status: "replaced" };
  }

  startAuction(input: StartAuctionInput): StartAuctionResult {
    if (!this.#state) {
      return { status: "invalid", error: "Importa il Catalogo calciatori prima di avviare l’asta." };
    }
    if (this.#state.auction) {
      return { status: "invalid", error: "Esiste già un’Asta attiva." };
    }

    const error = validateAuctionConfiguration(input);
    if (error) return { status: "invalid", error };

    const teams: Team[] = [
      { id: "main", name: input.mainTeamName.trim(), isMain: true },
      ...Array.from({ length: input.teamCount - 1 }, (_, index) => ({
        id: `opponent-${index + 2}`,
        name: input.opponentTeamNames[index]?.trim() || `Squadra ${index + 2}`,
        isMain: false,
      })),
    ];
    const nextState: AppState = {
      ...this.#state,
      auctionSetup: undefined,
      auction: {
        configuration: {
          teamCount: input.teamCount,
          initialBudget: input.initialBudget,
          rosterSlots: { ...input.rosterSlots },
          adaptationThreshold: input.adaptationThreshold,
          historicalMarketPerceptionTolerance: input.historicalMarketPerceptionTolerance,
        },
        teams,
        purchases: [],
      },
    };

    this.storage.save(nextState);
    this.#state = nextState;
    return { status: "started" };
  }

  updateAuctionConfiguration(
    input: UpdateAuctionConfigurationInput,
  ): UpdateAuctionConfigurationResult {
    const auction = this.#state?.auction;
    if (!this.#state || !auction) {
      return { status: "invalid", error: "Nessuna Asta attiva da aggiornare." };
    }
    const error = validateEditableAuctionConfiguration(input);
    if (error) return { status: "invalid", error };

    const nextState: AppState = {
      ...this.#state,
      auction: {
        ...auction,
        configuration: {
          ...auction.configuration,
          adaptationThreshold: input.adaptationThreshold,
          historicalMarketPerceptionTolerance: input.historicalMarketPerceptionTolerance,
        },
        teams: auction.teams.map((team, index) => ({
          ...team,
          name: team.isMain
            ? input.mainTeamName.trim()
            : input.opponentTeamNames[index - 1]?.trim() || `Squadra ${index + 1}`,
        })),
      },
    };

    this.storage.save(nextState);
    this.#state = nextState;
    return { status: "updated" };
  }

  createShortlistCategory(name: string): ShortlistResult {
    if (!this.#state) {
      return { status: "invalid", error: "Importa il Catalogo calciatori prima di creare una categoria." };
    }

    const categoryName = name.trim();
    if (!categoryName) {
      return { status: "invalid", error: "Il nome della categoria è obbligatorio." };
    }
    if (this.#state.shortlistCategories.some(
      (category) => normalizeName(category.name) === normalizeName(categoryName),
    )) {
      return { status: "invalid", error: "Esiste già una categoria con questo nome." };
    }

    const nextState: AppState = {
      ...this.#state,
      shortlistCategories: [
        ...this.#state.shortlistCategories,
        { name: categoryName, playerNames: [] },
      ],
    };
    this.storage.save(nextState);
    this.#state = nextState;
    return { status: "updated" };
  }

  setShortlistAssociation(
    playerName: string,
    categoryName: string,
    selected: boolean,
  ): ShortlistResult {
    if (!this.#state) {
      return { status: "invalid", error: "Catalogo calciatori non disponibile." };
    }

    const player = this.#state.catalog.find(
      (candidate) => normalizeName(candidate.name) === normalizeName(playerName),
    );
    const category = this.#state.shortlistCategories.find(
      (candidate) => normalizeName(candidate.name) === normalizeName(categoryName),
    );
    if (!player || !category) {
      return { status: "invalid", error: "Calciatore o categoria non disponibile." };
    }

    const isSelected = category.playerNames.some(
      (name) => normalizeName(name) === normalizeName(player.name),
    );
    if (isSelected === selected) return { status: "updated" };

    const nextState: AppState = {
      ...this.#state,
      shortlistCategories: this.#state.shortlistCategories.map((candidate) =>
        candidate === category
          ? {
              ...candidate,
              playerNames: selected
                ? [...candidate.playerNames, player.name]
                : candidate.playerNames.filter(
                    (name) => normalizeName(name) !== normalizeName(player.name),
                  ),
            }
          : candidate,
      ),
    };
    this.storage.save(nextState);
    this.#state = nextState;
    return { status: "updated" };
  }

  renameShortlistCategory(currentName: string, nextName: string): ShortlistResult {
    if (!this.#state) {
      return { status: "invalid", error: "Catalogo calciatori non disponibile." };
    }

    const category = this.#state.shortlistCategories.find(
      (candidate) => normalizeName(candidate.name) === normalizeName(currentName),
    );
    const categoryName = nextName.trim();
    if (!category) return { status: "invalid", error: "Categoria non disponibile." };
    if (!categoryName) {
      return { status: "invalid", error: "Il nome della categoria è obbligatorio." };
    }
    if (this.#state.shortlistCategories.some(
      (candidate) => candidate !== category
        && normalizeName(candidate.name) === normalizeName(categoryName),
    )) {
      return { status: "invalid", error: "Esiste già una categoria con questo nome." };
    }

    const nextState: AppState = {
      ...this.#state,
      shortlistCategories: this.#state.shortlistCategories.map((candidate) =>
        candidate === category ? { ...candidate, name: categoryName } : candidate,
      ),
    };
    this.storage.save(nextState);
    this.#state = nextState;
    return { status: "updated" };
  }

  deleteShortlistCategory(name: string, confirmed = false): ShortlistResult {
    if (!this.#state) {
      return { status: "invalid", error: "Catalogo calciatori non disponibile." };
    }

    const category = this.#state.shortlistCategories.find(
      (candidate) => normalizeName(candidate.name) === normalizeName(name),
    );
    if (!category) return { status: "invalid", error: "Categoria non disponibile." };
    if (category.playerNames.length > 0 && !confirmed) {
      return {
        status: "confirmation-required",
        associatedPlayers: category.playerNames.length,
      };
    }

    const nextState: AppState = {
      ...this.#state,
      shortlistCategories: this.#state.shortlistCategories.filter(
        (candidate) => candidate !== category,
      ),
    };
    this.storage.save(nextState);
    this.#state = nextState;
    return { status: "updated" };
  }

  assignPlayer(playerName: string, teamId: string, finalPrice: number): PurchaseResult {
    const state = this.#state;
    const auction = state?.auction;
    if (!state || !auction) {
      return { status: "invalid", error: "Nessuna Asta attiva." };
    }

    const validated = validatePurchase(auction, state.catalog, playerName, teamId, finalPrice);
    if (typeof validated === "string") return { status: "invalid", error: validated };
    const { player, team, remainingBudget } = validated;

    const nextState: AppState = {
      ...state,
      auction: {
        ...auction,
        purchases: [...auction.purchases, { playerName: player.name, teamId: team.id, finalPrice }],
      },
    };
    this.storage.save(nextState);
    this.#state = nextState;
    return {
      status: "purchased",
      teamName: team.name,
      remainingBudget: remainingBudget - finalPrice,
    };
  }

  correctPurchase(playerName: string, teamId: string, finalPrice: number): CorrectionResult {
    const state = this.#state;
    const auction = state?.auction;
    if (!state || !auction) {
      return { status: "invalid", error: "Nessuna Asta attiva." };
    }

    const purchase = auction.purchases.find(
      (candidate) => normalizeName(candidate.playerName) === normalizeName(playerName),
    );
    if (!purchase) return { status: "invalid", error: "Acquisto non disponibile." };

    const auctionWithoutPurchase: ActiveAuction = {
      ...auction,
      purchases: auction.purchases.filter((candidate) => candidate !== purchase),
    };
    const validated = validatePurchase(
      auctionWithoutPurchase,
      state.catalog,
      purchase.playerName,
      teamId,
      finalPrice,
    );
    if (typeof validated === "string") return { status: "invalid", error: validated };

    const nextState: AppState = {
      ...state,
      auction: {
        ...auction,
        purchases: auction.purchases.map((candidate) =>
          candidate === purchase
            ? { playerName: purchase.playerName, teamId: validated.team.id, finalPrice }
            : candidate,
        ),
      },
    };
    this.storage.save(nextState);
    this.#state = nextState;
    return { status: "corrected" };
  }

  cancelPurchase(playerName: string, confirmed = false): CancellationResult {
    const state = this.#state;
    const auction = state?.auction;
    if (!state || !auction) {
      return { status: "invalid", error: "Nessuna Asta attiva." };
    }

    const purchase = auction.purchases.find(
      (candidate) => normalizeName(candidate.playerName) === normalizeName(playerName),
    );
    if (!purchase) return { status: "invalid", error: "Acquisto non disponibile." };
    if (!confirmed) return { status: "confirmation-required" };

    const nextState: AppState = {
      ...state,
      auction: {
        ...auction,
        purchases: auction.purchases.filter((candidate) => candidate !== purchase),
      },
    };
    this.storage.save(nextState);
    this.#state = nextState;
    return { status: "cancelled" };
  }

  resetAuction(confirmed = false): ResetAuctionResult {
    const state = this.#state;
    const auction = state?.auction;
    if (!state || !auction) {
      return { status: "invalid", error: "Nessuna Asta attiva da resettare." };
    }
    if (!confirmed) return { status: "confirmation-required" };

    const nextState: AppState = {
      version: state.version,
      catalog: state.catalog,
      shortlistCategories: state.shortlistCategories,
      auctionSetup: {
        configuration: auction.configuration,
        teams: auction.teams,
      },
    };
    this.storage.save(nextState);
    this.#state = nextState;
    return { status: "reset" };
  }

  exportBackup(): ExportBackupResult {
    if (!this.#state) {
      return { status: "unavailable", error: "Non esiste ancora uno stato da esportare." };
    }
    return {
      status: "exported",
      filename: "fanta-dashboard-backup.json",
      contents: JSON.stringify(this.#state, null, 2),
    };
  }

  importBackup(source: string, confirmed = false): ImportBackupResult {
    const validated = validateBackup(source);
    if (typeof validated === "string") return { status: "invalid", error: validated };
    if (!confirmed) return { status: "confirmation-required" };

    try {
      this.storage.save(validated);
    } catch {
      return { status: "failed", error: "Impossibile salvare il Backup locale ripristinato." };
    }
    this.#state = validated;
    return { status: "restored" };
  }
}

function validateBackup(source: string): AppState | string {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return "Backup locale non valido: il file non contiene JSON leggibile.";
  }
  if (!isRecord(value)) return invalidBackup();
  if (value.version !== 1) {
    return "Backup locale incompatibile: la versione dello stato non è supportata.";
  }
  if (!Array.isArray(value.catalog) || value.catalog.length === 0) return invalidBackup();

  const catalog: Player[] = [];
  const playerNames = new Map<string, string>();
  for (const candidate of value.catalog) {
    const player = readBackupPlayer(candidate);
    if (!player || playerNames.has(normalizeName(player.name))) return invalidBackup();
    playerNames.set(normalizeName(player.name), player.name);
    catalog.push(player);
  }

  if (!Array.isArray(value.shortlistCategories)) return invalidBackup();
  const shortlistCategories: ShortlistCategory[] = [];
  const categoryNames = new Set<string>();
  for (const candidate of value.shortlistCategories) {
    if (!isRecord(candidate) || typeof candidate.name !== "string") return invalidBackup();
    const name = candidate.name.trim();
    const normalizedCategoryName = normalizeName(name);
    if (!name || categoryNames.has(normalizedCategoryName) || !Array.isArray(candidate.playerNames)) {
      return invalidBackup();
    }
    categoryNames.add(normalizedCategoryName);

    const categoryPlayerNames: string[] = [];
    const seenPlayers = new Set<string>();
    for (const playerName of candidate.playerNames) {
      if (typeof playerName !== "string") return invalidBackup();
      const normalizedPlayerName = normalizeName(playerName);
      const catalogPlayerName = playerNames.get(normalizedPlayerName);
      if (!catalogPlayerName || seenPlayers.has(normalizedPlayerName)) return invalidBackup();
      seenPlayers.add(normalizedPlayerName);
      categoryPlayerNames.push(catalogPlayerName);
    }
    shortlistCategories.push({ name, playerNames: categoryPlayerNames });
  }

  const hasAuctionSetup = value.auctionSetup !== undefined;
  const hasAuction = value.auction !== undefined;
  if (hasAuctionSetup && hasAuction) return invalidBackup();

  const state: AppState = { version: 1, catalog, shortlistCategories };
  if (hasAuctionSetup) {
    const setup = readBackupAuctionSetup(value.auctionSetup);
    if (!setup) return invalidBackup();
    state.auctionSetup = setup;
  }
  if (hasAuction) {
    const auction = readBackupAuction(value.auction, catalog, playerNames);
    if (!auction) return invalidBackup();
    state.auction = auction;
  }
  return state;
}

function readBackupPlayer(value: unknown): Player | null {
  if (!isRecord(value)) return null;
  const role = value.role;
  if (
    typeof value.name !== "string" || !value.name.trim()
    || typeof value.team !== "string" || !value.team.trim()
    || typeof role !== "string" || !["P", "D", "C", "A"].includes(role)
    || !isPositiveInteger(value.slot)
    || !isFiniteNumber(value.pma) || value.pma < 0
    || !isFiniteNumber(value.pfc) || value.pfc <= 0
    || !isFiniteNumber(value.expectedFantamedia)
    || !isFiniteNumber(value.expectedTitolarita)
    || value.expectedTitolarita < 0 || value.expectedTitolarita > 100
  ) return null;

  return {
    name: value.name.trim(),
    team: value.team.trim(),
    role: role as ClassicRole,
    slot: value.slot,
    pma: value.pma,
    pfc: value.pfc,
    expectedFantamedia: value.expectedFantamedia,
    expectedTitolarita: value.expectedTitolarita,
  };
}

function readBackupAuctionSetup(value: unknown): AuctionSetup | null {
  if (!isRecord(value)) return null;
  const configuration = readBackupConfiguration(value.configuration);
  const teams = configuration ? readBackupTeams(value.teams, configuration.teamCount) : null;
  return configuration && teams ? { configuration, teams } : null;
}

function readBackupAuction(
  value: unknown,
  catalog: readonly Player[],
  playerNames: ReadonlyMap<string, string>,
): ActiveAuction | null {
  if (!isRecord(value) || !Array.isArray(value.purchases)) return null;
  const configuration = readBackupConfiguration(value.configuration);
  const teams = configuration ? readBackupTeams(value.teams, configuration.teamCount) : null;
  if (!configuration || !teams) return null;

  const auction: ActiveAuction = { configuration, teams, purchases: [] };
  for (const candidate of value.purchases) {
    if (
      !isRecord(candidate)
      || typeof candidate.playerName !== "string"
      || typeof candidate.teamId !== "string"
      || !isPositiveInteger(candidate.finalPrice)
    ) return null;
    const playerName = playerNames.get(normalizeName(candidate.playerName));
    if (!playerName) return null;
    const validated = validatePurchase(
      auction,
      catalog,
      playerName,
      candidate.teamId,
      candidate.finalPrice,
    );
    if (typeof validated === "string") return null;
    auction.purchases.push({
      playerName: validated.player.name,
      teamId: validated.team.id,
      finalPrice: candidate.finalPrice,
    });
  }
  return auction;
}

function readBackupConfiguration(value: unknown): AuctionConfiguration | null {
  if (!isRecord(value) || !isRecord(value.rosterSlots)) return null;
  const slots = value.rosterSlots;
  if (
    !isPositiveInteger(value.teamCount) || value.teamCount < 2
    || !isPositiveInteger(value.initialBudget)
    || !isPositiveInteger(slots.P)
    || !isPositiveInteger(slots.D)
    || !isPositiveInteger(slots.C)
    || !isPositiveInteger(slots.A)
    || !isPositiveInteger(value.adaptationThreshold)
    || !isFiniteNumber(value.historicalMarketPerceptionTolerance)
    || value.historicalMarketPerceptionTolerance < 0
  ) return null;

  return {
    teamCount: value.teamCount,
    initialBudget: value.initialBudget,
    rosterSlots: { P: slots.P, D: slots.D, C: slots.C, A: slots.A },
    adaptationThreshold: value.adaptationThreshold,
    historicalMarketPerceptionTolerance: value.historicalMarketPerceptionTolerance,
  };
}

function readBackupTeams(value: unknown, teamCount: number): Team[] | null {
  if (!Array.isArray(value) || value.length !== teamCount) return null;
  const teams: Team[] = [];
  const ids = new Set<string>();
  let mainTeams = 0;
  for (const candidate of value) {
    if (
      !isRecord(candidate)
      || typeof candidate.id !== "string" || !candidate.id.trim()
      || typeof candidate.name !== "string" || !candidate.name.trim()
      || typeof candidate.isMain !== "boolean"
      || ids.has(candidate.id)
    ) return null;
    ids.add(candidate.id);
    if (candidate.isMain) mainTeams += 1;
    teams.push({ id: candidate.id, name: candidate.name.trim(), isMain: candidate.isMain });
  }
  return mainTeams === 1 ? teams : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function invalidBackup(): string {
  return "Backup locale non valido: il file non contiene uno stato completo e coerente.";
}

function validatePurchase(
  auction: Readonly<ActiveAuction>,
  catalog: readonly Player[],
  playerName: string,
  teamId: string,
  finalPrice: number,
): { player: Player; team: Team; remainingBudget: number } | string {
  const player = catalog.find(
    (candidate) => normalizeName(candidate.name) === normalizeName(playerName),
  );
  if (!player) return "Calciatore non disponibile.";
  if (auction.purchases.some(
    (purchase) => normalizeName(purchase.playerName) === normalizeName(player.name),
  )) {
    return "Il calciatore è già stato acquistato.";
  }

  const team = auction.teams.find((candidate) => candidate.id === teamId);
  if (!team) return "La Squadra è obbligatoria.";
  if (!Number.isInteger(finalPrice) || finalPrice <= 0) {
    return "Il prezzo finale deve essere un intero positivo.";
  }

  const remainingBudget = remainingTeamBudget(auction, team.id);
  if (finalPrice > remainingBudget) {
    return "Il prezzo finale supera il budget disponibile.";
  }

  if (
    occupiedTeamRoleSlots(auction, catalog, team.id, player.role)
      >= auction.configuration.rosterSlots[player.role]
  ) {
    return `La Squadra non ha Posti di ruolo liberi per ${ROLE_NAMES[player.role]}.`;
  }

  return { player, team, remainingBudget };
}

function validateAuctionConfiguration(input: StartAuctionInput): string | null {
  const editableError = validateEditableAuctionConfiguration(input);
  if (editableError) return editableError;
  if (!Number.isInteger(input.teamCount) || input.teamCount < 2) {
    return "Il numero di Squadre deve essere un intero pari almeno a 2.";
  }
  if (!Number.isInteger(input.initialBudget) || input.initialBudget <= 0) {
    return "Il budget iniziale deve essere un intero positivo.";
  }
  if (Object.values(input.rosterSlots).some((slots) => !Number.isInteger(slots) || slots <= 0)) {
    return "I Posti di ruolo devono essere interi positivi.";
  }
  return null;
}

function validateEditableAuctionConfiguration(input: UpdateAuctionConfigurationInput): string | null {
  if (!input.mainTeamName.trim()) return "Il nome della Squadra principale è obbligatorio.";
  if (!Number.isInteger(input.adaptationThreshold) || input.adaptationThreshold <= 0) {
    return "La Soglia di adattamento deve essere un intero positivo.";
  }
  if (
    !Number.isFinite(input.historicalMarketPerceptionTolerance)
    || input.historicalMarketPerceptionTolerance < 0
  ) {
    return "La tolleranza della Percezione storica di mercato deve essere un numero non negativo.";
  }
  return null;
}

type CsvRow = { line: number; values: string[] };

function parseCsv(source: string): { rows: CsvRow[]; errors: ImportError[] } {
  const rows: CsvRow[] = [];
  const errors: ImportError[] = [];
  let values: string[] = [];
  let value = "";
  let line = 1;
  let rowLine = 1;
  let inQuotes = false;

  const finishRow = () => {
    values.push(value);
    if (values.some((cell) => cell.trim() !== "")) {
      rows.push({ line: rowLine, values });
    }
    values = [];
    value = "";
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (inQuotes) {
      if (character === '"' && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        value += character;
        if (character === "\n") line += 1;
      }
      continue;
    }

    if (character === ",") {
      values.push(value);
      value = "";
    } else if (character === '"' && value === "") {
      inQuotes = true;
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      finishRow();
      line += 1;
      rowLine = line;
    } else {
      value += character;
    }
  }

  if (inQuotes) {
    errors.push({ row: rowLine, field: "CSV", reason: "virgolette non chiuse" });
  } else if (value !== "" || values.length > 0) {
    finishRow();
  }

  return { rows, errors };
}

function validateCatalog(source: string): { players: Player[]; errors: ImportError[] } {
  const parsed = parseCsv(source);
  const errors = [...parsed.errors];
  const headerRow = parsed.rows[0];

  if (!headerRow) {
    return {
      players: [],
      errors: [...errors, { row: 1, field: "CSV", reason: "il file non contiene intestazioni" }],
    };
  }

  const headers = headerRow.values.map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, "") : header,
  );
  const indexes = new Map<RequiredField, number>();

  for (const field of REQUIRED_FIELDS) {
    const matches = headers.flatMap((header, index) => header === field ? [index] : []);
    if (matches.length === 0) {
      errors.push({ row: headerRow.line, field, reason: "colonna obbligatoria assente" });
    } else if (matches.length > 1) {
      errors.push({ row: headerRow.line, field, reason: "colonna obbligatoria duplicata" });
    } else {
      indexes.set(field, matches[0]!);
    }
  }

  const players: Player[] = [];
  const names = new Map<string, number>();

  for (const row of parsed.rows.slice(1)) {
    if (row.values.length !== headers.length) {
      errors.push({
        row: row.line,
        field: "CSV",
        reason: `numero di colonne non valido: attese ${headers.length}, trovate ${row.values.length}`,
      });
    }

    const values = Object.fromEntries(
      REQUIRED_FIELDS.map((field) => [field, indexes.has(field) ? row.values[indexes.get(field)!] ?? "" : ""]),
    ) as Record<RequiredField, string>;
    const rowErrors = validateRow(row.line, values);
    errors.push(...rowErrors);

    const normalizedName = normalizeName(values.name);
    if (normalizedName) {
      const firstLine = names.get(normalizedName);
      if (firstLine) {
        errors.push({
          row: row.line,
          field: "name",
          reason: `nome duplicato dopo la normalizzazione (già presente alla riga ${firstLine})`,
        });
      } else {
        names.set(normalizedName, row.line);
      }
    }

    if (rowErrors.length === 0) {
      players.push({
        name: values.name.trim(),
        team: values.team.trim(),
        role: values.role.trim() as ClassicRole,
        slot: parseNumber(values.slot)!,
        pma: parseNumber(values.pma)!,
        pfc: parseNumber(values.pfc)!,
        expectedFantamedia: parseNumber(values.expectedFantamedia)!,
        expectedTitolarita: parseNumber(values.expectedTitolarita)!,
      });
    }
  }

  return { players, errors };
}

function validateRow(row: number, values: Record<RequiredField, string>): ImportError[] {
  const errors: ImportError[] = [];
  const name = values.name.trim();
  const team = values.team.trim();
  const role = values.role.trim();
  const slot = parseNumber(values.slot);
  const pma = parseNumber(values.pma);
  const pfc = parseNumber(values.pfc);
  const expectedFantamedia = parseNumber(values.expectedFantamedia);
  const expectedTitolarita = parseNumber(values.expectedTitolarita);

  if (!name) errors.push({ row, field: "name", reason: "nome obbligatorio" });
  if (!team) errors.push({ row, field: "team", reason: "squadra reale obbligatoria" });
  if (!["P", "D", "C", "A"].includes(role)) {
    errors.push({ row, field: "role", reason: "Ruolo Classic non valido: usa P, D, C o A" });
  }
  if (slot === null || !Number.isInteger(slot) || slot <= 0) {
    errors.push({ row, field: "slot", reason: "deve essere un intero positivo" });
  }
  if (pma === null || pma < 0) {
    errors.push({ row, field: "pma", reason: "deve essere un numero non negativo" });
  }
  if (pfc === null || pfc <= 0) {
    errors.push({ row, field: "pfc", reason: "deve essere un numero strettamente positivo" });
  }
  if (expectedFantamedia === null) {
    errors.push({ row, field: "expectedFantamedia", reason: "deve essere un numero" });
  }
  if (expectedTitolarita === null || expectedTitolarita < 0 || expectedTitolarita > 100) {
    errors.push({ row, field: "expectedTitolarita", reason: "deve essere compresa tra 0 e 100" });
  }

  return errors;
}

function parseNumber(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("it-IT");
}
