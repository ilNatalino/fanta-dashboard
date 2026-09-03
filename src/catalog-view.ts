import {
  CatalogApplication,
  isAuctionComplete,
  maximumSpendable,
  occupiedTeamRoleSlots,
  remainingTeamBudget,
  rolePriceAdaptation,
  type ActiveAuction,
  type AppState,
  type ClassicRole,
  type ImportError,
  type Player,
} from "./catalog-application.js";
import { BrowserStateStorage } from "./browser-storage.js";

const roleNames: Record<ClassicRole, string> = { P: "POR", D: "DIF", C: "CEN", A: "ATT" };
const numberFormatter = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 2,
  useGrouping: true,
});
const themeStorageKey = "fanta-dashboard-theme";
type OperationTarget = "import" | "configuration" | "shortlist" | "purchase" | "backup" | "persistence";
type RankingSort = "pfc" | "slot" | "pma" | "expectedFantamedia" | "expectedTitolarita";
type ActiveView = "auction" | "my-team" | "teams" | "catalog" | "backup";
type CatalogSort = "name" | "team" | "role" | "slot" | "pma" | "pfc" | "expectedFantamedia" | "expectedTitolarita";
type SortDirection = "ascending" | "descending";
type CatalogStatus = "available" | "purchased";
type CorrectionDraft = { playerName: string; teamId: string; price: string };
type TablerIcon = "sun" | "moon" | "x" | "pencil";
type AuctionViewState = {
  activeView: ActiveView;
  selectedPlayerName: string | null;
  playerSearchQuery: string;
  playerSearchError: string;
  rankingScrollTop: number;
  catalogScrollTop: number;
  catalogScrollLeft: number;
  selectedRole: ClassicRole;
  rankingSort: RankingSort;
  shortlistCategory: string;
  showPurchasedShortlist: boolean;
  assignmentOpen: boolean;
  assignmentTeamId: string;
  assignmentPrice: string;
  correctionDraft: CorrectionDraft | null;
  catalogQuery: string;
  catalogRoles: ClassicRole[];
  catalogSlots: number[];
  catalogStatuses: CatalogStatus[];
  catalogSort: CatalogSort;
  catalogSortDirection: SortDirection;
};

const catalogColumns: Array<{
  key: CatalogSort;
  label: string;
  rowHeader?: boolean;
  numeric?: boolean;
  firstDirection: SortDirection;
  render: (player: Player) => string;
}> = [
  { key: "name", label: "Nome", rowHeader: true, firstDirection: "ascending", render: (player) => escapeHtml(player.name) },
  { key: "team", label: "Squadra reale", firstDirection: "ascending", render: (player) => escapeHtml(player.team) },
  { key: "role", label: "Ruolo", firstDirection: "ascending", render: (player) => `<span class="role">${roleNames[player.role]}</span>` },
  { key: "slot", label: "Slot", numeric: true, firstDirection: "ascending", render: (player) => String(player.slot) },
  { key: "pma", label: "PMA", numeric: true, firstDirection: "descending", render: (player) => numberFormatter.format(player.pma) },
  { key: "pfc", label: "PFC", numeric: true, firstDirection: "descending", render: (player) => numberFormatter.format(player.pfc) },
  { key: "expectedFantamedia", label: "Fantamedia prevista", numeric: true, firstDirection: "descending", render: (player) => numberFormatter.format(player.expectedFantamedia) },
  { key: "expectedTitolarita", label: "Titolarità prevista", numeric: true, firstDirection: "descending", render: (player) => `${numberFormatter.format(player.expectedTitolarita)}%` },
];

export function mountCatalogApp(root: HTMLElement): void {
  const storedTheme = window.localStorage.getItem(themeStorageKey);
  document.documentElement.dataset.theme = storedTheme === "light" ? "light" : "dark";
  const application = new CatalogApplication(new BrowserStateStorage());
  const viewState: AuctionViewState = {
    activeView: application.observe()?.auction ? "auction" : "catalog",
    selectedPlayerName: null,
    playerSearchQuery: "",
    playerSearchError: "",
    rankingScrollTop: 0,
    catalogScrollTop: 0,
    catalogScrollLeft: 0,
    selectedRole: "P",
    rankingSort: "pfc",
    shortlistCategory: "",
    showPurchasedShortlist: false,
    assignmentOpen: false,
    assignmentTeamId: "",
    assignmentPrice: "",
    correctionDraft: null,
    catalogQuery: "",
    catalogRoles: [],
    catalogSlots: [],
    catalogStatuses: [],
    catalogSort: "pfc",
    catalogSortDirection: "descending",
  };
  render(root, application, viewState);
  bindKeyboardShortcuts(root, application, viewState);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resultError(result: object): string {
  return "error" in result && typeof result.error === "string" ? result.error : "";
}

function resetAssignmentDraft(viewState: AuctionViewState): void {
  viewState.assignmentOpen = false;
  viewState.assignmentTeamId = "";
  viewState.assignmentPrice = "";
}

function resetCatalogControls(viewState: AuctionViewState): void {
  viewState.catalogQuery = "";
  viewState.catalogRoles = [];
  viewState.catalogSlots = [];
  viewState.catalogStatuses = [];
  viewState.catalogSort = "pfc";
  viewState.catalogSortDirection = "descending";
  viewState.catalogScrollTop = 0;
  viewState.catalogScrollLeft = 0;
}

function toggleSelection<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

function bindKeyboardShortcuts(
  root: HTMLElement,
  application: CatalogApplication,
  viewState: AuctionViewState,
): void {
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const editing = target instanceof HTMLInputElement
      || target instanceof HTMLSelectElement
      || target instanceof HTMLTextAreaElement;
    if (event.key === "/" && !editing) {
      const search = root.querySelector<HTMLInputElement>("[data-player-search] input");
      if (!search) return;
      event.preventDefault();
      search.focus();
      search.select();
      return;
    }
    if (event.key === "Escape" && viewState.selectedPlayerName) {
      viewState.selectedPlayerName = null;
      viewState.playerSearchQuery = "";
      resetAssignmentDraft(viewState);
      render(root, application, viewState);
      root.querySelector<HTMLInputElement>("[data-player-search] input")?.focus();
      return;
    }
    if (event.key.toLocaleLowerCase("it-IT") === "a" && !editing) {
      const assign = root.querySelector<HTMLButtonElement>("[data-open-purchase]");
      if (!assign) return;
      event.preventDefault();
      assign.click();
      return;
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && target instanceof HTMLButtonElement && target.matches("[data-call-player]")) {
      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-ranking-list] [data-call-player]"));
      const index = buttons.indexOf(target);
      const next = event.key === "ArrowDown" ? buttons[index + 1] : buttons[index - 1];
      if (!next) return;
      event.preventDefault();
      next.focus();
      next.scrollIntoView({ block: "nearest" });
    }
  });
}

function renderImportForm(
  errors: ImportError[],
  compact = false,
  notice = "",
  operationError = "",
): string {
  return `
    <form class="card import-card" data-import-form>
      <h2>${compact ? "Catalogo aggiornato" : "File del provider"}</h2>
      <p>${compact ? "Il file viene validato per intero prima di chiedere conferma e sostituire il Catalogo corrente." : "Il Catalogo calciatori è necessario prima di configurare l’Asta attiva."}</p>
      <label class="file-label">
        Seleziona CSV
        <input name="catalog" type="file" accept=".csv,text/csv" required />
      </label>
      <button class="import-button" type="submit">${compact ? "Conferma sostituzione" : "Importa catalogo"}</button>
      ${notice ? `<p class="notice" role="status">${escapeHtml(notice)}</p>` : ""}
      ${operationError ? `<p class="errors" role="alert">${escapeHtml(operationError)}</p>` : ""}
      ${errors.length > 0 ? `
        <section class="errors" aria-labelledby="errors-title" role="alert">
          <h3 id="errors-title">Importazione non riuscita</h3>
          <p>Correggi il CSV all’esterno dell’app e riprova.</p>
          <ul>${errors.map((error) => `
            <li><strong>Riga ${error.row} · Campo ${escapeHtml(error.field)}</strong><span>${escapeHtml(error.reason)}</span></li>
          `).join("")}</ul>
        </section>
      ` : ""}
    </form>
  `;
}

function renderBackupView(hasState: boolean, notice = "", error = ""): string {
  return `
    <section class="active-heading" aria-labelledby="backup-title">
      <p class="eyebrow">Protezione dei dati</p>
      <h1 id="backup-title">Backup locale</h1>
      <p>Esporta o ripristina l’intero stato con un unico file. Non è una sincronizzazione automatica.</p>
      <p>Il salvataggio automatico vale sullo stesso dispositivo, browser e profilo in navigazione normale.</p>
    </section>
    <div class="backup-actions">
      <section class="card backup-action" aria-labelledby="export-backup-title">
        <h2 id="export-backup-title">Esporta Backup locale</h2>
        <p>Scarica Catalogo, configurazione, Squadre, Shortlist e Asta attiva.</p>
        <button type="button" data-export-backup ${hasState ? "" : "disabled"}>Esporta Backup locale</button>
      </section>
      <form class="card backup-action" data-backup-form aria-labelledby="restore-backup-title">
        <h2 id="restore-backup-title">Ripristina Backup locale</h2>
        <p>Il file viene validato per intero prima di sostituire lo stato corrente.</p>
        <label class="file-label">
          Seleziona Backup locale
          <input name="backup" type="file" accept=".json,application/json" required />
        </label>
        <button type="submit">Ripristina Backup locale</button>
        ${notice ? `<p class="notice" role="status">${escapeHtml(notice)}</p>` : ""}
        ${error ? `<p class="errors" role="alert">${escapeHtml(error)}</p>` : ""}
      </form>
    </div>
  `;
}

