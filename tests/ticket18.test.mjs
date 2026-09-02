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

async function openActiveAuction() {
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
  await page.getByLabel("Numero di Squadre").fill("4");
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  return page;
}

async function assignPlayer(page, playerName, teamId, finalPrice) {
  const header = page.getByRole("banner");
  await header.getByLabel("Cerca il Calciatore chiamato").fill(playerName);
  await header.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption(teamId);
  await card.getByLabel("Prezzo finale").fill(String(finalPrice));
  await card.getByRole("button", { name: "Registra Acquisto" }).click();
}

test("la navigazione primaria apre le tre viste e mantiene ricerca e riepilogo nella testata", async () => {
  const page = await openActiveAuction();
  const navigation = page.getByRole("navigation", { name: "Navigazione primaria" });
  const header = page.getByRole("banner");

  assert.deepEqual(
    await navigation.getByRole("link").allTextContents(),
    ["Asta", "La mia rosa", "Squadre", "Catalogo", "Backup"],
  );
  assert.equal(await navigation.getByRole("link", { name: "Asta" }).getAttribute("aria-current"), "page");
  assert.equal(await header.getByLabel("Cerca il Calciatore chiamato").isVisible(), true);
  assert.match(await header.getByRole("group", { name: "Riepilogo I Falchi" }).innerText(), /1\.000 crediti residui[\s\S]*0\/25 posti/);

  await navigation.getByRole("link", { name: "La mia rosa" }).click();
  assert.equal(await page.getByRole("heading", { name: "La mia rosa", exact: true }).isVisible(), true);
  assert.equal(await header.getByLabel("Cerca il Calciatore chiamato").isVisible(), true);

  await navigation.getByRole("link", { name: "Squadre" }).click();
  assert.equal(await page.getByRole("heading", { name: "Squadre", exact: true }).isVisible(), true);
  assert.equal(await header.getByRole("group", { name: "Riepilogo I Falchi" }).isVisible(), true);

  await header.getByLabel("Cerca il Calciatore chiamato").fill("GIOCATORE_D_01");
  await header.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  assert.equal(await page.getByRole("heading", { name: "GIOCATORE_D_01" }).isVisible(), true);
  assert.equal(await navigation.getByRole("link", { name: "Asta" }).getAttribute("aria-current"), "page");

  await page.close();
});

test("La mia rosa raggruppa gli Acquisti per Ruolo e separa la distribuzione degli Slot", async () => {
  const page = await openActiveAuction();
  await assignPlayer(page, "GIOCATORE_D_01", "main", 120);
  await assignPlayer(page, "GIOCATORE_D_02", "main", 50);

  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "La mia rosa" })
    .click();

  assert.deepEqual(
    await page.locator("[data-roster-role] > h2").allTextContents(),
    ["POR", "DIF", "CEN", "ATT"],
  );
  const defenders = page.getByRole("region", { name: "Rosa DIF" });
  assert.match(await defenders.innerText(), /Crediti spesi\s+170 crediti/);
  assert.match(await defenders.innerText(), /Percentuale del budget iniziale comune\s+17%/);
  assert.match(await defenders.innerText(), /Posti di ruolo\s+2\/8 occupati/);
  assert.deepEqual(
    await defenders.getByRole("list", { name: "Acquisti DIF" }).getByRole("listitem").allTextContents(),
    [
      "GIOCATORE_D_01 · CLUB_06 · Slot 1 · 120 crediti",
      "GIOCATORE_D_02 · CLUB_16 · Slot 2 · 50 crediti",
    ],
  );
  assert.equal(await defenders.getByText("6 posti liberi", { exact: true }).isVisible(), true);

  const goalkeepers = page.getByRole("region", { name: "Rosa POR" });
  assert.match(await goalkeepers.innerText(), /Crediti spesi\s+0 crediti/);
  assert.match(await goalkeepers.innerText(), /Posti di ruolo\s+0\/3 occupati/);
  assert.equal(await goalkeepers.getByText("3 posti liberi", { exact: true }).isVisible(), true);

  const acquiredSlots = page.getByRole("region", { name: "Distribuzione degli Slot acquisiti" });
  assert.deepEqual(
    await acquiredSlots.getByRole("list", { name: "Slot acquisiti DIF" }).getByRole("listitem").allTextContents(),
    ["Slot 1 · 1 calciatore", "Slot 2 · 1 calciatore"],
  );
  assert.equal(await page.getByText("Scarsità per slot").count(), 0);

  await page.close();
});

test("Squadre elenca tutte le Squadre avversarie e ne apre la rosa con i soli fatti registrati", async () => {
  const page = await openActiveAuction();
  await assignPlayer(page, "GIOCATORE_D_01", "opponent-2", 157);
  await assignPlayer(page, "GIOCATORE_P_01", "opponent-2", 100);
  await assignPlayer(page, "GIOCATORE_C_01", "opponent-3", 200);

  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Squadre" })
    .click();

  assert.deepEqual(
    await page.locator("[data-opponent-team] > summary").allTextContents(),
    ["Squadra 2", "Squadra 3", "Squadra 4"],
  );

  const team = page.locator('[data-opponent-team="opponent-2"]');
  assert.equal(await team.getAttribute("open"), null);
  await team.locator("summary").click();
  assert.equal(await team.getAttribute("open"), "");
  assert.match(await team.innerText(), /Budget residuo\s+743 crediti/);
  assert.match(await team.innerText(), /Crediti spesi\s+257 crediti/);
  assert.deepEqual(
    await team.getByRole("list", { name: "Posti di ruolo Squadra 2" }).getByRole("listitem").allTextContents(),
    ["POR 1/3", "DIF 1/8", "CEN 0/8", "ATT 0/6"],
  );
  assert.deepEqual(
    await team.getByRole("list", { name: "Acquisti Squadra 2" }).getByRole("listitem").allTextContents(),
    ["GIOCATORE_D_01 · DIF · 157 crediti", "GIOCATORE_P_01 · POR · 100 crediti"],
  );
  assert.equal(
    await team.getByText(/PFC|PMA|Scarsità|Prezzo adattato|Massimo spendibile/).count(),
    0,
  );

  const emptyTeam = page.locator('[data-opponent-team="opponent-4"]');
  await emptyTeam.locator("summary").click();
  assert.equal(await emptyTeam.getByText("Nessun Acquisto registrato.", { exact: true }).isVisible(), true);

  await page.close();
});
