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
type OperationTarget = "import" | "configuration" | "shortlist" | "purchase" | "backup" | "persistence";
type RankingSort = "pfc" | "slot" | "pma" | "expectedFantamedia" | "expectedTitolarita";
type ActiveView = "auction" | "my-team" | "teams";
type CorrectionDraft = { playerName: string; teamId: string; price: string };
type AuctionViewState = {
  activeView: ActiveView;
  selectedPlayerName: string | null;
  selectedRole: ClassicRole;
  rankingSort: RankingSort;
  shortlistCategory: string;
  showPurchasedShortlist: boolean;
  assignmentOpen: boolean;
  assignmentTeamId: string;
  assignmentPrice: string;
  correctionDraft: CorrectionDraft | null;
};

const catalogColumns: Array<{
  label: string;
  rowHeader?: boolean;
  render: (player: Player) => string;
}> = [
  { label: "Nome", rowHeader: true, render: (player) => escapeHtml(player.name) },
  { label: "Squadra reale", render: (player) => escapeHtml(player.team) },
  { label: "Ruolo", render: (player) => `<span class="role">${roleNames[player.role]}</span>` },
  { label: "Slot", render: (player) => String(player.slot) },
  { label: "PMA", render: (player) => numberFormatter.format(player.pma) },
  { label: "PFC", render: (player) => numberFormatter.format(player.pfc) },
  { label: "Fantamedia prevista", render: (player) => numberFormatter.format(player.expectedFantamedia) },
  { label: "Titolarità prevista", render: (player) => `${numberFormatter.format(player.expectedTitolarita)}%` },
];