function render(
  root: HTMLElement,
  application: CatalogApplication,
  viewState: AuctionViewState,
  errors: ImportError[] = [],
  notice = "",
  operationError = "",
  operationTarget: OperationTarget = "import",
): void {
  const previousRanking = root.querySelector<HTMLElement>("[data-ranking-list]");
  if (previousRanking) viewState.rankingScrollTop = previousRanking.scrollTop;
  const previousCatalog = root.querySelector<HTMLElement>(".table-frame");
  if (previousCatalog) {
    viewState.catalogScrollTop = previousCatalog.scrollTop;
    viewState.catalogScrollLeft = previousCatalog.scrollLeft;
  }
  const state = application.observe();
  const persistence = application.persistenceStatus();
  const content = persistence.status === "blocked"
    ? renderBlockedPersistence(
        persistence.error,
        operationTarget === "persistence" ? operationError : "",
      )
    : state
    ? state.auction
      ? renderActiveAuction(
          state,
          state.auction,
          viewState,
          notice,
          operationError,
          operationTarget,
        )
      : renderCatalog(state, viewState, errors, notice, operationError, operationTarget)
    : renderEmpty(
        viewState,
        errors,
        operationTarget === "backup" ? notice : "",
        operationTarget === "backup" ? operationError : "",
        operationTarget === "import" ? operationError : "",
      );
  root.innerHTML = `${persistence.status === "recovered"
    ? `<p class="persistence-warning" role="status">${escapeHtml(persistence.notice)}</p>`
    : ""}${content}`;
  const nextRanking = root.querySelector<HTMLElement>("[data-ranking-list]");
  if (nextRanking) nextRanking.scrollTop = viewState.rankingScrollTop;
  const nextCatalog = root.querySelector<HTMLElement>(".table-frame");
  if (nextCatalog) {
    nextCatalog.scrollTop = viewState.catalogScrollTop;
    nextCatalog.scrollLeft = viewState.catalogScrollLeft;
  }

  root.querySelector<HTMLButtonElement>("[data-theme-toggle]")?.addEventListener("click", (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
    const light = theme === "light";
    button.setAttribute("aria-label", light ? "Usa tema scuro" : "Usa tema chiaro");
    button.innerHTML = renderTablerIcon(light ? "moon" : "sun");
  });

  root.querySelector<HTMLButtonElement>("[data-export-problematic]")
    ?.addEventListener("click", () => {
      const result = application.exportProblematicData();
      if (result.status === "unavailable") return;
      const url = URL.createObjectURL(new Blob([result.contents], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    });

  root.querySelector<HTMLButtonElement>("[data-reset-problematic]")
    ?.addEventListener("click", () => {
      let result = application.resetProblematicData();
      if (result.status === "confirmation-required") {
        if (!window.confirm(
          "Resettare esplicitamente i dati locali illeggibili? Entrambe le copie saranno eliminate.",
        )) return;
        result = application.resetProblematicData(true);
      }
      if (result.status === "reset") render(root, application, viewState);
      if (result.status === "failed") {
        render(root, application, viewState, [], "", result.error, "persistence");
      }
    });

  root.querySelector<HTMLButtonElement>("[data-export-backup]")
    ?.addEventListener("click", () => {
      const result = application.exportBackup();
      if (result.status === "unavailable") {
        render(root, application, viewState, [], "", result.error, "backup");
        return;
      }
      const url = URL.createObjectURL(new Blob([result.contents], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    });

  const backupForm = root.querySelector<HTMLFormElement>("[data-backup-form]");
  backupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = backupForm.elements.namedItem("backup");
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;

    const source = await input.files[0].text();
    let result = application.importBackup(source);
    if (result.status === "invalid") {
      render(root, application, viewState, [], "", result.error, "backup");
      return;
    }
    if (!window.confirm(
      "Ripristinare il Backup locale e sostituire l’intero stato corrente?",
    )) return;
    result = application.importBackup(source, true);
    if (result.status === "failed") {
      render(root, application, viewState, [], "", result.error, "backup");
      return;
    }
    if (result.status === "restored") {
      resetCatalogControls(viewState);
      viewState.activeView = application.observe()?.auction ? "auction" : "catalog";
      viewState.selectedPlayerName = null;
      viewState.correctionDraft = null;
      resetAssignmentDraft(viewState);
      render(root, application, viewState, [], "Backup locale ripristinato.", "", "backup");
    }
  });

  const form = root.querySelector<HTMLFormElement>("[data-import-form]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.elements.namedItem("catalog");
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;

    const csv = await input.files[0].text();
    let result = application.importCatalog(csv);
    if (result.status === "confirmation-required") {
      const noun = result.lostAssociations === 1 ? "associazione" : "associazioni";
      if (!window.confirm(
        `La sostituzione rimuoverà ${result.lostAssociations} ${noun} della Shortlist. Sostituire l’intero Catalogo calciatori?`,
      )) return;
      result = application.importCatalog(csv, true);
    }
    if (result.status === "imported" || result.status === "replaced") {
      resetCatalogControls(viewState);
      viewState.activeView = "catalog";
    }
    render(
      root,
      application,
      viewState,
      result.status === "invalid" ? result.errors : [],
      result.status === "replaced" ? "Catalogo calciatori sostituito." : "",
      resultError(result),
    );
  });

  const setupForm = root.querySelector<HTMLFormElement>("#auction-setup");
  setupForm?.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
    input.addEventListener("invalid", () => {
      input.setAttribute("aria-invalid", "true");
      const label = input.closest("label");
      if (!label) return;
      let error = label.querySelector<HTMLElement>(".field-error");
      if (!error) {
        error = document.createElement("span");
        error.className = "field-error";
        label.append(error);
      }
      error.textContent = input.validationMessage;
    });
    input.addEventListener("input", () => {
      input.removeAttribute("aria-invalid");
      input.closest("label")?.querySelector(".field-error")?.remove();
    });
  });
  setupForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = application.startAuction({
      teamCount: readNumber(setupForm, "teamCount"),
      initialBudget: readNumber(setupForm, "initialBudget"),
      rosterSlots: {
        P: readNumber(setupForm, "slotsP"),
        D: readNumber(setupForm, "slotsD"),
        C: readNumber(setupForm, "slotsC"),
        A: readNumber(setupForm, "slotsA"),
      },
      adaptationThreshold: readNumber(setupForm, "adaptationThreshold"),
      historicalMarketPerceptionTolerance: readNumber(
        setupForm,
        "historicalMarketPerceptionTolerance",
      ),
      mainTeamName: readText(setupForm, "mainTeamName"),
      opponentTeamNames: Array.from(setupForm.querySelectorAll<HTMLInputElement>("[data-opponent-name]"))
        .map((input) => input.value),
    });
    if (result.status === "started") {
      viewState.activeView = "auction";
      render(root, application, viewState);
    } else {
      render(root, application, viewState, [], "", result.error, "configuration");
    }
  });

  const teamCountInput = setupForm?.elements.namedItem("teamCount");
  const opponentFields = setupForm?.querySelector<HTMLElement>("[data-opponent-fields]");
  if (teamCountInput instanceof HTMLInputElement && opponentFields) {
    teamCountInput.addEventListener("input", () => {
      if (!Number.isInteger(teamCountInput.valueAsNumber) || teamCountInput.valueAsNumber < 2) return;
      const currentNames = Array.from(
        opponentFields.querySelectorAll<HTMLInputElement>("[data-opponent-name]"),
        (input) => input.value,
      );
      opponentFields.innerHTML = renderOpponentFields(teamCountInput.valueAsNumber, currentNames);
    });
  }
  const configurationForm = root.querySelector<HTMLFormElement>("#auction-configuration");
  configurationForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const teamNames = Array.from(
      configurationForm.querySelectorAll<HTMLInputElement>("[data-team-name]"),
      (input) => input.value,
    );
    const result = application.updateAuctionConfiguration({
      mainTeamName: teamNames[0] ?? "",
      opponentTeamNames: teamNames.slice(1),
      adaptationThreshold: readNumber(configurationForm, "adaptationThreshold"),
      historicalMarketPerceptionTolerance: readNumber(
        configurationForm,
        "historicalMarketPerceptionTolerance",
      ),
    });
    render(
      root,
      application,
      viewState,
      [],
      result.status === "updated" ? "Configurazione d’asta salvata." : "",
      resultError(result),
      "configuration",
    );
  });

  root.querySelector<HTMLButtonElement>("[data-reset-auction]")?.addEventListener("click", () => {
    let result = application.resetAuction();
    if (result.status === "confirmation-required") {
      if (!window.confirm(
        "Resettare l’Asta ed eliminare tutti gli Acquisti e i progressi? Catalogo, Configurazione d’asta, Squadre e Shortlist saranno conservati.",
      )) return;
      result = application.resetAuction(true);
    }
    if (result.status === "reset") {
      viewState.activeView = "auction";
      viewState.catalogStatuses = [];
      viewState.selectedPlayerName = null;
      viewState.correctionDraft = null;
      resetAssignmentDraft(viewState);
      render(
        root,
        application,
        viewState,
        [],
        "Asta resettata. Il setup è pronto per un nuovo avvio.",
        "",
        "configuration",
      );
    } else if (result.status === "invalid" || result.status === "failed") {
      render(root, application, viewState, [], "", result.error, "configuration");
    }
  });

  const categoryForm = root.querySelector<HTMLFormElement>("[data-create-category]");
  categoryForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = application.createShortlistCategory(readText(categoryForm, "categoryName"));
    render(
      root,
      application,
      viewState,
      [],
      result.status === "updated" ? "Categoria creata." : "",
      resultError(result),
      "shortlist",
    );
  });

  root.querySelectorAll<HTMLInputElement>("[data-shortlist-association]").forEach((input) => {
    input.addEventListener("change", () => {
      const result = application.setShortlistAssociation(
        input.dataset.playerName ?? "",
        input.dataset.categoryName ?? "",
        input.checked,
      );
      render(
        root,
        application,
        viewState,
        [],
        "",
        resultError(result),
        "shortlist",
      );
    });
  });

  root.querySelectorAll<HTMLFormElement>("[data-rename-category]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = application.renameShortlistCategory(
        form.dataset.categoryName ?? "",
        readText(form, "categoryName"),
      );
      render(
        root,
        application,
        viewState,
        [],
        result.status === "updated" ? "Categoria rinominata." : "",
        resultError(result),
        "shortlist",
      );
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-delete-category]").forEach((button) => {
    button.addEventListener("click", () => {
      const categoryName = button.dataset.categoryName ?? "";
      let result = application.deleteShortlistCategory(categoryName);
      if (result.status === "confirmation-required") {
        const noun = result.associatedPlayers === 1 ? "calciatore" : "calciatori";
        const confirmed = window.confirm(
          `La categoria contiene ${result.associatedPlayers} ${noun}. Eliminarla e rimuovere le associazioni?`,
        );
        if (!confirmed) return;
        result = application.deleteShortlistCategory(categoryName, true);
      }
      render(
        root,
        application,
        viewState,
        [],
        result.status === "updated" ? "Categoria eliminata." : "",
        resultError(result),
        "shortlist",
      );
    });
  });

  const playerSearch = root.querySelector<HTMLFormElement>("[data-player-search]");
  const playerSearchInput = playerSearch?.elements.namedItem("playerName");
  if (playerSearchInput instanceof HTMLInputElement) {
    playerSearchInput.addEventListener("input", () => {
      viewState.playerSearchQuery = playerSearchInput.value;
      viewState.playerSearchError = "";
      const query = playerSearchInput.value.trim().toLocaleLowerCase("it-IT");
      const suggestions = state?.catalog
        .filter((candidate) => candidate.name.toLocaleLowerCase("it-IT").includes(query))
        .slice(0, 20) ?? [];
      const datalist = root.querySelector<HTMLDataListElement>("#player-names");
      if (datalist) {
        datalist.innerHTML = suggestions.map(
          (candidate) => `<option value="${escapeHtml(candidate.name)}"></option>`,
        ).join("");
      }
    });
  }
  playerSearch?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = readText(playerSearch, "playerName").trim().toLocaleLowerCase("it-IT");
    const player = state?.catalog.find(
      (candidate) => candidate.name.toLocaleLowerCase("it-IT") === query,
    );
    viewState.playerSearchQuery = readText(playerSearch, "playerName").trim();
    if (!player) {
      viewState.playerSearchError = "Nessun calciatore corrisponde al nome inserito.";
      render(root, application, viewState);
      root.querySelector<HTMLInputElement>("[data-player-search] input")?.focus();
      return;
    }
    viewState.playerSearchError = "";
    viewState.playerSearchQuery = player.name;
    viewState.activeView = "auction";
    viewState.selectedPlayerName = player.name;
    viewState.selectedRole = player.role;
    resetAssignmentDraft(viewState);
    render(root, application, viewState);
    root.querySelector<HTMLElement>("[data-player-heading]")?.focus();
  });

  root.querySelectorAll<HTMLElement>("[data-auction-view]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      viewState.activeView = link.dataset.auctionView as ActiveView;
      render(root, application, viewState);
    });
  });

  root.querySelector<HTMLButtonElement>("[data-manage-shortlist]")?.addEventListener("click", () => {
    viewState.activeView = "catalog";
    render(root, application, viewState, [], "", "", "shortlist");
  });

  const catalogSearch = root.querySelector<HTMLInputElement>("[data-catalog-search]");
  catalogSearch?.addEventListener("input", () => {
    const selectionStart = catalogSearch.selectionStart;
    const selectionEnd = catalogSearch.selectionEnd;
    viewState.catalogQuery = catalogSearch.value;
    viewState.catalogScrollTop = 0;
    render(root, application, viewState);
    const replacement = root.querySelector<HTMLInputElement>("[data-catalog-search]");
    replacement?.focus();
    if (selectionStart !== null && selectionEnd !== null) {
      replacement?.setSelectionRange(selectionStart, selectionEnd);
    }
  });

  root.querySelectorAll<HTMLButtonElement>("[data-catalog-role]").forEach((button) => {
    button.addEventListener("click", () => {
      viewState.catalogRoles = toggleSelection(
        viewState.catalogRoles,
        button.dataset.catalogRole as ClassicRole,
      );
      viewState.catalogScrollTop = 0;
      render(root, application, viewState);
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-catalog-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      viewState.catalogSlots = toggleSelection(
        viewState.catalogSlots,
        Number(button.dataset.catalogSlot),
      );
      viewState.catalogScrollTop = 0;
      render(root, application, viewState);
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-catalog-status]").forEach((button) => {
    button.addEventListener("click", () => {
      viewState.catalogStatuses = toggleSelection(
        viewState.catalogStatuses,
        button.dataset.catalogStatus as CatalogStatus,
      );
      viewState.catalogScrollTop = 0;
      render(root, application, viewState);
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-catalog-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.catalogSort as CatalogSort;
      const column = catalogColumns.find((candidate) => candidate.key === key)!;
      if (viewState.catalogSort === key) {
        viewState.catalogSortDirection = viewState.catalogSortDirection === "ascending"
          ? "descending"
          : "ascending";
      } else {
        viewState.catalogSort = key;
        viewState.catalogSortDirection = column.firstDirection;
      }
      viewState.catalogScrollTop = 0;
      render(root, application, viewState);
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-reset-catalog-controls]").forEach((button) => {
    button.addEventListener("click", () => {
      viewState.catalogQuery = "";
      viewState.catalogRoles = [];
      viewState.catalogSlots = [];
      viewState.catalogStatuses = [];
      viewState.catalogScrollTop = 0;
      render(root, application, viewState);
    });
  });

  root.querySelector<HTMLButtonElement>("[data-close-auction-card]")
    ?.addEventListener("click", () => {
      viewState.selectedPlayerName = null;
      resetAssignmentDraft(viewState);
      render(root, application, viewState);
    });

  root.querySelectorAll<HTMLButtonElement>("[data-select-role]").forEach((button) => {
    button.addEventListener("click", () => {
      viewState.selectedRole = button.dataset.selectRole as ClassicRole;
      viewState.rankingScrollTop = 0;
      render(root, application, viewState);
    });
  });

  root.querySelector<HTMLSelectElement>("[data-ranking-sort]")
    ?.addEventListener("change", (event) => {
      viewState.rankingSort = (event.currentTarget as HTMLSelectElement).value as RankingSort;
      viewState.rankingScrollTop = 0;
      render(root, application, viewState);
    });

  root.querySelector<HTMLSelectElement>("[data-shortlist-filter]")
    ?.addEventListener("change", (event) => {
      viewState.shortlistCategory = (event.currentTarget as HTMLSelectElement).value;
      viewState.rankingScrollTop = 0;
      render(root, application, viewState);
    });

  root.querySelector<HTMLInputElement>("[data-show-purchased-shortlist]")
    ?.addEventListener("change", (event) => {
      viewState.showPurchasedShortlist = (event.currentTarget as HTMLInputElement).checked;
      render(root, application, viewState);
    });

  root.querySelectorAll<HTMLButtonElement>("[data-call-player]").forEach((button) => {
    button.addEventListener("click", () => {
      viewState.selectedPlayerName = button.dataset.callPlayer ?? null;
      viewState.playerSearchQuery = viewState.selectedPlayerName ?? "";
      viewState.selectedRole = state?.catalog.find(
        (candidate) => candidate.name === viewState.selectedPlayerName,
      )?.role ?? viewState.selectedRole;
      resetAssignmentDraft(viewState);
      render(root, application, viewState);
      root.querySelector<HTMLElement>("[data-player-heading]")?.focus();
    });
  });

  root.querySelector<HTMLButtonElement>("[data-open-purchase]")?.addEventListener("click", () => {
    resetAssignmentDraft(viewState);
    viewState.assignmentOpen = true;
    render(root, application, viewState);
    root.querySelector<HTMLSelectElement>("[data-purchase-form] select")?.focus();
  });

  const purchaseForm = root.querySelector<HTMLFormElement>("[data-purchase-form]");
  const purchaseTeam = purchaseForm?.elements.namedItem("teamId");
  const updatePurchaseContext = () => {
    if (!(purchaseTeam instanceof HTMLSelectElement)) return;
    const option = purchaseTeam.selectedOptions[0];
    const context = purchaseForm?.querySelector<HTMLElement>("[data-purchase-context]");
    if (!context) return;
    if (!option?.value) {
      context.textContent = "Seleziona una Squadra per vedere budget e capienza del ruolo.";
      return;
    }
    const maximum = option.dataset.maximumSpendable
      ? ` Massimo spendibile della tua Squadra: ${numberFormatter.format(Number(option.dataset.maximumSpendable))} crediti.`
      : "";
    context.textContent = `Budget residuo: ${numberFormatter.format(Number(option.dataset.budget))} crediti. Posti del ruolo occupati: ${option.dataset.roleOccupancy}.${maximum}`;
  };
  if (purchaseTeam instanceof HTMLSelectElement) {
    purchaseTeam.addEventListener("change", updatePurchaseContext);
    updatePurchaseContext();
  }
  purchaseForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const teamInput = purchaseForm.elements.namedItem("teamId");
    const priceInput = purchaseForm.elements.namedItem("finalPrice");
    viewState.assignmentTeamId = teamInput instanceof HTMLSelectElement ? teamInput.value : "";
    viewState.assignmentPrice = priceInput instanceof HTMLInputElement ? priceInput.value : "";
    const playerName = viewState.selectedPlayerName ?? "";
    const result = application.assignPlayer(
      playerName,
      viewState.assignmentTeamId,
      priceInput instanceof HTMLInputElement ? priceInput.valueAsNumber : Number.NaN,
    );

    if (result.status === "purchased") {
      viewState.selectedPlayerName = null;
      resetAssignmentDraft(viewState);
      render(
        root,
        application,
        viewState,
        [],
        `${playerName} assegnato a ${result.teamName} per ${priceInput instanceof HTMLInputElement ? priceInput.value : ""} crediti. Budget residuo: ${result.remainingBudget} crediti.`,
        "",
        "purchase",
      );
      return;
    }

    render(root, application, viewState, [], "", result.error, "purchase");
  });

  root.querySelectorAll<HTMLButtonElement>("[data-edit-purchase]").forEach((button) => {
    button.addEventListener("click", () => {
      const playerName = button.dataset.editPurchase ?? "";
      const purchase = state?.auction?.purchases.find(
        (candidate) => candidate.playerName === playerName,
      );
      if (!purchase) return;
      viewState.correctionDraft = {
        playerName: purchase.playerName,
        teamId: purchase.teamId,
        price: String(purchase.finalPrice),
      };
      if (viewState.activeView === "auction") {
        viewState.activeView = "catalog";
        viewState.catalogQuery = purchase.playerName;
        viewState.catalogStatuses = ["purchased"];
        viewState.catalogScrollTop = 0;
      }
      render(root, application, viewState);
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-cancel-purchase]").forEach((button) => {
    button.addEventListener("click", () => {
      const playerName = button.dataset.cancelPurchase ?? "";
      let result = application.cancelPurchase(playerName);
      if (result.status === "confirmation-required") {
        if (!window.confirm(
          `Annullare l’Acquisto di ${playerName} e restituire il calciatore ai disponibili?`,
        )) return;
        result = application.cancelPurchase(playerName, true);
      }
      if (result.status === "cancelled") {
        if (viewState.correctionDraft?.playerName === playerName) {
          viewState.correctionDraft = null;
        }
        render(
          root,
          application,
          viewState,
          [],
          `${playerName}: Acquisto annullato.`,
          "",
          "purchase",
        );
        return;
      }
      if (result.status === "invalid" || result.status === "failed") {
        render(root, application, viewState, [], "", result.error, "purchase");
      }
    });
  });

  root.querySelectorAll<HTMLFormElement>("[data-correction-form]").forEach((correctionForm) => {
    correctionForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const teamInput = correctionForm.elements.namedItem("teamId");
      const priceInput = correctionForm.elements.namedItem("finalPrice");
      const playerName = viewState.correctionDraft?.playerName ?? "";
      viewState.correctionDraft = {
        playerName,
        teamId: teamInput instanceof HTMLSelectElement ? teamInput.value : "",
        price: priceInput instanceof HTMLInputElement ? priceInput.value : "",
      };
      const result = application.correctPurchase(
        playerName,
        viewState.correctionDraft.teamId,
        priceInput instanceof HTMLInputElement ? priceInput.valueAsNumber : Number.NaN,
      );
      if (result.status === "corrected") {
        viewState.correctionDraft = null;
        render(
          root,
          application,
          viewState,
          [],
          `${playerName}: Correzione dell’acquisto salvata.`,
          "",
          "purchase",
        );
        return;
      }
      render(root, application, viewState, [], "", result.error, "purchase");
    });
  });
}

