import {
  CatalogApplication,
  type AppState,
  type ClassicRole,
  type ImportError,
  type Player,
} from "./catalog-application.js";
import { BrowserStateStorage } from "./browser-storage.js";

const roleNames: Record<ClassicRole, string> = { P: "POR", D: "DIF", C: "CEN", A: "ATT" };
const numberFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });

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
): void {
  const state = application.observe();
  root.innerHTML = state ? renderCatalog(state, errors, notice) : renderEmpty(errors);

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

function renderCatalog(state: Readonly<AppState>, errors: ImportError[], notice: string): string {
  return `
    <div class="shell shell-wide">
      ${renderHeader()}
      <section class="catalog-heading">
        <div>
          <p class="eyebrow">Catalogo pronto</p>
          <h1>Catalogo calciatori</h1>
          <p class="catalog-count">${state.catalog.length} calciatori disponibili</p>
        </div>
        <details class="replace-panel" ${errors.length > 0 || notice ? "open" : ""}>
          <summary>Controlla un altro CSV</summary>
          ${renderImportForm(errors, true, notice)}
        </details>
      </section>
      <div class="table-frame">
        <table>
          <thead><tr>${catalogColumns.map((column) => `<th>${column.label}</th>`).join("")}</tr></thead>
          <tbody>${state.catalog.map((player) => `
            <tr>${catalogColumns.map((column) => column.rowHeader
              ? `<th scope="row">${column.render(player)}</th>`
              : `<td>${column.render(player)}</td>`
            ).join("")}</tr>
          `).join("")}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderHeader(): string {
  return `
    <header class="topbar">
      <div class="brand"><span class="brand-mark" aria-hidden="true">F</span>Asta Fantacalcio</div>
      <button type="button" disabled>Avvia asta</button>
    </header>
  `;
}
