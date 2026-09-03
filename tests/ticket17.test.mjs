import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";
import { startServer } from "../scripts/serve.mjs";

let browser;
let server;

test.before(async () => {
  server = await startServer(process.cwd());
  browser = await chromium.launch({ channel: "chrome", headless: true });
});

test.after(async () => {
  await browser?.close();
  await server?.close();
});

async function openActiveAuction({ goalkeeperSlots, shortlistedPlayer } = {}) {
  const page = await browser.newPage();
  await page.goto(server.url);
  await page.getByLabel("Seleziona CSV").setInputFiles(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
  );
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("32 calciatori disponibili").waitFor({ state: "visible" });
  if (shortlistedPlayer) {
    await page.locator("summary").filter({ hasText: "Gestisci Shortlist" }).click();
    await page.getByLabel("Nuova categoria").fill("Osservati");
    await page.getByRole("button", { name: "Crea categoria" }).click();
    await page.getByLabel(`${shortlistedPlayer} · Osservati`).check();
  }
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  if (goalkeeperSlots) {
    await page.getByLabel("Posti POR").fill(String(goalkeeperSlots));
  }
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  return page;
}

async function openView(page, name) {
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name })
    .click();
}

async function openPlayer(page, playerName) {
  await page.getByLabel("Cerca il Calciatore chiamato").fill(playerName);
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
}

async function assignPlayer(page, playerName, teamId, finalPrice) {
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  await openPlayer(page, playerName);
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption(teamId);
  await card.getByLabel("Prezzo finale").fill(String(finalPrice));
  await card.getByRole("button", { name: "Registra Acquisto" }).click();
}

test("la Correzione dell'acquisto è precompilata e aggiorna Squadra, prezzo, budget e rosa insieme", async () => {
  const page = await openActiveAuction();
  await assignPlayer(page, "GIOCATORE_D_01", "opponent-2", 157);
  await openView(page, "Catalogo");

  const row = page.getByRole("row", { name: /GIOCATORE_D_01/ });
  await row.getByRole("button", { name: "Correggi Acquisto GIOCATORE_D_01" }).click();

  const correction = row.getByRole("form", { name: "Correzione dell’acquisto GIOCATORE_D_01" });
  assert.equal(await correction.getByLabel("Squadra").inputValue(), "opponent-2");
  assert.equal(await correction.getByLabel("Prezzo finale").inputValue(), "157");
  assert.equal(await correction.getByLabel(/calciatore/i).count(), 0);

  await correction.getByLabel("Squadra").selectOption("main");
  await correction.getByLabel("Prezzo finale").fill("120");
  await correction.getByRole("button", { name: "Salva Correzione dell’acquisto" }).click();

  assert.match(await row.innerText(), /Acquistato · I Falchi · 120 crediti/);
  await openView(page, "Asta");
  const mainTeam = page.getByRole("region", { name: "I Falchi" });
  assert.equal(await mainTeam.getByText("Budget residuo: 880 crediti").isVisible(), true);
  assert.equal(await mainTeam.getByText("DIF 1/8").isVisible(), true);
  assert.equal(await mainTeam.getByText("GIOCATORE_D_01 · 120 crediti").isVisible(), true);
  assert.equal(
    await page.getByRole("list", { name: "Scarsità DIF" }).locator('[aria-label="Slot 1: 0 disponibili"]').isVisible(),
    true,
  );

  await page.reload();
  await openView(page, "Catalogo");
  assert.match(await page.getByRole("row", { name: /GIOCATORE_D_01/ }).innerText(), /I Falchi · 120 crediti/);

  await page.close();
});

test("la validazione non conta due volte l'Acquisto e una Correzione invalida conserva originale e valori inseriti", async () => {
  const page = await openActiveAuction({ goalkeeperSlots: 1 });
  await assignPlayer(page, "GIOCATORE_P_01", "main", 100);
  await assignPlayer(page, "GIOCATORE_P_02", "opponent-2", 40);
  await openView(page, "Catalogo");

  const row = page.getByRole("row", { name: /GIOCATORE_P_01/ });
  await row.getByRole("button", { name: "Correggi Acquisto GIOCATORE_P_01" }).click();
  let correction = row.getByRole("form", { name: "Correzione dell’acquisto GIOCATORE_P_01" });
  await correction.getByRole("button", { name: "Salva Correzione dell’acquisto" }).click();
  assert.match(await row.innerText(), /Acquistato · I Falchi · 100 crediti/);

  await row.getByRole("button", { name: "Correggi Acquisto GIOCATORE_P_01" }).click();
  correction = row.getByRole("form", { name: "Correzione dell’acquisto GIOCATORE_P_01" });
  await correction.getByLabel("Squadra").selectOption("opponent-2");
  await correction.getByLabel("Prezzo finale").fill("50");
  await correction.getByRole("button", { name: "Salva Correzione dell’acquisto" }).click();

  assert.match(await correction.getByRole("alert").innerText(), /non ha Posti di ruolo liberi per POR/i);
  assert.equal(await correction.getByLabel("Squadra").inputValue(), "opponent-2");
  assert.equal(await correction.getByLabel("Prezzo finale").inputValue(), "50");
  assert.match(await row.innerText(), /Acquistato · I Falchi · 100 crediti/);
  await openView(page, "Asta");
  assert.equal(
    await page.getByRole("region", { name: "I Falchi" }).getByText("Budget residuo: 900 crediti").isVisible(),
    true,
  );
  await openView(page, "Catalogo");

  await correction.getByLabel("Squadra").selectOption("main");
  await correction.getByLabel("Prezzo finale").fill("90");
  await correction.getByRole("button", { name: "Salva Correzione dell’acquisto" }).click();
  assert.match(await row.innerText(), /Acquistato · I Falchi · 90 crediti/);

  await openView(page, "Asta");
  await page.close();
});