function renderBlockedPersistence(error: string, operationError: string): string {
  return `
    <div class="shell blocked-persistence">
      ${renderHeader()}
      <section class="card" aria-labelledby="blocked-persistence-title">
        <p class="eyebrow">Protezione dei dati locali</p>
        <h1 id="blocked-persistence-title">Sessione locale bloccata</h1>
        <p class="errors" role="alert">${escapeHtml(error)}</p>
        <p>Nessun dato è stato reimpostato. Esporta le copie problematiche per la diagnosi oppure conferma un reset esplicito.</p>
        ${operationError ? `<p class="errors" role="alert">${escapeHtml(operationError)}</p>` : ""}
        <div class="blocked-persistence-actions">
          <button type="button" data-export-problematic>Esporta dati problematici</button>
          <button type="button" class="secondary-button" data-reset-problematic>Resetta dati locali</button>
        </div>
      </section>
    </div>
  `;
}

function readNumber(form: HTMLFormElement, name: string): number {
  const input = form.elements.namedItem(name);
  return input instanceof HTMLInputElement ? input.valueAsNumber : Number.NaN;
}

function readText(form: HTMLFormElement, name: string): string {
  const input = form.elements.namedItem(name);
  return input instanceof HTMLInputElement ? input.value : "";
}

function renderEmpty(
  viewState: AuctionViewState,
  errors: ImportError[],
  backupNotice: string,
  backupError: string,
  importError: string,
): string {
  return `
    <div class="shell shell-wide">
      ${renderHeader(viewState, false)}
      ${viewState.activeView === "backup"
        ? renderBackupView(false, backupNotice, backupError)
        : `<section class="import-layout" aria-labelledby="import-title">
            <div>
              <p class="eyebrow">Primo passo</p>
              <h1 id="import-title">Importa il Catalogo calciatori</h1>
              <p class="lede">Carica il CSV completo del provider. Il file viene controllato per intero prima di essere salvato sul dispositivo.</p>
            </div>
            ${renderImportForm(errors, false, "", importError)}
          </section>`}
    </div>
  `;
}

