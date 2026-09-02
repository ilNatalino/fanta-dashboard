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

test("Catalogo combina ricerca e filtri multipli e ordina dalle intestazioni", async () => {
  const page = await browser.newPage();
  await page.goto(server.url);
  const csv = [
    "name,team,role,slot,pma,pfc,expectedFantamedia,expectedTitolarita",
    "ALFA,INTER,D,1,45,50,6.2,90",
    "BETA,MILAN,D,2,35,40,6.1,80",
    "GAMMA,INTER,C,2,55,60,6.4,95",
    "DELTA,ROMA,A,1,65,70,6.5,85",
    "EPSILON,INTER,C,3,25,30,5.9,75",
  ].join("\n");

  await page.getByLabel("Seleziona CSV").setInputFiles({
    name: "catalogo.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("5 calciatori disponibili").waitFor();

  const playerNames = page.locator("tbody th[scope=row]");
  assert.deepEqual(await playerNames.allTextContents(), ["DELTA", "GAMMA", "ALFA", "BETA", "EPSILON"]);
  assert.equal(await page.getByRole("columnheader", { name: /PFC/ }).getAttribute("aria-sort"), "descending");

  const roleFilter = page.getByRole("group", { name: "Ruolo" });
  await roleFilter.getByRole("button", { name: "DIF" }).click();
  await roleFilter.getByRole("button", { name: "CEN" }).click();
  const slotFilter = page.getByRole("group", { name: "Slot" });
  await slotFilter.getByRole("button", { name: "1", exact: true }).click();
  await slotFilter.getByRole("button", { name: "2", exact: true }).click();
  await page.getByLabel("Cerca per nome o squadra reale").fill("inter");

  assert.equal(await page.getByText("2 calciatori su 5").isVisible(), true);
  assert.deepEqual(await playerNames.allTextContents(), ["GAMMA", "ALFA"]);

  await page.getByRole("button", { name: /Ordina Nome/ }).click();
  assert.deepEqual(await playerNames.allTextContents(), ["ALFA", "GAMMA"]);
  await page.getByRole("button", { name: /Ordina Nome/ }).click();
  assert.deepEqual(await playerNames.allTextContents(), ["GAMMA", "ALFA"]);

  const navigation = page.getByRole("navigation", { name: "Navigazione primaria" });
  await navigation.getByRole("link", { name: "Backup" }).click();
  assert.equal(await page.getByRole("heading", { name: "Backup locale", exact: true }).isVisible(), true);
  await navigation.getByRole("link", { name: "Catalogo" }).click();
  assert.equal(await page.getByText("2 calciatori su 5").isVisible(), true);

  await page.getByRole("button", { name: "Azzera ricerca e filtri" }).click();
  assert.equal(await page.getByText("5 calciatori su 5").isVisible(), true);
  assert.equal(await page.getByRole("columnheader", { name: /Nome/ }).getAttribute("aria-sort"), "descending");

  await page.reload();
  assert.equal(await page.getByText("5 calciatori su 5").isVisible(), true);
  assert.equal(await page.getByRole("columnheader", { name: /PFC/ }).getAttribute("aria-sort"), "descending");

  await navigation.getByRole("link", { name: "Asta" }).click();
  await page.getByLabel("Numero di Squadre").fill("2");
  for (const role of ["POR", "DIF", "CEN", "ATT"]) {
    await page.getByLabel(`Posti ${role}`).fill("1");
  }
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  await page.getByLabel("Cerca il Calciatore chiamato").fill("DELTA");
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption("opponent-2");
  await card.getByLabel("Prezzo finale").fill("10");
  await card.getByRole("button", { name: "Registra Acquisto" }).click();

  await navigation.getByRole("link", { name: "Catalogo" }).click();
  const statusFilter = page.getByRole("group", { name: "Stato" });
  await statusFilter.getByRole("button", { name: "Acquistati" }).click();
  assert.equal(await page.getByText("1 calciatore su 5").isVisible(), true);
  assert.deepEqual(await playerNames.allTextContents(), ["DELTA"]);
  await statusFilter.getByRole("button", { name: "Disponibili" }).click();
  assert.equal(await page.getByText("5 calciatori su 5").isVisible(), true);

  await page.close();
});