export function mountCatalogApp(root: HTMLElement): void {
  render(root, new CatalogApplication(new BrowserStateStorage()), {
    activeView: "auction",
    selectedPlayerName: null,
    selectedRole: "P",
    rankingSort: "pfc",
    shortlistCategory: "",
    showPurchasedShortlist: false,
    assignmentOpen: false,
    assignmentTeamId: "",
    assignmentPrice: "",
    correctionDraft: null,
  });
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

function renderBackupManager(hasState: boolean, notice = "", error = ""): string {
  return `
    <section class="card backup-manager" aria-labelledby="backup-title">
      <div>
        <p class="eyebrow">Trasferimento manuale</p>
        <h2 id="backup-title">Backup locale</h2>
        <p>Esporta o ripristina l’intero stato con un unico file. Non è una sincronizzazione automatica.</p>
        <p>Il salvataggio automatico vale sullo stesso dispositivo, browser e profilo in navigazione normale.</p>
        <button type="button" data-export-backup ${hasState ? "" : "disabled"}>Esporta Backup locale</button>
      </div>
      <form data-backup-form>
        <label class="file-label">
          Seleziona Backup locale
          <input name="backup" type="file" accept=".json,application/json" required />
        </label>
        <button type="submit">Ripristina Backup locale</button>
        ${notice ? `<p class="notice" role="status">${escapeHtml(notice)}</p>` : ""}
        ${error ? `<p class="errors" role="alert">${escapeHtml(error)}</p>` : ""}
      </form>
    </section>
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
      : renderCatalog(state, errors, notice, operationError, operationTarget)
    : renderEmpty(
        errors,
        operationTarget === "backup" ? notice : "",
        operationTarget === "backup" ? operationError : "",
        operationTarget === "import" ? operationError : "",
      );
  root.innerHTML = `${persistence.status === "recovered"
    ? `<p class="persistence-warning" role="status">${escapeHtml(persistence.notice)}</p>`
    : ""}${content}`;

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
      viewState.activeView = "auction";
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
  playerSearch?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = readText(playerSearch, "playerName").trim().toLocaleLowerCase("it-IT");
    const player = state?.catalog.find(
      (candidate) => candidate.name.toLocaleLowerCase("it-IT") === query,
    );
    if (!player) return;
    viewState.activeView = "auction";
    viewState.selectedPlayerName = player.name;
    viewState.selectedRole = player.role;
    resetAssignmentDraft(viewState);
    render(root, application, viewState);
  });

  root.querySelectorAll<HTMLAnchorElement>("[data-auction-view]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      viewState.activeView = link.dataset.auctionView as ActiveView;
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
      render(root, application, viewState);
    });
  });

  root.querySelector<HTMLSelectElement>("[data-ranking-sort]")
    ?.addEventListener("change", (event) => {
      viewState.rankingSort = (event.currentTarget as HTMLSelectElement).value as RankingSort;
      render(root, application, viewState);
    });

  root.querySelector<HTMLSelectElement>("[data-shortlist-filter]")
    ?.addEventListener("change", (event) => {
      viewState.shortlistCategory = (event.currentTarget as HTMLSelectElement).value;
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
      resetAssignmentDraft(viewState);
      render(root, application, viewState);
    });
  });

  root.querySelector<HTMLButtonElement>("[data-open-purchase]")?.addEventListener("click", () => {
    resetAssignmentDraft(viewState);
    viewState.assignmentOpen = true;
    render(root, application, viewState);
  });

  const purchaseForm = root.querySelector<HTMLFormElement>("[data-purchase-form]");
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

  const correctionForm = root.querySelector<HTMLFormElement>("[data-correction-form]");
  correctionForm?.addEventListener("submit", (event) => {
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
  errors: ImportError[],
  backupNotice: string,
  backupError: string,
  importError: string,
): string {
  return `
    <div class="shell">
      ${renderHeader()}
      <section class="import-layout" aria-labelledby="import-title">
        <div>
          <p class="eyebrow">Primo passo</p>
          <h1 id="import-title">Importa il Catalogo calciatori</h1>
          <p class="lede">Carica il CSV completo del provider. Il file viene controllato per intero prima di essere salvato sul dispositivo.</p>
        </div>
        ${renderImportForm(errors, false, "", importError)}
      </section>
      ${renderBackupManager(false, backupNotice, backupError)}
    </div>
  `;
}

function renderCatalog(
  state: Readonly<AppState>,
  errors: ImportError[],
  notice: string,
  operationError: string,
  operationTarget: OperationTarget,
): string {
  const setup = state.auctionSetup;
  const configuration = setup?.configuration;
  const teams = setup?.teams ?? [];
  const teamCount = configuration?.teamCount ?? 8;
  return `
    <div class="shell shell-wide">
      ${renderHeader(true)}
      ${renderBackupManager(
        true,
        operationTarget === "backup" ? notice : "",
        operationTarget === "backup" ? operationError : "",
      )}
      <section class="catalog-heading">
        <div>
          <p class="eyebrow">Catalogo pronto</p>
          <h1>Catalogo calciatori</h1>
          <p class="catalog-count">${state.catalog.length} calciatori disponibili</p>
        </div>
        <details class="replace-panel" ${errors.length > 0 || operationTarget === "import" && (notice || operationError) ? "open" : ""}>
          <summary>Sostituisci Catalogo calciatori</summary>
          ${renderImportForm(
            errors,
            true,
            operationTarget === "import" ? notice : "",
            operationTarget === "import" ? operationError : "",
          )}
        </details>
      </section>
      <form class="card auction-setup" id="auction-setup">
        <div>
          <p class="eyebrow">Passo successivo</p>
          <h2>Configura l’Asta attiva</h2>
          <p>Definisci le regole comuni e assegna un nome alla tua Squadra principale.</p>
          ${operationTarget === "configuration" && notice ? `<p class="notice" role="status">${escapeHtml(notice)}</p>` : ""}
          ${operationTarget === "configuration" && operationError ? `<p class="errors" role="alert">${escapeHtml(operationError)}</p>` : ""}
        </div>
        <div class="setup-fields">
          <label>Numero di Squadre<input name="teamCount" type="number" min="2" value="${teamCount}" required /></label>
          <label>Budget iniziale comune<input name="initialBudget" type="number" min="1" value="${configuration?.initialBudget ?? 1000}" required /></label>
          <label>Posti POR<input name="slotsP" type="number" min="1" value="${configuration?.rosterSlots.P ?? 3}" required /></label>
          <label>Posti DIF<input name="slotsD" type="number" min="1" value="${configuration?.rosterSlots.D ?? 8}" required /></label>
          <label>Posti CEN<input name="slotsC" type="number" min="1" value="${configuration?.rosterSlots.C ?? 8}" required /></label>
          <label>Posti ATT<input name="slotsA" type="number" min="1" value="${configuration?.rosterSlots.A ?? 6}" required /></label>
          <label>Soglia di adattamento<input name="adaptationThreshold" type="number" min="1" value="${configuration?.adaptationThreshold ?? 3}" required /></label>
          <label>Tolleranza della Percezione storica di mercato (%)<input name="historicalMarketPerceptionTolerance" type="number" min="0" value="${configuration?.historicalMarketPerceptionTolerance ?? 5}" required /></label>
          <label>Nome della Squadra principale<input name="mainTeamName" value="${escapeHtml(teams.find((team) => team.isMain)?.name ?? "")}" required /></label>
          <div class="opponent-fields" data-opponent-fields>${renderOpponentFields(
            teamCount,
            teams.filter((team) => !team.isMain).map((team) => team.name),
          )}</div>
        </div>
      </form>
      ${renderShortlistManager(
        state,
        operationTarget === "shortlist" ? notice : "",
        operationTarget === "shortlist" ? operationError : "",
      )}
      ${renderCatalogTable(state)}
    </div>
  `;
}

function renderCatalogTable(
  state: Readonly<AppState>,
  viewState?: AuctionViewState,
  operationError = "",
): string {
  const showAvailability = Boolean(state.auction);
  return `
    <div class="table-frame">
      <table>
        <thead><tr>${catalogColumns.map((column) => `<th>${column.label}</th>`).join("")}<th>Shortlist</th>${showAvailability ? "<th>Stato</th>" : ""}</tr></thead>
        <tbody>${state.catalog.map((player) => {
          const purchase = state.auction?.purchases.find(
            (candidate) => candidate.playerName === player.name,
          );
          const team = purchase
            ? state.auction?.teams.find((candidate) => candidate.id === purchase.teamId)
            : undefined;
          const availability = purchase
            ? `Acquistato · ${escapeHtml(team?.name ?? "Squadra non disponibile")} · ${purchase.finalPrice} crediti
              <button type="button" data-edit-purchase="${escapeHtml(player.name)}" aria-label="Correggi Acquisto ${escapeHtml(player.name)}">Correggi</button>
              <button type="button" data-cancel-purchase="${escapeHtml(player.name)}" aria-label="Annulla Acquisto ${escapeHtml(player.name)}">Annulla</button>
              ${viewState?.correctionDraft?.playerName === player.name
                ? renderCorrectionForm(state.auction!, viewState.correctionDraft, operationError)
                : ""}`
            : "Disponibile";
          return `
            <tr>${catalogColumns.map((column) => column.rowHeader
              ? `<th scope="row">${column.render(player)}</th>`
              : `<td>${column.render(player)}</td>`
            ).join("")}<td>${renderPlayerShortlist(player, state)}</td>${showAvailability ? `<td>${availability}</td>` : ""}</tr>
          `;
        }).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderPlayerShortlist(player: Player, state: Readonly<AppState>): string {
  const memberships = state.shortlistCategories.filter(
    (category) => category.playerNames.includes(player.name),
  );
  if (state.shortlistCategories.length === 0) return "Crea una categoria";

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
            aria-label="${escapeHtml(player.name)} · ${escapeHtml(category.name)}"
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
    return `
      <div class="shell shell-wide">
        ${renderActiveHeader(state, auction, viewState)}
        ${renderBackupManager(
          true,
          operationTarget === "backup" ? notice : "",
          operationTarget === "backup" ? operationError : "",
        )}
        ${viewState.activeView === "my-team"
          ? renderMyRoster(state, auction)
          : renderOpponentTeams(state, auction)}
      </div>
    `;
  }
  return `
    <div class="shell shell-wide">
      ${renderActiveHeader(state, auction, viewState)}
      ${renderBackupManager(
        true,
        operationTarget === "backup" ? notice : "",
        operationTarget === "backup" ? operationError : "",
      )}
      <section class="active-heading">
        <p class="eyebrow">${auctionComplete ? "Sessione completata" : "Sessione in corso"}</p>
        <h1>Asta</h1>
        <h2>${auctionComplete ? "Asta completa" : "Asta attiva"}</h2>
        <p>${auctionComplete
          ? "Tutte le Squadre hanno occupato i Posti di ruolo configurati."
          : "Le regole strutturali sono bloccate. I nomi delle Squadre restano modificabili."}</p>
        <div class="catalog-replacement-blocked">
          <button type="button" disabled>Sostituisci Catalogo calciatori</button>
          <p>Per sostituire il Catalogo calciatori devi prima eseguire il Reset dell’asta.</p>
        </div>
      </section>
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
      <section class="catalog-heading active-catalog-heading">
        <div>
          <p class="eyebrow">Preparazione personale</p>
          <h2>Catalogo calciatori</h2>
          <p class="catalog-count">${availableCount} calciatori disponibili</p>
        </div>
      </section>
      ${renderShortlistManager(
        state,
        operationTarget === "shortlist" ? notice : "",
        operationTarget === "shortlist" ? operationError : "",
      )}
      ${renderCatalogTable(
        state,
        viewState,
        operationTarget === "purchase" ? operationError : "",
      )}
    </div>
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
        `<li><button type="button" data-call-player="${escapeHtml(player.name)}">${escapeHtml(player.name)} · ${renderRankingValue(player, viewState.rankingSort)} · Acquistato</button></li>`,
      ).join("")}</ul>
    ` : ""}
    <ol class="ranking-list" aria-label="Ranking ${roleNames[role]}">${players.map((player) =>
      `<li><button type="button" data-call-player="${escapeHtml(player.name)}">${escapeHtml(player.name)} · ${renderRankingValue(player, viewState.rankingSort)}</button></li>`,
    ).join("")}</ol>
    <h3>Scarsità per slot</h3>
    <ul class="scarcity-list" aria-label="Scarsità ${roleNames[role]}">${Array.from(
      { length: maxSlot },
      (_, index) => {
        const slot = index + 1;
        return `<li>S${slot} ${availableRolePlayers.filter((player) => player.slot === slot).length}</li>`;
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
          <h3>${escapeHtml(player.name)}</h3>
          <p>${escapeHtml(player.team)} · ${roleNames[player.role]} · Slot ${player.slot}</p>
        </div>
        <button type="button" class="secondary-button" data-close-auction-card>Chiudi Scheda d’asta</button>
      </div>
      ${unavailableToMainTeam ? '<p class="unavailable-player">Non acquistabile</p>' : ""}
      <section class="market-signals" aria-label="Segnali di mercato">
        <h4>Segnali di mercato</h4>
        <dl class="player-facts">
          <div><dt>PMA</dt><dd>${numberFormatter.format(Math.round(player.pma))}</dd></div>
          <div><dt>PFC</dt><dd>${numberFormatter.format(Math.round(player.pfc))}</dd></div>
          <div><dt>Percezione storica di mercato</dt><dd>${perception} · ${signedHistoricalMarketDifference}</dd></div>
          <div><dt>Fantamedia prevista</dt><dd>${numberFormatter.format(player.expectedFantamedia)}</dd></div>
          <div><dt>Titolarità prevista</dt><dd>${Math.round(player.expectedTitolarita)}%</dd></div>
          ${adaptation ? `
            <div><dt>Prezzo adattato all’asta</dt><dd>${numberFormatter.format(adaptation.adaptedPrice)} crediti</dd></div>
            <div><dt>Scostamento d’asta per ruolo</dt><dd>${signedAuctionDeviation}</dd></div>
            <div><dt>Osservazioni</dt><dd>${adaptation.observations} ${observationLabel}</dd></div>
          ` : "<div><dt>Prezzo adattato all’asta</dt><dd>Dati insufficienti</dd></div>"}
        </dl>
      </section>
      <button type="button" data-open-purchase>Assegna giocatore</button>
      ${viewState.assignmentOpen ? renderPurchaseForm(auction, viewState, operationError) : ""}
      ${renderAuctionCardShortlist(player, state)}
      ${renderImmediateAlternatives(player, state)}
    </article>
  `;
}

function renderPurchaseForm(
  auction: Readonly<ActiveAuction>,
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
            return `<option value="${escapeHtml(team.id)}" ${viewState.assignmentTeamId === team.id ? "selected" : ""}>${escapeHtml(team.name)}${mainTeamLabel} · ${numberFormatter.format(remainingTeamBudget(auction, team.id))} crediti</option>`;
          }).join("")}
        </select>
      </label>
      <label>Prezzo finale
        <input name="finalPrice" type="number" min="1" step="1" value="${escapeHtml(viewState.assignmentPrice)}" required />
      </label>
      <button type="submit">Registra Acquisto</button>
      ${operationError ? `<p class="errors" role="alert">${escapeHtml(operationError)}</p>` : ""}
    </form>
  `;
}

function renderCorrectionForm(
  auction: Readonly<ActiveAuction>,
  draft: CorrectionDraft,
  operationError: string,
): string {
  return `
    <form
      class="purchase-panel"
      data-correction-form
      aria-label="Correzione dell’acquisto ${escapeHtml(draft.playerName)}"
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
    return "<p>Crea una categoria della Shortlist per organizzare questo calciatore.</p>";
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
            return `<li>${escapeHtml(alternative.name)} · ${escapeHtml(alternative.team)} · PFC ${numberFormatter.format(Math.round(alternative.pfc))}${shortlist}</li>`;
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
  const links: Array<{ view: ActiveView; label: string }> = [
    { view: "auction", label: "Asta" },
    { view: "my-team", label: "La mia rosa" },
    { view: "teams", label: "Squadre" },
  ];

  return `
    <header class="topbar active-topbar" role="banner">
      <div class="brand"><span class="brand-mark" aria-hidden="true">F</span>Asta Fantacalcio</div>
      <nav class="primary-navigation" aria-label="Navigazione primaria">
        ${links.map(({ view, label }) => `
          <a href="#${view}" data-auction-view="${view}" ${viewState.activeView === view ? 'aria-current="page"' : ""}>${label}</a>
        `).join("")}
      </nav>
      <form class="player-search header-player-search" data-player-search>
        <label>
          Cerca il Calciatore chiamato
          <input name="playerName" list="player-names" value="${escapeHtml(selectedPlayer?.name ?? "")}" required />
        </label>
        <datalist id="player-names">${state.catalog.map(
          (player) => `<option value="${escapeHtml(player.name)}"></option>`,
        ).join("")}</datalist>
        <button type="submit">Apri Scheda d’asta</button>
      </form>
      <div class="compact-team-summary" role="group" aria-label="Riepilogo ${escapeHtml(mainTeam.name)}">
        <strong>${escapeHtml(mainTeam.name)}</strong>
        <span>${numberFormatter.format(remainingTeamBudget(auction, mainTeam.id))} crediti residui</span>
        <span>${occupiedSlots}/${totalSlots} posti</span>
      </div>
      <button type="button" disabled>${isAuctionComplete(auction, state.catalog) ? "Asta completa" : "Asta avviata"}</button>
    </header>
  `;
}

function renderHeader(canStartAuction = false): string {
  return `
    <header class="topbar">
      <div class="brand"><span class="brand-mark" aria-hidden="true">F</span>Asta Fantacalcio</div>
      <button type="submit" ${canStartAuction ? 'form="auction-setup"' : "disabled"}>Avvia asta</button>
    </header>
  `;
}