function renderCatalog(
  state: Readonly<AppState>,
  viewState: AuctionViewState,
  errors: ImportError[],
  notice: string,
  operationError: string,
  operationTarget: OperationTarget,
): string {
  const restoredNotice = operationTarget === "backup" && notice
    ? `<p class="notice global-notice" role="status">${escapeHtml(notice)}</p>`
    : "";
  const content = viewState.activeView === "backup"
    ? renderBackupView(
        true,
        operationTarget === "backup" ? notice : "",
        operationTarget === "backup" ? operationError : "",
      )
    : viewState.activeView === "auction"
    ? renderAuctionSetup(state, notice, operationError, operationTarget)
    : renderCatalogSection(state, viewState, errors, notice, operationError, operationTarget);

  return `
    <div class="shell shell-wide">
      ${renderHeader(viewState, true)}
      ${viewState.activeView === "backup" ? "" : restoredNotice}
      ${content}
    </div>
  `;
}

function renderAuctionSetup(
  state: Readonly<AppState>,
  notice: string,
  operationError: string,
  operationTarget: OperationTarget,
): string {
  const setup = state.auctionSetup;
  const configuration = setup?.configuration;
  const teams = setup?.teams ?? [];
  const teamCount = configuration?.teamCount ?? 8;
  return `
      <section class="active-heading compact-heading">
        <p class="eyebrow">Configurazione</p>
        <h1>Configura l’Asta attiva</h1>
        <p>Imposta partecipanti e rose prima di iniziare.</p>
      </section>
      <form class="card auction-setup" id="auction-setup">
        <div class="setup-intro">
          <h2>Regole della sessione</h2>
          <p>I valori strutturali non saranno più modificabili dopo l’avvio.</p>
          ${operationTarget === "configuration" && notice ? `<p class="notice" role="status">${escapeHtml(notice)}</p>` : ""}
          ${operationTarget === "configuration" && operationError ? `<p class="errors" role="alert">${escapeHtml(operationError)}</p>` : ""}
        </div>
        <div class="setup-sections">
          <fieldset>
            <legend>Partecipanti e budget</legend>
            <div class="setup-fields setup-fields-two">
              <label>Numero di Squadre<input name="teamCount" type="number" min="2" value="${teamCount}" required /></label>
              <label>Budget iniziale comune<input name="initialBudget" type="number" min="1" value="${configuration?.initialBudget ?? 1000}" required /></label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Composizione delle rose</legend>
            <div class="setup-fields">
              <label>Posti POR<input name="slotsP" type="number" min="1" value="${configuration?.rosterSlots.P ?? 3}" required /></label>
              <label>Posti DIF<input name="slotsD" type="number" min="1" value="${configuration?.rosterSlots.D ?? 8}" required /></label>
              <label>Posti CEN<input name="slotsC" type="number" min="1" value="${configuration?.rosterSlots.C ?? 8}" required /></label>
              <label>Posti ATT<input name="slotsA" type="number" min="1" value="${configuration?.rosterSlots.A ?? 6}" required /></label>
            </div>
          </fieldset>
          <details class="setup-advanced">
            <summary>Parametri di mercato avanzati</summary>
            <div class="setup-fields setup-fields-two">
              <label>Soglia di adattamento<input name="adaptationThreshold" type="number" min="1" value="${configuration?.adaptationThreshold ?? 3}" required /></label>
              <label>Tolleranza della Percezione storica di mercato (%)<input name="historicalMarketPerceptionTolerance" type="number" min="0" value="${configuration?.historicalMarketPerceptionTolerance ?? 5}" required /></label>
            </div>
          </details>
          <fieldset>
            <legend>Nomi delle Squadre</legend>
            <div class="setup-fields setup-team-fields">
              <label>Nome della Squadra principale<input name="mainTeamName" value="${escapeHtml(teams.find((team) => team.isMain)?.name ?? "")}" required /></label>
              <div class="opponent-fields" data-opponent-fields>${renderOpponentFields(
                teamCount,
                teams.filter((team) => !team.isMain).map((team) => team.name),
              )}</div>
            </div>
          </fieldset>
          <div class="setup-lock-note" role="note">
            Dopo l’avvio, numero di Squadre, budget e Posti di ruolo non saranno più modificabili.
          </div>
          <div class="setup-actions">
            <button type="submit">Avvia asta</button>
          </div>
        </div>
      </form>
  `;
}

function renderCatalogSection(
  state: Readonly<AppState>,
  viewState: AuctionViewState,
  errors: ImportError[],
  notice: string,
  operationError: string,
  operationTarget: OperationTarget,
): string {
  const importFeedback = operationTarget === "import" && (notice || operationError || errors.length > 0);
  const shortlistFeedback = operationTarget === "shortlist";
  return `
    <section class="catalog-heading">
      <div>
        <p class="eyebrow">Preparazione personale</p>
        <h1>Catalogo calciatori</h1>
        <p class="catalog-count">${availablePlayers(state).length} calciatori disponibili</p>
      </div>
      <div class="catalog-heading-actions">
        ${state.auction
          ? `<div class="catalog-replacement-blocked">
              <button type="button" disabled>Sostituisci Catalogo calciatori</button>
              <p>Per sostituire il Catalogo calciatori devi prima eseguire il Reset dell’asta.</p>
            </div>`
          : `<details class="management-panel replace-panel" ${importFeedback ? "open" : ""}>
              <summary>Sostituisci Catalogo calciatori</summary>
              ${renderImportForm(
                errors,
                true,
                operationTarget === "import" ? notice : "",
                operationTarget === "import" ? operationError : "",
              )}
            </details>`}
        <details class="management-panel" ${shortlistFeedback ? "open" : ""}>
          <summary>Gestisci Shortlist</summary>
          ${renderShortlistManager(
            state,
            operationTarget === "shortlist" ? notice : "",
            operationTarget === "shortlist" ? operationError : "",
          )}
        </details>
      </div>
    </section>
    ${operationTarget === "purchase" && notice
      ? `<p class="notice global-notice" role="status">${escapeHtml(notice)}</p>`
      : ""}
    ${operationTarget === "purchase" && operationError && !viewState.correctionDraft
      ? `<p class="errors global-notice" role="alert">${escapeHtml(operationError)}</p>`
      : ""}
    ${renderCatalogTable(
      state,
      viewState,
      operationTarget === "purchase" ? operationError : "",
    )}
  `;
}

