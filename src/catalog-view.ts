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
const numberFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
type OperationTarget = "import" | "configuration" | "shortlist";

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
  render(root, new CatalogApplication(new BrowserStateStorage()));
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
  errors: ImportError[] = [],
  notice = "",
  operationError = "",
  operationTarget: OperationTarget = "import",
): void {
  const state = application.observe();
  root.innerHTML = state
    ? state.auction
      ? renderActiveAuction(state, state.auction, notice, operationError, operationTarget)
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
    if (result.status === "started") render(root, application);
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
        [],
        result.status === "updated" ? "Categoria eliminata." : "",
        result.status === "invalid" ? result.error : "",
        "shortlist",
      );
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
  notice: string,
  operationError: string,
  operationTarget: OperationTarget,
): string {
  const configuration = auction.configuration;
  return `
    <div class="shell shell-wide">
      ${renderHeader(false, true)}
      <section class="active-heading">
        <p class="eyebrow">Sessione in corso</p>
        <h1>Asta attiva</h1>
        <p>Le regole strutturali sono bloccate. I nomi delle Squadre restano modificabili.</p>
      </section>
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

function renderHeader(canStartAuction = false, auctionStarted = false): string {
  return `
    <header class="topbar">
      <div class="brand"><span class="brand-mark" aria-hidden="true">F</span>Asta Fantacalcio</div>
      <button type="submit" ${canStartAuction ? 'form="auction-setup"' : "disabled"}>${auctionStarted ? "Asta avviata" : "Avvia asta"}</button>
    </header>
  `;
}
