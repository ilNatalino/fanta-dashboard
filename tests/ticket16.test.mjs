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

async function openActiveAuction({ goalkeeperSlots = 3 } = {}) {
  const page = await browser.newPage();
  await page.goto(server.url);
  await page.getByLabel("Seleziona CSV").setInputFiles(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
  );
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("32 calciatori disponibili").waitFor({ state: "visible" });
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  await page.getByLabel("Posti POR").fill(String(goalkeeperSlots));
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  return page;
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

test("la mediana adatta il prezzo dalla soglia senza confonderlo con il Massimo spendibile", async () => {
  const page = await openActiveAuction();
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  const personalConstraints = page.getByRole("region", { name: "Vincoli personali" });

  assert.equal(
    await personalConstraints.getByText("976 crediti", { exact: true }).isVisible(),
    true,
  );

  await assignPlayer(page, "GIOCATORE_D_01", "main", 157);
  assert.equal(
    await personalConstraints.getByText("820 crediti", { exact: true }).isVisible(),
    true,
  );
  await assignPlayer(page, "GIOCATORE_D_02", "opponent-2", 55);

  await openPlayer(page, "GIOCATORE_D_04");
  let marketSignals = card.getByRole("region", { name: "Segnali di mercato" });
  assert.equal(
    await marketSignals.getByText("Dati insufficienti", { exact: true }).isVisible(),
    true,
  );

  await assignPlayer(page, "GIOCATORE_D_03", "opponent-3", 76);
  await openPlayer(page, "GIOCATORE_D_04");
  marketSignals = card.getByRole("region", { name: "Segnali di mercato" });

  assert.equal(
    await marketSignals.getByText("24 crediti", { exact: true }).isVisible(),
    true,
  );
  assert.equal(await marketSignals.getByText("+16%", { exact: true }).isVisible(), true);
  assert.equal(
    await marketSignals.getByText("3 Acquisti", { exact: true }).isVisible(),
    true,
  );

  await page.close();
});

test("un Ruolo completo è Non acquistabile senza nascondere i riferimenti di mercato", async () => {
  const page = await openActiveAuction({ goalkeeperSlots: 1 });
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  const personalConstraints = page.getByRole("region", { name: "Vincoli personali" });

  await assignPlayer(page, "GIOCATORE_P_01", "main", 100);
  await openPlayer(page, "GIOCATORE_P_02");

  assert.equal(
    await personalConstraints.getByText("879 crediti", { exact: true }).isVisible(),
    true,
  );
  assert.equal(
    await card.getByText("Non acquistabile", { exact: true }).isVisible(),
    true,
  );
  const marketSignals = card.getByRole("region", { name: "Segnali di mercato" });
  assert.equal(await marketSignals.getByText("PMA", { exact: true }).isVisible(), true);
  assert.equal(await marketSignals.getByText("PFC", { exact: true }).isVisible(), true);
  assert.equal(
    await marketSignals.getByText("Dati insufficienti", { exact: true }).isVisible(),
    true,
  );

  await page.close();
});