function renderCatalogTable(
  state: Readonly<AppState>,
  viewState: AuctionViewState,
  operationError = "",
): string {
  const showAvailability = Boolean(state.auction);
  const purchasedPlayerNames = new Set(
    state.auction?.purchases.map((purchase) => purchase.playerName) ?? [],
  );
  const query = viewState.catalogQuery.trim().toLocaleLowerCase("it-IT");
  const slots = [...new Set(state.catalog.map((player) => player.slot))]
    .sort((left, right) => left - right);
  const players = state.catalog
    .filter((player) => {
      const matchesQuery = query === ""
        || player.name.toLocaleLowerCase("it-IT").includes(query)
        || player.team.toLocaleLowerCase("it-IT").includes(query);
      const matchesRole = viewState.catalogRoles.length === 0
        || viewState.catalogRoles.includes(player.role);
      const matchesSlot = viewState.catalogSlots.length === 0
        || viewState.catalogSlots.includes(player.slot);
      const status: CatalogStatus = purchasedPlayerNames.has(player.name)
        ? "purchased"
        : "available";
      const matchesStatus = !state.auction
        || viewState.catalogStatuses.length === 0
        || viewState.catalogStatuses.includes(status);
      return matchesQuery && matchesRole && matchesSlot && matchesStatus;
    })
    .sort((left, right) => compareCatalogPlayers(left, right, viewState));
  const hasFilters = query !== ""
    || viewState.catalogRoles.length > 0
    || viewState.catalogSlots.length > 0
    || showAvailability && viewState.catalogStatuses.length > 0;
  const columnCount = catalogColumns.length + 1 + (showAvailability ? 1 : 0);

  return `
    <section class="catalog-controls card" aria-label="Ricerca e filtri del Catalogo">
      <label class="catalog-search">Cerca per nome o squadra reale
        <input type="search" data-catalog-search value="${escapeHtml(viewState.catalogQuery)}" />
      </label>
      <div class="catalog-filter" role="group" aria-labelledby="catalog-role-filter">
        <span id="catalog-role-filter">Ruolo</span>
        <div class="filter-options">${Object.entries(roleNames).map(([role, label]) => `
          <button type="button" data-catalog-role="${role}" aria-pressed="${viewState.catalogRoles.includes(role as ClassicRole)}">${label}</button>
        `).join("")}</div>
      </div>
      <div class="catalog-filter" role="group" aria-labelledby="catalog-slot-filter">
        <span id="catalog-slot-filter">Slot</span>
        <div class="filter-options">${slots.map((slot) => `
          <button type="button" data-catalog-slot="${slot}" aria-pressed="${viewState.catalogSlots.includes(slot)}">${slot}</button>
        `).join("")}</div>
      </div>
      ${showAvailability ? `
        <div class="catalog-filter" role="group" aria-labelledby="catalog-status-filter">
          <span id="catalog-status-filter">Stato</span>
          <div class="filter-options">
            <button type="button" data-catalog-status="available" aria-pressed="${viewState.catalogStatuses.includes("available")}">Disponibili</button>
            <button type="button" data-catalog-status="purchased" aria-pressed="${viewState.catalogStatuses.includes("purchased")}">Acquistati</button>
          </div>
        </div>
      ` : ""}
      <div class="catalog-control-summary">
        <p id="catalog-result-count" aria-live="polite">${players.length} ${players.length === 1 ? "calciatore" : "calciatori"} su ${state.catalog.length}</p>
        <button type="button" class="secondary-button" data-reset-catalog-controls ${hasFilters ? "" : "disabled"}>Azzera ricerca e filtri</button>
      </div>
    </section>
    <div class="table-frame">
      <table aria-describedby="catalog-result-count">
        <thead><tr>${catalogColumns.map((column) => {
          const active = viewState.catalogSort === column.key;
          const direction = active ? viewState.catalogSortDirection : column.firstDirection;
          const nextDirection = active
            ? direction === "ascending"
              ? "decrescente"
              : "crescente"
            : column.firstDirection === "ascending"
              ? "crescente"
              : "decrescente";
          return `<th class="${column.numeric ? "numeric" : ""}" ${active ? `aria-sort="${direction}"` : ""}><button type="button" class="catalog-sort-button" data-catalog-sort="${column.key}" aria-label="Ordina ${column.label} in ordine ${nextDirection}">${column.label}<span class="sort-indicator" data-direction="${active ? direction : ""}" aria-hidden="true"></span></button></th>`;
        }).join("")}<th>Shortlist</th>${showAvailability ? "<th>Stato</th>" : ""}</tr></thead>
        <tbody>${players.length === 0
          ? `<tr><td class="empty-catalog" colspan="${columnCount}">
              <p>Nessun calciatore corrisponde alla ricerca e ai filtri selezionati.</p>
              <button type="button" data-reset-catalog-controls>Azzera ricerca e filtri</button>
            </td></tr>`
          : players.map((player) => {
          const availability = renderCatalogAvailability(state, player, viewState, operationError);
          return `
            <tr>${catalogColumns.map((column) => column.rowHeader
              ? `<th scope="row">${column.render(player)}</th>`
              : `<td class="${column.numeric ? "numeric" : ""}">${column.render(player)}</td>`
            ).join("")}<td>${renderPlayerShortlist(player, state)}</td>${showAvailability ? `<td>${availability}</td>` : ""}</tr>
          `;
        }).join("")}</tbody>
      </table>
    </div>
    <ul class="catalog-mobile-list" aria-label="Catalogo calciatori mobile">
      ${players.map((player) => `
        <li>
          <details class="catalog-mobile-player" ${viewState.correctionDraft?.playerName === player.name ? "open" : ""}>
            <summary>
              <strong>${escapeHtml(player.name)}</strong>
              <span class="role">${roleNames[player.role]}</span>
              <span class="catalog-mobile-price">PFC ${numberFormatter.format(player.pfc)}</span>
            </summary>
            <dl>
              <div><dt>Squadra reale</dt><dd>${escapeHtml(player.team)}</dd></div>
              <div><dt>Slot</dt><dd>${player.slot}</dd></div>
              <div><dt>PMA</dt><dd>${numberFormatter.format(player.pma)}</dd></div>
              <div><dt>Fantamedia prevista</dt><dd>${numberFormatter.format(player.expectedFantamedia)}</dd></div>
              <div><dt>Titolarità prevista</dt><dd>${numberFormatter.format(player.expectedTitolarita)}%</dd></div>
            </dl>
            <div class="catalog-mobile-shortlist">${renderPlayerShortlist(player, state, true)}</div>
            ${showAvailability ? `<div class="catalog-mobile-status">${renderCatalogAvailability(state, player, viewState, operationError, true)}</div>` : ""}
          </details>
        </li>
      `).join("")}
    </ul>
  `;
}

function renderCatalogAvailability(
  state: Readonly<AppState>,
  player: Player,
  viewState: AuctionViewState,
  operationError: string,
  mobile = false,
): string {
  const purchase = state.auction?.purchases.find(
    (candidate) => candidate.playerName === player.name,
  );
  if (!purchase) return "Disponibile";
  const team = state.auction?.teams.find((candidate) => candidate.id === purchase.teamId);
  const context = mobile ? " mobile" : "";
  return `Acquistato · ${escapeHtml(team?.name ?? "Squadra non disponibile")} · ${purchase.finalPrice} crediti
    <button type="button" class="icon-button" data-edit-purchase="${escapeHtml(player.name)}" aria-label="Correggi Acquisto${context} ${escapeHtml(player.name)}">${renderTablerIcon("pencil")}</button>
    <button type="button" data-cancel-purchase="${escapeHtml(player.name)}" aria-label="Annulla Acquisto${context} ${escapeHtml(player.name)}">Annulla</button>
    ${viewState.correctionDraft?.playerName === player.name
      ? renderCorrectionForm(state.auction!, viewState.correctionDraft, operationError, mobile)
      : ""}`;
}

function compareCatalogPlayers(
  left: Player,
  right: Player,
  viewState: AuctionViewState,
): number {
  const roleOrder: ClassicRole[] = ["P", "D", "C", "A"];
  const key = viewState.catalogSort;
  const difference = key === "name" || key === "team"
    ? left[key].localeCompare(right[key], "it-IT")
    : key === "role"
    ? roleOrder.indexOf(left.role) - roleOrder.indexOf(right.role)
    : left[key] - right[key];
  const directed = viewState.catalogSortDirection === "ascending" ? difference : -difference;
  return directed || left.name.localeCompare(right.name, "it-IT");
}

function renderPlayerShortlist(
  player: Player,
  state: Readonly<AppState>,
  mobile = false,
): string {
  const memberships = state.shortlistCategories.filter(
    (category) => category.playerNames.includes(player.name),
  );
  if (state.shortlistCategories.length === 0) {
    return mobile
      ? '<span class="empty-shortlist-cell">Nessuna categoria Shortlist</span>'
      : '<span class="empty-shortlist-cell" aria-label="Nessuna categoria della Shortlist">-</span>';
  }

  return `
    <div class="player-shortlist">
      ${memberships.length > 0 ? '<span class="shortlist-status">In Shortlist</span>' : ""}
      ${state.shortlistCategories.map((category) => `
        <label>
          <input
            type="checkbox"
            data-shortlist-association
            data-player-name="${escapeHtml(player.name)}"
            data-category-name="${escapeHtml(category.name)}"
            aria-label="${escapeHtml(player.name)}${mobile ? " mobile" : ""} · ${escapeHtml(category.name)}"
            ${category.playerNames.includes(player.name) ? "checked" : ""}
          />
          ${escapeHtml(category.name)}
        </label>
      `).join("")}
    </div>
  `;
}

function renderShortlistManager(
  state: Readonly<AppState>,
  notice: string,
  operationError: string,
): string {
  return `
    <section class="card shortlist-manager" aria-labelledby="shortlist-title">
      <div>
        <p class="eyebrow">Organizzazione personale</p>
        <h2 id="shortlist-title">Shortlist</h2>
        <p>Crea categorie sovrapponibili e associale ai calciatori dal Catalogo.</p>
        ${notice ? `<p class="notice" role="status">${escapeHtml(notice)}</p>` : ""}
        ${operationError ? `<p class="errors" role="alert">${escapeHtml(operationError)}</p>` : ""}
      </div>
      <div>
        <form class="create-category" data-create-category>
          <label>Nuova categoria<input name="categoryName" required /></label>
          <button type="submit">Crea categoria</button>
        </form>
        <div class="category-list">
          ${state.shortlistCategories.length > 0
            ? state.shortlistCategories.map((category) => `
              <article class="category-card">
                <h3>${escapeHtml(category.name)}</h3>
                <p>${category.playerNames.length} ${category.playerNames.length === 1 ? "calciatore" : "calciatori"}</p>
                <form data-rename-category data-category-name="${escapeHtml(category.name)}">
                  <label>
                    Rinomina categoria ${escapeHtml(category.name)}
                    <input name="categoryName" value="${escapeHtml(category.name)}" required />
                  </label>
                  <button type="submit" aria-label="Salva nome ${escapeHtml(category.name)}">Salva nome</button>
                </form>
                <button
                  type="button"
                  class="delete-category"
                  data-delete-category
                  data-category-name="${escapeHtml(category.name)}"
                  aria-label="Elimina categoria ${escapeHtml(category.name)}"
                >Elimina</button>
              </article>
            `).join("")
            : "<p>Nessuna categoria creata.</p>"}
        </div>
      </div>
    </section>
  `;
}

function renderOpponentFields(teamCount: number, names: string[] = []): string {
  return Array.from({ length: teamCount - 1 }, (_, index) => {
    const number = index + 2;
    const name = names[index]?.trim() || `Squadra ${number}`;
    return `<label>Squadra avversaria ${number}<input data-opponent-name name="opponent-${number}" value="${escapeHtml(name)}" /></label>`;
  }).join("");
}

