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

async function openCatalog() {
  const page = await browser.newPage();
  await page.goto(server.url);
  await page.getByLabel("Seleziona CSV").setInputFiles(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
  );
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("32 calciatori disponibili").waitFor({ state: "visible" });
  return page;
}

async function openSmallAuction() {
  const page = await openCatalog();
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  await page.getByLabel("Numero di Squadre").fill("2");
  await page.getByLabel("Budget iniziale comune").fill("100");
  for (const role of ["POR", "DIF", "CEN", "ATT"]) {
    await page.getByLabel(`Posti ${role}`).fill("1");
  }
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByLabel("Squadra avversaria 2").fill("I Lupi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  return page;
}

async function assignPlayer(page, playerName, teamId, finalPrice = 1) {
  const header = page.getByRole("banner");
  await header.getByLabel("Cerca il Calciatore chiamato").fill(playerName);
  await header.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption(teamId);
  await card.getByLabel("Prezzo finale").fill(String(finalPrice));
  await card.getByRole("button", { name: "Registra Acquisto" }).click();
}

test("l'Asta diventa completa naturalmente e le rose finali restano consultabili dopo il refresh", async () => {
  const page = await openSmallAuction();

  for (const [playerName, teamId] of [
    ["GIOCATORE_P_01", "main"],
    ["GIOCATORE_D_01", "main"],
    ["GIOCATORE_C_01", "main"],
    ["GIOCATORE_A_01", "main"],
    ["GIOCATORE_P_02", "opponent-2"],
    ["GIOCATORE_D_02", "opponent-2"],
    ["GIOCATORE_C_02", "opponent-2"],
    ["GIOCATORE_A_02", "opponent-2"],
  ]) {
    await assignPlayer(page, playerName, teamId);
  }

  assert.equal(await page.getByRole("heading", { name: "Asta completa" }).isVisible(), true);
  assert.equal(await page.getByText("Tutte le Squadre hanno occupato i Posti di ruolo configurati.").isVisible(), true);
  assert.equal(await page.getByRole("button", { name: /Termina asta/i }).count(), 0);

  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "La mia rosa" })
    .click();
  assert.equal(
    await page.getByRole("list", { name: "Acquisti POR" }).getByText(/GIOCATORE_P_01/).isVisible(),
    true,
  );

  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Squadre" })
    .click();
  const opponent = page.locator('[data-team-roster="opponent-2"]');
  assert.equal(await opponent.locator(".team-role-purchases li").count(), 4);

  await page.reload();
  assert.equal(await page.getByRole("heading", { name: "Asta completa" }).isVisible(), true);
  assert.equal(await page.getByRole("button", { name: /Termina asta/i }).count(), 0);

  await page.close();
});

test("il Reset dell'asta richiede conferma e conserva setup e Shortlist eliminando i progressi", async () => {
  const page = await openCatalog();
  await page.locator("summary").filter({ hasText: "Gestisci Shortlist" }).click();
  await page.getByLabel("Nuova categoria").fill("Osservati");
  await page.getByRole("button", { name: "Crea categoria" }).click();
  await page.getByLabel("GIOCATORE_D_01 · Osservati").check();
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  await page.getByLabel("Numero di Squadre").fill("2");
  await page.getByLabel("Budget iniziale comune").fill("500");
  await page.getByLabel("Posti POR").fill("1");
  await page.getByLabel("Posti DIF").fill("2");
  await page.getByLabel("Posti CEN").fill("1");
  await page.getByLabel("Posti ATT").fill("1");
  await page.getByText("Parametri di mercato avanzati", { exact: true }).click();
  await page.getByLabel("Soglia di adattamento").fill("3");
  await page.getByLabel("Tolleranza della Percezione storica di mercato (%)").fill("7");
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByLabel("Squadra avversaria 2").fill("I Lupi");
  await page.getByRole("button", { name: "Avvia asta" }).click();

  await assignPlayer(page, "GIOCATORE_D_01", "main", 157);
  await assignPlayer(page, "GIOCATORE_D_02", "opponent-2", 55);
  await assignPlayer(page, "GIOCATORE_D_03", "main", 76);
  await page.getByRole("banner").getByLabel("Cerca il Calciatore chiamato").fill("GIOCATORE_D_04");
  await page.getByRole("banner").getByRole("button", { name: "Apri Scheda d’asta" }).click();
  assert.equal(
    await page.getByRole("region", { name: "Segnali di mercato" }).getByText("24 crediti", { exact: true }).isVisible(),
    true,
  );

  let confirmationMessage = "";
  page.once("dialog", async (dialog) => {
    confirmationMessage = dialog.message();
    await dialog.dismiss();
  });
  await page.locator("summary").filter({ hasText: "Configurazione d’asta" }).click();
  await page.getByRole("button", { name: "Resetta asta" }).click();
  assert.match(confirmationMessage, /eliminare tutti gli Acquisti e i progressi/i);
  assert.equal(await page.getByText("29 calciatori disponibili").isVisible(), true);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Resetta asta" }).click();

  assert.equal(await page.getByRole("heading", { name: "Configura l’Asta attiva" }).isVisible(), true);
  assert.equal(await page.getByLabel("Numero di Squadre").inputValue(), "2");
  assert.equal(await page.getByLabel("Budget iniziale comune").inputValue(), "500");
  assert.deepEqual(
    await Promise.all(["POR", "DIF", "CEN", "ATT"].map((role) => page.getByLabel(`Posti ${role}`).inputValue())),
    ["1", "2", "1", "1"],
  );
  assert.equal(await page.getByLabel("Soglia di adattamento").inputValue(), "3");
  assert.equal(await page.getByLabel("Tolleranza della Percezione storica di mercato (%)").inputValue(), "7");
  assert.equal(await page.getByLabel("Nome della Squadra principale").inputValue(), "I Falchi");
  assert.equal(await page.getByLabel("Squadra avversaria 2").inputValue(), "I Lupi");
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Catalogo" })
    .click();
  assert.equal(await page.getByText("32 calciatori disponibili").isVisible(), true);
  assert.equal(await page.getByLabel("GIOCATORE_D_01 · Osservati").isChecked(), true);

  await page.reload();
  assert.equal(await page.getByLabel("GIOCATORE_D_01 · Osservati").isChecked(), true);
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  assert.equal(await page.getByRole("heading", { name: "Configura l’Asta attiva" }).isVisible(), true);
  assert.equal(await page.getByLabel("Budget iniziale comune").inputValue(), "500");

  await page.getByLabel("Budget iniziale comune").fill("600");
  await page.getByLabel("Posti DIF").fill("3");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  assert.equal(await page.getByLabel("Budget iniziale comune").inputValue(), "600");
  assert.equal(await page.getByLabel("Posti DIF").inputValue(), "3");
  assert.equal(await page.getByLabel("Posti DIF").isDisabled(), true);
  await page.getByRole("banner").getByLabel("Cerca il Calciatore chiamato").fill("GIOCATORE_D_04");
  await page.getByRole("banner").getByRole("button", { name: "Apri Scheda d’asta" }).click();
  assert.equal(
    await page.getByRole("region", { name: "Segnali di mercato" }).getByText("Dati insufficienti", { exact: true }).isVisible(),
    true,
  );

  await page.close();
});
