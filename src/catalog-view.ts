import {
  CatalogApplication,
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
type OperationTarget = "import" | "configuration" | "shortlist";
type RankingSort = "pfc" | "slot" | "pma" | "expectedFantamedia" | "expectedTitolarita";
type AuctionViewState = {
  selectedPlayerName: string | null;
  selectedRole: ClassicRole;
  rankingSort: RankingSort;
  shortlistCategory: string;
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
    selectedPlayerName: null,
    selectedRole: "P",
    rankingSort: "pfc",
    shortlistCategory: "",
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

function renderImportForm(errors: ImportError[], compact = false, notice = ""): string {
  return `
    <form class="card import-card" data-import-form>
      <h2>${compact ? "Controlla un altro CSV" : "File del provider"}</h2>
      <p>${compact ? "Verifica un file aggiornato senza modificare il Catalogo corrente." : "Il Catalogo calciatori è necessario prima di configurare l’Asta attiva."}</p>
      <label class="file-label">
        Seleziona CSV
        <input name="catalog" type="file" accept=".csv,text/csv" required />
      </label>
      <button class="import-button" type="submit">${compact ? "Controlla CSV" : "Importa catalogo"}</button>
      ${notice ? `<p class="notice" role="status">${escapeHtml(notice)}</p>` : ""}
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
  root.innerHTML = state
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
    : renderEmpty(errors);

  const form = root.querySelector<HTMLFormElement>("[data-import-form]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = form.elements.namedItem("catalog");
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;

    const result = application.importCatalog(await input.files[0].text());
    render(
      root,
      application,
      viewState,
      result.status === "invalid" ? result.errors : [],
      result.status === "checked" ? "CSV valido. Il Catalogo corrente non è stato modificato." : "",
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
    if (result.status === "started") render(root, application, viewState);
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
      result.status === "invalid" ? result.error : "",
      "configuration",
    );
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
      result.status === "invalid" ? result.error : "",
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
        result.status === "invalid" ? result.error : "",
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
        result.status === "invalid" ? result.error : "",
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
        result.status === "invalid" ? result.error : "",
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
    viewState.selectedPlayerName = player.name;
    viewState.selectedRole = player.role;
    render(root, application, viewState);
  });

  root.querySelector<HTMLButtonElement>("[data-close-auction-card]")
    ?.addEventListener("click", () => {
      viewState.selectedPlayerName = null;
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

  root.querySelectorAll<HTMLButtonElement>("[data-call-player]").forEach((button) => {
    button.addEventListener("click", () => {
      viewState.selectedPlayerName = button.dataset.callPlayer ?? null;
      render(root, application, viewState);
    });
  });
}

function readNumber(form: HTMLFormElement, name: string): number {
  const input = form.elements.namedItem(name);
  return input instanceof HTMLInputElement ? input.valueAsNumber : Number.NaN;
}

function readText(form: HTMLFormElement, name: string): string {
  const input = form.elements.namedItem(name);
  return input instanceof HTMLInputElement ? input.value : "";
}

function renderEmpty(errors: ImportError[]): string {
  return `
    <div class="shell">
      ${renderHeader()}
      <section class="import-layout" aria-labelledby="import-title">
        <div>
          <p class="eyebrow">Primo passo</p>
          <h1 id="import-title">Importa il Catalogo calciatori</h1>
          <p class="lede">Carica il CSV completo del provider. Il file viene controllato per intero prima di essere salvato sul dispositivo.</p>
        </div>
        ${renderImportForm(errors)}
      </section>
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
  return `
    <div class="shell shell-wide">
      ${renderHeader(true)}
      <section class="catalog-heading">
        <div>
          <p class="eyebrow">Catalogo pronto</p>
          <h1>Catalogo calciatori</h1>
          <p class="catalog-count">${state.catalog.length} calciatori disponibili</p>
        </div>
        <details class="replace-panel" ${errors.length > 0 || operationTarget === "import" && notice ? "open" : ""}>
          <summary>Controlla un altro CSV</summary>
          ${renderImportForm(errors, true, operationTarget === "import" ? notice : "")}
        </details>
      </section>
      <form class="card auction-setup" id="auction-setup">
        <div>
          <p class="eyebrow">Passo successivo</p>
          <h2>Configura l’Asta attiva</h2>
          <p>Definisci le regole comuni e assegna un nome alla tua Squadra principale.</p>
        </div>
        <div class="setup-fields">
          <label>Numero di Squadre<input name="teamCount" type="number" min="2" value="8" required /></label>
          <label>Budget iniziale comune<input name="initialBudget" type="number" min="1" value="1000" required /></label>
          <label>Posti POR<input name="slotsP" type="number" min="1" value="3" required /></label>
          <label>Posti DIF<input name="slotsD" type="number" min="1" value="8" required /></label>
          <label>Posti CEN<input name="slotsC" type="number" min="1" value="8" required /></label>
          <label>Posti ATT<input name="slotsA" type="number" min="1" value="6" required /></label>
          <label>Soglia di adattamento<input name="adaptationThreshold" type="number" min="1" value="3" required /></label>
          <label>Tolleranza della Percezione storica di mercato (%)<input name="historicalMarketPerceptionTolerance" type="number" min="0" value="5" required /></label>
          <label>Nome della Squadra principale<input name="mainTeamName" required /></label>
          <div class="opponent-fields" data-opponent-fields>${renderOpponentFields(8)}</div>
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

function renderCatalogTable(state: Readonly<AppState>): string {
  return `
    <div class="table-frame">
      <table>
        <thead><tr>${catalogColumns.map((column) => `<th>${column.label}</th>`).join("")}<th>Shortlist</th></tr></thead>
        <tbody>${state.catalog.map((player) => `
          <tr>${catalogColumns.map((column) => column.rowHeader
            ? `<th scope="row">${column.render(player)}</th>`
            : `<td>${column.render(player)}</td>`
          ).join("")}<td>${renderPlayerShortlist(player, state)}</td></tr>
        `).join("")}</tbody>
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
  return `
    <div class="shell shell-wide">
      ${renderHeader(false, true)}
      <section class="active-heading">
        <p class="eyebrow">Sessione in corso</p>
        <h1>Asta</h1>
        <h2>Asta attiva</h2>
        <p>Le regole strutturali sono bloccate. I nomi delle Squadre restano modificabili.</p>
      </section>
      <div class="auction-command-center">
        <section class="card" aria-label="Ranking e Scarsità">
          <h2>Ranking e Scarsità</h2>
          ${renderRankingAndScarcity(state, viewState)}
        </section>
        <section class="card" aria-label="Scheda d’asta">
          <h2>Scheda d’asta</h2>
          ${renderAuctionCard(state, auction, viewState)}
        </section>
        <section class="card main-team-summary" aria-label="${escapeHtml(mainTeam.name)}">
          <h2>${escapeHtml(mainTeam.name)}</h2>
          <p>Budget residuo: ${numberFormatter.format(configuration.initialBudget)} crediti</p>
          <ul>${Object.entries(roleNames).map(([role, name]) => `
            <li data-main-team-role>${name} 0/${configuration.rosterSlots[role as ClassicRole]}</li>
          `).join("")}</ul>
        </section>
      </div>
      <form class="card auction-setup" id="auction-configuration">
        <div>
          <h2>Configurazione d’asta</h2>
          <p>Un’unica sessione locale, senza storico di aste.</p>
          <button type="submit">Salva Configurazione d’asta</button>
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
          <p class="catalog-count">${state.catalog.length} calciatori disponibili</p>
        </div>
      </section>
      ${renderShortlistManager(
        state,
        operationTarget === "shortlist" ? notice : "",
        operationTarget === "shortlist" ? operationError : "",
      )}
      ${renderCatalogTable(state)}
    </div>
  `;
}

function renderRankingAndScarcity(
  state: Readonly<AppState>,
  viewState: AuctionViewState,
): string {
  const role = viewState.selectedRole;
  const allRolePlayers = state.catalog.filter((player) => player.role === role);
  const selectedCategory = state.shortlistCategories.find(
    (category) => category.name === viewState.shortlistCategory,
  );
  const players = allRolePlayers
    .filter((player) => !selectedCategory || selectedCategory.playerNames.includes(player.name))
    .sort((left, right) => compareRankedPlayers(left, right, viewState.rankingSort));
  const maxSlot = Math.max(0, ...allRolePlayers.map((player) => player.slot));

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
    <ol class="ranking-list" aria-label="Ranking ${roleNames[role]}">${players.map((player) =>
      `<li><button type="button" data-call-player="${escapeHtml(player.name)}">${escapeHtml(player.name)} · ${renderRankingValue(player, viewState.rankingSort)}</button></li>`,
    ).join("")}</ol>
    <h3>Scarsità per slot</h3>
    <ul class="scarcity-list" aria-label="Scarsità ${roleNames[role]}">${Array.from(
      { length: maxSlot },
      (_, index) => {
        const slot = index + 1;
        return `<li>S${slot} ${allRolePlayers.filter((player) => player.slot === slot).length}</li>`;
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
): string {
  const player = state.catalog.find((candidate) => candidate.name === viewState.selectedPlayerName);
  const search = `
    <form class="player-search" data-player-search>
      <label>
        Cerca il Calciatore chiamato
        <input name="playerName" list="player-names" value="${escapeHtml(player?.name ?? "")}" required />
      </label>
      <datalist id="player-names">${state.catalog.map(
        (candidate) => `<option value="${escapeHtml(candidate.name)}"></option>`,
      ).join("")}</datalist>
      <button type="submit">Apri Scheda d’asta</button>
    </form>
  `;
  if (!player) {
    return `${search}<p>Cerca il Calciatore chiamato per aprire la scheda temporanea.</p>`;
  }

  const historicalMarketDifferencePercent = (player.pma - player.pfc) / player.pfc * 100;
  const tolerance = auction.configuration.historicalMarketPerceptionTolerance;
  const perception = historicalMarketDifferencePercent > tolerance
    ? "In hype"
    : historicalMarketDifferencePercent < -tolerance
      ? "Sottovalutato"
      : "In linea";
  const signedHistoricalMarketDifference = `${historicalMarketDifferencePercent > 0 ? "+" : ""}${Math.round(historicalMarketDifferencePercent)}%`;

  return `
    ${search}
    <article class="auction-card">
      <div class="auction-card-heading">
        <div>
          <h3>${escapeHtml(player.name)}</h3>
          <p>${escapeHtml(player.team)} · ${roleNames[player.role]} · Slot ${player.slot}</p>
        </div>
        <button type="button" class="secondary-button" data-close-auction-card>Chiudi Scheda d’asta</button>
      </div>
      <dl class="player-facts">
        <div><dt>PMA</dt><dd>${numberFormatter.format(Math.round(player.pma))}</dd></div>
        <div><dt>PFC</dt><dd>${numberFormatter.format(Math.round(player.pfc))}</dd></div>
        <div><dt>Percezione storica di mercato</dt><dd>${perception} · ${signedHistoricalMarketDifference}</dd></div>
        <div><dt>Fantamedia prevista</dt><dd>${numberFormatter.format(player.expectedFantamedia)}</dd></div>
        <div><dt>Titolarità prevista</dt><dd>${Math.round(player.expectedTitolarita)}%</dd></div>
      </dl>
      ${renderAuctionCardShortlist(player, state)}
      ${renderImmediateAlternatives(player, state)}
    </article>
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
  const alternatives = state.catalog
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

function renderHeader(canStartAuction = false, auctionStarted = false): string {
  return `
    <header class="topbar">
      <div class="brand"><span class="brand-mark" aria-hidden="true">F</span>Asta Fantacalcio</div>
      <button type="submit" ${canStartAuction ? 'form="auction-setup"' : "disabled"}>${auctionStarted ? "Asta avviata" : "Avvia asta"}</button>
    </header>
  `;
}