function renderActiveAuction(
  state: Readonly<AppState>,
  auction: Readonly<ActiveAuction>,
  viewState: AuctionViewState,
  notice: string,
  operationError: string,
  operationTarget: OperationTarget,
): string {
  const configuration = auction.configuration;
  const mainTeam = auction.teams.find((team) => team.isMain)!;
  const mainTeamPurchases = auction.purchases.filter((purchase) => purchase.teamId === mainTeam.id);
  const mainTeamBudget = remainingTeamBudget(auction, mainTeam.id);
  const selectedPlayer = state.catalog.find(
    (player) => player.name === viewState.selectedPlayerName,
  );
  const selectedRoleIsComplete = selectedPlayer
    ? occupiedTeamRoleSlots(auction, state.catalog, mainTeam.id, selectedPlayer.role)
      >= configuration.rosterSlots[selectedPlayer.role]
    : false;
  const auctionComplete = isAuctionComplete(auction, state.catalog);
  const availableCount = availablePlayers(state).length;
  if (viewState.activeView !== "auction") {
    const content = viewState.activeView === "catalog"
      ? renderCatalogSection(state, viewState, [], notice, operationError, operationTarget)
      : viewState.activeView === "backup"
      ? renderBackupView(
          true,
          operationTarget === "backup" ? notice : "",
          operationTarget === "backup" ? operationError : "",
        )
      : viewState.activeView === "my-team"
      ? renderMyRoster(state, auction)
      : renderOpponentTeams(state, auction);
    return `
      <div class="shell shell-wide active-shell">
        ${renderActiveHeader(state, auction, viewState)}
        ${content}
      </div>
    `;
  }
  return `
    <div class="shell shell-wide active-shell">
      ${renderActiveHeader(state, auction, viewState)}
      ${operationTarget === "backup" && notice
        ? `<p class="notice global-notice" role="status">${escapeHtml(notice)}</p>`
        : ""}
      <section class="active-session-heading" aria-labelledby="auction-title">
        <div>
          <p class="session-kicker">${auctionComplete ? "Sessione completata" : "Sessione in corso"}</p>
          <h1 id="auction-title">${auctionComplete ? "Asta completa" : "Asta attiva"}</h1>
          ${auctionComplete ? "<p>Tutte le Squadre hanno occupato i Posti di ruolo configurati.</p>" : ""}
        </div>
        <div class="session-facts">
          <span><strong>${availableCount}</strong> calciatori disponibili</span>
          <span>Regole strutturali bloccate</span>
        </div>
      </section>
      ${renderRecentPurchase(state, auction)}
      <div class="auction-command-center">
        <section class="card" aria-label="Ranking e Scarsità">
          <h2>Ranking e Scarsità</h2>
          ${renderRankingAndScarcity(state, viewState)}
        </section>
        <section class="card" aria-label="Scheda d’asta">
          <h2>Scheda d’asta</h2>
          ${renderAuctionCard(
            state,
            auction,
            viewState,
            operationTarget === "purchase" ? notice : "",
            operationTarget === "purchase" ? operationError : "",
            selectedRoleIsComplete,
          )}
        </section>
        <section class="card main-team-summary" aria-label="${escapeHtml(mainTeam.name)}">
          <h2>${escapeHtml(mainTeam.name)}</h2>
          <section class="personal-constraints" aria-label="Vincoli personali">
            <h3>Vincoli personali</h3>
            <p>Budget residuo: <span>${numberFormatter.format(mainTeamBudget)} crediti</span></p>
            <p>Massimo spendibile: <span>${numberFormatter.format(maximumSpendable(auction, mainTeam.id))} crediti</span></p>
          </section>
          <ul>${Object.entries(roleNames).map(([role, name]) => `
            <li data-main-team-role>${name} ${occupiedTeamRoleSlots(auction, state.catalog, mainTeam.id, role as ClassicRole)}/${configuration.rosterSlots[role as ClassicRole]}</li>
          `).join("")}</ul>
          <h3>Rosa</h3>
          ${mainTeamPurchases.length > 0
            ? `<ul aria-label="Rosa ${escapeHtml(mainTeam.name)}">${mainTeamPurchases.map((purchase) => `<li>${escapeHtml(purchase.playerName)} · ${purchase.finalPrice} crediti</li>`).join("")}</ul>`
            : "<p>Nessun calciatore acquistato.</p>"}
        </section>
      </div>
      <details class="auction-configuration-panel" ${operationTarget === "configuration" && (notice || operationError) ? "open" : ""}>
        <summary>Configurazione d’asta</summary>
        <form class="card auction-setup" id="auction-configuration">
        <div>
          <h2>Configurazione d’asta</h2>
          <p>Un’unica sessione locale, senza storico di aste.</p>
          <button type="submit">Salva Configurazione d’asta</button>
          <button type="button" class="secondary-button" data-reset-auction>Resetta asta</button>
          ${operationTarget === "configuration" && notice ? `<p class="notice" role="status">${escapeHtml(notice)}</p>` : ""}
          ${operationTarget === "configuration" && operationError ? `<p class="errors" role="alert">${escapeHtml(operationError)}</p>` : ""}
        </div>
        <div class="setup-fields">
          <label>Numero di Squadre<input type="number" value="${configuration.teamCount}" disabled /></label>
          <label>Budget iniziale comune<input type="number" value="${configuration.initialBudget}" disabled /></label>
          <label>Posti POR<input type="number" value="${configuration.rosterSlots.P}" disabled /></label>
          <label>Posti DIF<input type="number" value="${configuration.rosterSlots.D}" disabled /></label>
          <label>Posti CEN<input type="number" value="${configuration.rosterSlots.C}" disabled /></label>
          <label>Posti ATT<input type="number" value="${configuration.rosterSlots.A}" disabled /></label>
          <label>Soglia di adattamento<input name="adaptationThreshold" type="number" min="1" value="${configuration.adaptationThreshold}" required /></label>
          <label>Tolleranza della Percezione storica di mercato (%)<input name="historicalMarketPerceptionTolerance" type="number" min="0" value="${configuration.historicalMarketPerceptionTolerance}" required /></label>
          ${auction.teams.map((team, index) => `
            <label>${team.isMain ? "Nome della Squadra principale" : `Squadra avversaria ${index + 1}`}
              <input data-team-name name="${team.id}" value="${escapeHtml(team.name)}" ${team.isMain ? "required" : ""} />
            </label>
          `).join("")}
        </div>
        </form>
      </details>
    </div>
  `;
}

function renderRecentPurchase(
  state: Readonly<AppState>,
  auction: Readonly<ActiveAuction>,
): string {
  const purchase = auction.purchases[auction.purchases.length - 1];
  if (!purchase) return "";
  const player = state.catalog.find((candidate) => candidate.name === purchase.playerName);
  const team = auction.teams.find((candidate) => candidate.id === purchase.teamId);
  return `
    <aside class="recent-purchase" aria-label="Ultimo Acquisto">
      <div>
        <span>Ultimo Acquisto</span>
        <strong>${escapeHtml(purchase.playerName)}</strong>
        <span class="recent-purchase-meta">
          <span>${player ? roleNames[player.role] : "Ruolo non disponibile"}</span>
          <span>${escapeHtml(team?.name ?? "Squadra non disponibile")}</span>
          <span>${numberFormatter.format(purchase.finalPrice)} crediti</span>
        </span>
      </div>
      <div class="recent-purchase-actions">
        <button type="button" class="icon-button" data-edit-purchase="${escapeHtml(purchase.playerName)}" aria-label="Correggi Acquisto ${escapeHtml(purchase.playerName)}">${renderTablerIcon("pencil")}</button>
        <button type="button" class="danger-button" data-cancel-purchase="${escapeHtml(purchase.playerName)}" aria-label="Annulla Acquisto ${escapeHtml(purchase.playerName)}">Annulla</button>
      </div>
    </aside>
  `;
}

function renderMyRoster(
  state: Readonly<AppState>,
  auction: Readonly<ActiveAuction>,
): string {
  const mainTeam = auction.teams.find((team) => team.isMain)!;
  const mainTeamPurchases = purchasesWithPlayersForTeam(state.catalog, auction, mainTeam.id);
  const rolePurchases = (role: ClassicRole) => mainTeamPurchases.filter(
    ({ player }) => player.role === role,
  );

  return `
    <section class="roster-view" aria-labelledby="my-roster-title">
      <div class="active-heading">
        <p class="eyebrow">Squadra principale</p>
        <h1 id="my-roster-title">La mia rosa</h1>
        <p>Composizione e spesa di ${escapeHtml(mainTeam.name)}, organizzate per Ruolo Classic.</p>
      </div>
      <div class="roster-columns">
        ${Object.entries(roleNames).map(([roleValue, roleName]) => {
          const role = roleValue as ClassicRole;
          const purchases = rolePurchases(role);
          const spent = purchases.reduce((total, { purchase }) => total + purchase.finalPrice, 0);
          const occupied = purchases.length;
          const total = auction.configuration.rosterSlots[role];
          const free = total - occupied;
          const percentage = spent / auction.configuration.initialBudget * 100;
          return `
            <section class="card roster-role" data-roster-role aria-label="Rosa ${roleName}">
              <h2>${roleName}</h2>
              <dl class="roster-role-facts">
                <div><dt>Crediti spesi</dt><dd>${numberFormatter.format(spent)} crediti</dd></div>
                <div><dt>Percentuale del budget iniziale comune</dt><dd>${numberFormatter.format(percentage)}%</dd></div>
                <div><dt>Posti di ruolo</dt><dd>${occupied}/${total} occupati</dd></div>
              </dl>
              ${purchases.length > 0
                ? `<ul class="roster-purchases" aria-label="Acquisti ${roleName}">${purchases.map(({ player, purchase }) => `<li>${escapeHtml(player.name)} · ${escapeHtml(player.team)} · Slot ${player.slot} · ${numberFormatter.format(purchase.finalPrice)} crediti</li>`).join("")}</ul>`
                : "<p>Nessun calciatore acquistato.</p>"}
              <p class="free-roster-slots">${free} ${free === 1 ? "posto libero" : "posti liberi"}</p>
            </section>
          `;
        }).join("")}
      </div>
      <section class="card acquired-slot-distribution" aria-label="Distribuzione degli Slot acquisiti">
        <h2>Distribuzione degli Slot acquisiti</h2>
        <div class="acquired-slot-roles">
          ${Object.entries(roleNames).map(([roleValue, roleName]) => {
            const purchases = rolePurchases(roleValue as ClassicRole);
            const slots = [...new Set(purchases.map(({ player }) => player.slot))]
              .sort((left, right) => left - right);
            return `
              <section aria-label="Slot acquisiti ${roleName}">
                <h3>${roleName}</h3>
                ${slots.length > 0
                  ? `<ul aria-label="Slot acquisiti ${roleName}">${slots.map((slot) => {
                      const count = purchases.filter(({ player }) => player.slot === slot).length;
                      return `<li>Slot ${slot} · ${count} ${count === 1 ? "calciatore" : "calciatori"}</li>`;
                    }).join("")}</ul>`
                  : "<p>Nessuno Slot acquisito.</p>"}
              </section>
            `;
          }).join("")}
        </div>
      </section>
    </section>
  `;
}