test("la Correzione dell'acquisto ricalcola il Prezzo adattato all'asta dagli Acquisti attivi", async () => {
  const page = await openActiveAuction();
  await assignPlayer(page, "GIOCATORE_D_01", "opponent-2", 157);
  await assignPlayer(page, "GIOCATORE_D_02", "opponent-3", 55);
  await assignPlayer(page, "GIOCATORE_D_03", "opponent-4", 76);
  await openPlayer(page, "GIOCATORE_D_04");

  const signals = page.getByRole("region", { name: "Segnali di mercato" });
  assert.equal(await signals.getByText("24 crediti", { exact: true }).isVisible(), true);
  assert.equal(await signals.getByText("+16%", { exact: true }).isVisible(), true);

  await openView(page, "Catalogo");
  const row = page.getByRole("row", { name: /GIOCATORE_D_02/ });
  await row.getByRole("button", { name: "Correggi Acquisto GIOCATORE_D_02" }).click();
  const correction = row.getByRole("form", { name: "Correzione dell’acquisto GIOCATORE_D_02" });
  await correction.getByLabel("Prezzo finale").fill("10");
  await correction.getByRole("button", { name: "Salva Correzione dell’acquisto" }).click();

  await openView(page, "Asta");
  assert.equal(await signals.getByText("22 crediti", { exact: true }).isVisible(), true);
  assert.equal(await signals.getByText("+10%", { exact: true }).isVisible(), true);
  assert.equal(await signals.getByText("3 Acquisti", { exact: true }).isVisible(), true);

  await page.close();
});

test("la Shortlist nasconde gli acquistati per impostazione predefinita e può mostrarli senza perdere le categorie", async () => {
  const page = await openActiveAuction({ shortlistedPlayer: "GIOCATORE_D_01" });
  await assignPlayer(page, "GIOCATORE_D_01", "opponent-2", 157);

  const ranking = page.getByRole("list", { name: "Ranking DIF" });
  await page.getByLabel("Filtra per categoria").selectOption({ label: "Osservati" });
  assert.equal(await ranking.getByRole("listitem").count(), 0);
  await openView(page, "Catalogo");
  assert.equal(
    await page.getByRole("row", { name: /GIOCATORE_D_01/ }).getByLabel("GIOCATORE_D_01 · Osservati").isChecked(),
    true,
  );

  await openView(page, "Asta");
  await page.getByLabel("Mostra anche gli acquistati nella Shortlist").check();
  assert.equal(
    (await page.getByRole("list", { name: "Acquistati nella Shortlist" }).getByRole("listitem").innerText()).replace(/\s+/g, " "),
    "GIOCATORE_D_01 · PFC 143 · Acquistato",
  );
  assert.equal(await ranking.getByRole("listitem").count(), 0);

  await openView(page, "Catalogo");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("row", { name: /GIOCATORE_D_01/ })
    .getByRole("button", { name: "Annulla Acquisto GIOCATORE_D_01" })
    .click();

  await openView(page, "Asta");
  assert.equal(
    (await ranking.getByRole("listitem").innerText()).replace(/\s+/g, " "),
    "GIOCATORE_D_01 · PFC 143",
  );
  await openView(page, "Catalogo");
  assert.equal(
    await page.getByRole("row", { name: /GIOCATORE_D_01/ }).getByLabel("GIOCATORE_D_01 · Osservati").isChecked(),
    true,
  );

  await page.close();
});

test("l'annullamento richiede conferma, restituisce il calciatore e ricalcola subito il campione", async () => {
  const page = await openActiveAuction();
  await assignPlayer(page, "GIOCATORE_C_01", "opponent-3", 147);
  await assignPlayer(page, "GIOCATORE_C_02", "opponent-7", 67);
  await assignPlayer(page, "GIOCATORE_C_03", "opponent-3", 48);
  await openPlayer(page, "GIOCATORE_C_04");

  const signals = page.getByRole("region", { name: "Segnali di mercato" });
  assert.equal(await signals.getByText("3 Acquisti", { exact: true }).isVisible(), true);

  await openView(page, "Catalogo");
  const row = page.getByRole("row", { name: /GIOCATORE_C_03/ });
  let message = "";
  page.once("dialog", async (dialog) => {
    message = dialog.message();
    await dialog.dismiss();
  });
  await row.getByRole("button", { name: "Annulla Acquisto GIOCATORE_C_03" }).click();
  assert.match(message, /annullare l’Acquisto di GIOCATORE_C_03/i);
  assert.match(await row.innerText(), /Acquistato · Squadra 3 · 48 crediti/);

  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Annulla Acquisto GIOCATORE_C_03" }).click();

  assert.match(await row.innerText(), /Disponibile/);
  assert.equal(await page.getByText("30 calciatori disponibili").isVisible(), true);
  await openView(page, "Asta");
  assert.equal(
    await page.getByRole("list", { name: "Ranking CEN" }).getByText(/GIOCATORE_C_03/).isVisible(),
    true,
  );
  assert.equal(
    await page.getByRole("list", { name: "Scarsità CEN" }).locator('[aria-label="Slot 3: 1 disponibile"]').isVisible(),
    true,
  );
  assert.equal(await signals.getByText("Dati insufficienti", { exact: true }).isVisible(), true);

  await page.reload();
  await openView(page, "Catalogo");
  assert.match(await page.getByRole("row", { name: /GIOCATORE_C_03/ }).innerText(), /Disponibile/);

  await page.close();
});