function renderOpponentTeams(
  state: Readonly<AppState>,
  auction: Readonly<ActiveAuction>,
): string {
  return `
    <section class="opponent-teams-view" aria-labelledby="opponent-teams-title">
      <div class="active-heading">
        <p class="eyebrow">Partecipanti all’Asta attiva</p>
        <h1 id="opponent-teams-title">Squadre</h1>
        <p>Consulta le rose avversarie usando soltanto gli Acquisti registrati.</p>
      </div>
      <div class="opponent-team-list">
        ${auction.teams.filter((team) => !team.isMain).map((team) => {
          const purchases = purchasesWithPlayersForTeam(state.catalog, auction, team.id);
          const remainingBudget = remainingTeamBudget(auction, team.id);
          const spent = auction.configuration.initialBudget - remainingBudget;
          return `
            <details class="card opponent-team" data-opponent-team="${escapeHtml(team.id)}">
              <summary>${escapeHtml(team.name)}</summary>
              <dl class="opponent-budget">
                <div><dt>Budget residuo</dt><dd>${numberFormatter.format(remainingBudget)} crediti</dd></div>
                <div><dt>Crediti spesi</dt><dd>${numberFormatter.format(spent)} crediti</dd></div>
              </dl>
              <h2>Posti di ruolo</h2>
              <ul class="opponent-role-slots" aria-label="Posti di ruolo ${escapeHtml(team.name)}">
                ${Object.entries(roleNames).map(([roleValue, roleName]) => `<li>${roleName} ${occupiedTeamRoleSlots(auction, state.catalog, team.id, roleValue as ClassicRole)}/${auction.configuration.rosterSlots[roleValue as ClassicRole]}</li>`).join("")}
              </ul>
              <h2>Acquisti registrati</h2>
              ${purchases.length > 0
                ? `<ul class="opponent-purchases" aria-label="Acquisti ${escapeHtml(team.name)}">${purchases.map(({ player, purchase }) => `<li>${escapeHtml(player.name)} · ${roleNames[player.role]} · ${numberFormatter.format(purchase.finalPrice)} crediti</li>`).join("")}</ul>`
                : "<p>Nessun Acquisto registrato.</p>"}
            </details>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function purchasesWithPlayersForTeam(
  catalog: readonly Player[],
  auction: Readonly<ActiveAuction>,
  teamId: string,
) {
  return auction.purchases.flatMap((purchase) => {
    const player = catalog.find((candidate) => candidate.name === purchase.playerName);
    return purchase.teamId === teamId && player ? [{ player, purchase }] : [];
  });
}

function renderRankingAndScarcity(
  state: Readonly<AppState>,
  viewState: AuctionViewState,
): string {
  const role = viewState.selectedRole;
  const catalogRolePlayers = state.catalog.filter((player) => player.role === role);
  const availableRolePlayers = availablePlayers(state).filter((player) => player.role === role);
  const selectedCategory = state.shortlistCategories.find(
    (category) => category.name === viewState.shortlistCategory,
  );
  const players = availableRolePlayers
    .filter((player) => !selectedCategory || selectedCategory.playerNames.includes(player.name))
    .sort((left, right) => compareRankedPlayers(left, right, viewState.rankingSort));
  const purchasedPlayerNames = new Set(
    state.auction?.purchases.map((purchase) => purchase.playerName) ?? [],
  );
  const purchasedShortlistPlayers = selectedCategory && viewState.showPurchasedShortlist
    ? catalogRolePlayers
      .filter((player) =>
        purchasedPlayerNames.has(player.name)
        && selectedCategory.playerNames.includes(player.name)
      )
      .sort((left, right) => compareRankedPlayers(left, right, viewState.rankingSort))
    : [];
  const maxSlot = Math.max(0, ...catalogRolePlayers.map((player) => player.slot));

  return `
    <div class="role-tabs" aria-label="Ruolo Classic">${Object.entries(roleNames).map(
      ([value, label]) => `<button
        type="button"
        data-select-role="${value}"
        aria-pressed="${role === value}"
      >${label}</button>`,
    ).join("")}</div>
    <label class="ranking-sort">Ordina ranking
      <select data-ranking-sort>
        <option value="pfc" ${viewState.rankingSort === "pfc" ? "selected" : ""}>PFC decrescente</option>
        <option value="slot" ${viewState.rankingSort === "slot" ? "selected" : ""}>Slot crescente</option>
        <option value="pma" ${viewState.rankingSort === "pma" ? "selected" : ""}>PMA decrescente</option>
        <option value="expectedFantamedia" ${viewState.rankingSort === "expectedFantamedia" ? "selected" : ""}>Fantamedia decrescente</option>
        <option value="expectedTitolarita" ${viewState.rankingSort === "expectedTitolarita" ? "selected" : ""}>Titolarità decrescente</option>
      </select>
    </label>
    <label class="ranking-sort">Filtra per categoria
      <select data-shortlist-filter>
        <option value="">Tutti i disponibili</option>
        ${state.shortlistCategories.map((category) => `
          <option value="${escapeHtml(category.name)}" ${selectedCategory === category ? "selected" : ""}>${escapeHtml(category.name)}</option>
        `).join("")}
      </select>
    </label>
    <label class="ranking-checkbox">
      <input
        type="checkbox"
        data-show-purchased-shortlist
        ${viewState.showPurchasedShortlist ? "checked" : ""}
        ${selectedCategory ? "" : "disabled"}
      />
      Mostra anche gli acquistati nella Shortlist
    </label>
    ${selectedCategory && viewState.showPurchasedShortlist ? `
      <h3>Acquistati nella Shortlist</h3>
      <ul class="ranking-list" aria-label="Acquistati nella Shortlist">${purchasedShortlistPlayers.map((player) =>
        `<li><button type="button" data-call-player="${escapeHtml(player.name)}" ${viewState.selectedPlayerName === player.name ? 'aria-current="true"' : ""}><span>${escapeHtml(player.name)}</span><span class="ranking-metric"> · ${renderRankingValue(player, viewState.rankingSort)} · Acquistato</span></button></li>`,
      ).join("")}</ul>
    ` : ""}
    <ol class="ranking-list" data-ranking-list aria-label="Ranking ${roleNames[role]}">${players.map((player) =>
      `<li><button type="button" data-call-player="${escapeHtml(player.name)}" ${viewState.selectedPlayerName === player.name ? 'aria-current="true"' : ""}><span>${escapeHtml(player.name)}</span><span class="ranking-metric"> · ${renderRankingValue(player, viewState.rankingSort)}</span></button></li>`,
    ).join("")}</ol>
    <h3>Scarsità per slot</h3>
    <ul class="scarcity-list" aria-label="Scarsità ${roleNames[role]}">${Array.from(
      { length: maxSlot },
      (_, index) => {
        const slot = index + 1;
        const count = availableRolePlayers.filter((player) => player.slot === slot).length;
        const availability = count === 1 ? "disponibile" : "disponibili";
        return `<li aria-label="Slot ${slot}: ${count} ${availability}"><span>Slot ${slot}</span> <strong>${count}</strong> <span>${availability}</span></li>`;
      },
    ).join("")}</ul>
  `;
}

function compareRankedPlayers(left: Player, right: Player, sort: RankingSort): number {
  if (sort === "pfc") return compareByPfcThenName(left, right);
  const difference = sort === "slot"
    ? left.slot - right.slot
    : right[sort] - left[sort];
  return difference || left.name.localeCompare(right.name, "it-IT");
}

function compareByPfcThenName(left: Player, right: Player): number {
  return right.pfc - left.pfc || left.name.localeCompare(right.name, "it-IT");
}

function renderRankingValue(player: Player, sort: RankingSort): string {
  const labels: Record<RankingSort, string> = {
    pfc: "PFC",
    slot: "Slot",
    pma: "PMA",
    expectedFantamedia: "Fantamedia",
    expectedTitolarita: "Titolarità",
  };
  const suffix = sort === "expectedTitolarita" ? "%" : "";
  const value = sort === "expectedFantamedia" ? player[sort] : Math.round(player[sort]);
  return `${labels[sort]} ${numberFormatter.format(value)}${suffix}`;
}

function renderAuctionCard(
  state: Readonly<AppState>,
  auction: Readonly<ActiveAuction>,
  viewState: AuctionViewState,
  notice: string,
  operationError: string,
  unavailableToMainTeam: boolean,
): string {
  const player = state.catalog.find((candidate) => candidate.name === viewState.selectedPlayerName);
  if (!player) {
    return `${notice ? `<p class="notice" role="status">${escapeHtml(notice)}</p>` : ""}<p>Cerca il Calciatore chiamato per aprire la scheda temporanea.</p>`;
  }

  const historicalMarketDifferencePercent = (player.pma - player.pfc) / player.pfc * 100;
  const tolerance = auction.configuration.historicalMarketPerceptionTolerance;
  const perception = historicalMarketDifferencePercent > tolerance
    ? "In hype"
    : historicalMarketDifferencePercent < -tolerance
      ? "Sottovalutato"
      : "In linea";
  const signedHistoricalMarketDifference = `${historicalMarketDifferencePercent > 0 ? "+" : ""}${Math.round(historicalMarketDifferencePercent)}%`;
  const adaptation = rolePriceAdaptation(auction, state.catalog, player);
  const observationLabel = adaptation?.observations === 1 ? "Acquisto" : "Acquisti";
  const signedAuctionDeviation = adaptation
    ? `${adaptation.deviationPercent > 0 ? "+" : ""}${adaptation.deviationPercent}%`
    : "";

  return `
    <article class="auction-card">
      <div class="auction-card-heading">
        <div>
          <h3 tabindex="-1" data-player-heading>${escapeHtml(player.name)}</h3>
          <p>${escapeHtml(player.team)} · ${roleNames[player.role]} · Slot ${player.slot}</p>
        </div>
        <button type="button" class="icon-button" data-close-auction-card aria-label="Chiudi Scheda d’asta">${renderTablerIcon("x")}</button>
      </div>
      ${unavailableToMainTeam
        ? `<p class="unavailable-player">Il ruolo ${roleNames[player.role]} è completo nella tua rosa. Puoi ancora assegnare il calciatore a una Squadra avversaria.</p>`
        : ""}
      <section class="market-signals" aria-label="Segnali di mercato">
        <h4>Segnali di mercato</h4>
        <div class="signal-groups">
          <section class="signal-group" aria-labelledby="provider-signals-title">
            <h5 id="provider-signals-title">Provider</h5>
            <dl>
              <div><dt>PFC</dt><dd>${numberFormatter.format(Math.round(player.pfc))}</dd></div>
            </dl>
          </section>
          <section class="signal-group" aria-labelledby="historical-signals-title">
            <h5 id="historical-signals-title">Mercato storico</h5>
            <dl>
              <div><dt>PMA</dt><dd>${numberFormatter.format(Math.round(player.pma))}</dd></div>
              <div><dt>Percezione storica di mercato</dt><dd>${perception} · ${signedHistoricalMarketDifference}</dd></div>
            </dl>
          </section>
          <section class="signal-group" aria-labelledby="performance-signals-title">
            <h5 id="performance-signals-title">Prestazioni attese</h5>
            <dl>
              <div><dt>Fantamedia prevista</dt><dd>${numberFormatter.format(player.expectedFantamedia)}</dd></div>
              <div><dt>Titolarità prevista</dt><dd>${Math.round(player.expectedTitolarita)}%</dd></div>
            </dl>
          </section>
          <section class="signal-group live-signal-group" aria-labelledby="live-signals-title">
            <h5 id="live-signals-title">Asta live</h5>
            <dl>
              ${adaptation ? `
                <div><dt>Prezzo adattato all’asta</dt><dd>${numberFormatter.format(adaptation.adaptedPrice)} crediti</dd></div>
                <div><dt>Scostamento d’asta per ruolo</dt><dd>${signedAuctionDeviation}</dd></div>
                <div><dt>Osservazioni</dt><dd>${adaptation.observations} ${observationLabel}</dd></div>
              ` : "<div><dt>Prezzo adattato all’asta</dt><dd>Dati insufficienti</dd></div>"}
            </dl>
          </section>
        </div>
      </section>
      <button type="button" data-open-purchase>Assegna giocatore</button>
      ${viewState.assignmentOpen
        ? renderPurchaseForm(auction, state.catalog, player, viewState, operationError)
        : ""}
      ${renderAuctionCardShortlist(player, state)}
      ${renderImmediateAlternatives(player, state)}
    </article>
  `;
}

function renderPurchaseForm(
  auction: Readonly<ActiveAuction>,
  catalog: readonly Player[],
  player: Player,
  viewState: AuctionViewState,
  operationError: string,
): string {
  return `
    <form class="purchase-panel" data-purchase-form>
      <h4>Registra Acquisto</h4>
      <label>Squadra
        <select name="teamId" required>
          <option value="">Seleziona una Squadra</option>
          ${auction.teams.map((team) => {
            const mainTeamLabel = team.isMain ? " · Squadra principale" : "";
            const occupied = occupiedTeamRoleSlots(auction, catalog, team.id, player.role);
            const total = auction.configuration.rosterSlots[player.role];
            return `<option
              value="${escapeHtml(team.id)}"
              data-budget="${remainingTeamBudget(auction, team.id)}"
              data-role-occupancy="${occupied}/${total}"
              data-maximum-spendable="${team.isMain ? maximumSpendable(auction, team.id) : ""}"
              ${viewState.assignmentTeamId === team.id ? "selected" : ""}
            >${escapeHtml(team.name)}${mainTeamLabel} · ${numberFormatter.format(remainingTeamBudget(auction, team.id))} crediti</option>`;
          }).join("")}
        </select>
      </label>
      <label>Prezzo finale
        <input name="finalPrice" type="number" min="1" step="1" value="${escapeHtml(viewState.assignmentPrice)}" required />
      </label>
      <button type="submit">Registra Acquisto</button>
      <p class="purchase-context" data-purchase-context aria-live="polite">Seleziona una Squadra per vedere budget e capienza del ruolo.</p>
      ${operationError ? `<p class="errors" role="alert">${escapeHtml(operationError)}</p>` : ""}
    </form>
  `;
}

function renderCorrectionForm(
  auction: Readonly<ActiveAuction>,
  draft: CorrectionDraft,
  operationError: string,
  mobile = false,
): string {
  return `
    <form
      class="purchase-panel"
      data-correction-form
      aria-label="Correzione${mobile ? " mobile" : ""} dell’acquisto ${escapeHtml(draft.playerName)}"
    >
      <h4>Correzione dell’acquisto</h4>
      <label>Squadra
        <select name="teamId" required>
          ${auction.teams.map((team) => `
            <option value="${escapeHtml(team.id)}" ${draft.teamId === team.id ? "selected" : ""}>${escapeHtml(team.name)}</option>
          `).join("")}
        </select>
      </label>
      <label>Prezzo finale
        <input name="finalPrice" type="number" min="1" step="1" value="${escapeHtml(draft.price)}" required />
      </label>
      <button type="submit">Salva Correzione dell’acquisto</button>
      ${operationError ? `<p class="errors" role="alert">${escapeHtml(operationError)}</p>` : ""}
    </form>
  `;
}

function renderAuctionCardShortlist(player: Player, state: Readonly<AppState>): string {
  if (state.shortlistCategories.length === 0) {
    return '<p class="auction-shortlist-empty">Nessuna categoria disponibile. <button type="button" class="link-button" data-manage-shortlist>Crea categoria</button></p>';
  }
  const isShortlisted = state.shortlistCategories.some(
    (category) => category.playerNames.includes(player.name),
  );
  return `
    <section class="auction-shortlist" aria-labelledby="auction-shortlist-title">
      <h4 id="auction-shortlist-title">Shortlist</h4>
      ${isShortlisted ? '<span class="shortlist-status">In Shortlist</span>' : ""}
      <div>${state.shortlistCategories.map((category) => `
        <label>
          <input
            type="checkbox"
            data-shortlist-association
            data-player-name="${escapeHtml(player.name)}"
            data-category-name="${escapeHtml(category.name)}"
            ${category.playerNames.includes(player.name) ? "checked" : ""}
          />
          ${escapeHtml(category.name)}
        </label>
      `).join("")}</div>
    </section>
  `;
}

function renderImmediateAlternatives(player: Player, state: Readonly<AppState>): string {
  const alternatives = availablePlayers(state)
    .filter((candidate) =>
      candidate.name !== player.name
      && candidate.role === player.role
      && candidate.slot === player.slot
    )
    .sort(compareByPfcThenName)
    .slice(0, 3);

  return `
    <section class="alternatives" aria-labelledby="alternatives-title">
      <h4 id="alternatives-title">Alternative immediate</h4>
      ${alternatives.length > 0
        ? `<ul aria-label="Alternative immediate">${alternatives.map((alternative) => {
            const categories = state.shortlistCategories
              .filter((category) => category.playerNames.includes(alternative.name))
              .map((category) => category.name);
            const shortlist = categories.length > 0
              ? ` · ${categories.map(escapeHtml).join(" · ")}`
              : "";
            return `<li><button type="button" class="alternative-button" data-call-player="${escapeHtml(alternative.name)}">${escapeHtml(alternative.name)} · ${escapeHtml(alternative.team)} · PFC ${numberFormatter.format(Math.round(alternative.pfc))}${shortlist}</button></li>`;
          }).join("")}</ul>`
        : "<p>Nessun altro disponibile nello stesso Ruolo e Slot.</p>"}
    </section>
  `;
}

function availablePlayers(state: Readonly<AppState>): Player[] {
  const purchased = new Set(state.auction?.purchases.map((purchase) => purchase.playerName) ?? []);
  return state.catalog.filter((player) => !purchased.has(player.name));
}

function renderActiveHeader(
  state: Readonly<AppState>,
  auction: Readonly<ActiveAuction>,
  viewState: AuctionViewState,
): string {
  const mainTeam = auction.teams.find((team) => team.isMain)!;
  const occupiedSlots = auction.purchases.filter(
    (purchase) => purchase.teamId === mainTeam.id,
  ).length;
  const totalSlots = Object.values(auction.configuration.rosterSlots)
    .reduce((total, slots) => total + slots, 0);
  const selectedPlayer = state.catalog.find(
    (player) => player.name === viewState.selectedPlayerName,
  );
  return `
    <header class="topbar active-topbar" role="banner">
      <div class="topbar-primary">
        <div class="brand"><span class="brand-mark" aria-hidden="true">F</span>Asta Fantacalcio</div>
        ${renderPrimaryNavigation(viewState, true, true)}
        ${renderThemeToggle()}
      </div>
      <div class="auction-command-bar">
        <form class="player-search header-player-search" data-player-search>
          <label>
            <span class="visually-hidden">Cerca il Calciatore chiamato</span>
            <input
              name="playerName"
              list="player-names"
              placeholder="Nome del calciatore"
              aria-keyshortcuts="/"
              value="${escapeHtml(viewState.playerSearchQuery || selectedPlayer?.name || "")}"
              ${viewState.playerSearchError ? 'aria-describedby="player-search-error" aria-invalid="true"' : ""}
              required
            />
          </label>
          <datalist id="player-names">${state.catalog.slice(0, 20).map(
            (player) => `<option value="${escapeHtml(player.name)}"></option>`,
          ).join("")}</datalist>
          <button type="submit">Apri Scheda d’asta</button>
          ${viewState.playerSearchError
            ? `<p class="inline-error" id="player-search-error" role="alert">${escapeHtml(viewState.playerSearchError)}</p>`
            : ""}
        </form>
        <div class="compact-team-summary" role="group" aria-label="Riepilogo ${escapeHtml(mainTeam.name)}">
          <strong>${escapeHtml(mainTeam.name)}</strong>
          <span>${numberFormatter.format(remainingTeamBudget(auction, mainTeam.id))} crediti residui</span>
          <span>${occupiedSlots}/${totalSlots} posti</span>
        </div>
        <span class="session-status" role="status">${isAuctionComplete(auction, state.catalog) ? "Asta completa" : "Asta avviata"}</span>
      </div>
    </header>
  `;
}

function renderPrimaryNavigation(
  viewState: AuctionViewState,
  hasCatalog: boolean,
  hasAuction: boolean,
): string {
  const links: Array<{
    view: ActiveView;
    label: string;
    enabled: boolean;
    unavailableReason?: string;
  }> = [
    {
      view: "auction",
      label: "Asta",
      enabled: hasCatalog,
      unavailableReason: "disponibile dopo l’importazione del Catalogo",
    },
    {
      view: "my-team",
      label: "La mia rosa",
      enabled: hasAuction,
      unavailableReason: "disponibile dopo l’avvio dell’Asta",
    },
    {
      view: "teams",
      label: "Squadre",
      enabled: hasAuction,
      unavailableReason: "disponibile dopo l’avvio dell’Asta",
    },
    { view: "catalog", label: "Catalogo", enabled: true },
    { view: "backup", label: "Backup", enabled: true },
  ];

  return `
    <nav class="primary-navigation" aria-label="Navigazione primaria">
      ${links.map(({ view, label, enabled, unavailableReason }) => enabled
        ? `<a href="#${view}" data-auction-view="${view}" ${viewState.activeView === view ? 'aria-current="page"' : ""}>${label}</a>`
        : `<span aria-disabled="true" aria-label="${label}: ${unavailableReason}">${label}</span>`
      ).join("")}
    </nav>
  `;
}

function renderHeader(viewState?: AuctionViewState, hasCatalog = false): string {
  const auctionButton = hasCatalog ? "" : '<button type="button" disabled>Avvia asta</button>';
  return `
    <header class="topbar">
      <div class="brand"><span class="brand-mark" aria-hidden="true">F</span>Asta Fantacalcio</div>
      ${viewState ? renderPrimaryNavigation(viewState, hasCatalog, false) : ""}
      ${renderThemeToggle()}
      ${auctionButton}
    </header>
  `;
}

function renderThemeToggle(): string {
  const light = document.documentElement.dataset.theme === "light";
  return `<button type="button" class="theme-toggle icon-button" data-theme-toggle aria-label="${light ? "Usa tema scuro" : "Usa tema chiaro"}">${renderTablerIcon(light ? "moon" : "sun")}</button>`;
}

function renderTablerIcon(icon: TablerIcon): string {
  return `<svg class="icon" aria-hidden="true" focusable="false"><use href="/assets/tabler-icons.svg#tabler-${icon}"></use></svg>`;
}
