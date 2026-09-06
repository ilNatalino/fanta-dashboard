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
  assert.equal(
    await page.locator(".active-topbar + *").evaluate((content) => getComputedStyle(content).marginTop),
    "24px",
  );

  await navigation.getByRole("link", { name: "La mia rosa" }).click();
  assert.equal(await page.locator(".roster-view > .active-heading").count(), 0);
  assert.equal(await page.locator("#my-roster-title").getAttribute("class"), "visually-hidden");
  assert.equal(await header.getByLabel("Cerca il Calciatore chiamato").isVisible(), true);

  await navigation.getByRole("link", { name: "Squadre" }).click();
  assert.equal(await page.locator(".teams-view > .active-heading").count(), 0);
  assert.equal(await page.locator("#teams-title").getAttribute("class"), "visually-hidden");
  assert.equal(await header.getByRole("group", { name: "Riepilogo I Falchi" }).isVisible(), true);

  await header.getByLabel("Cerca il Calciatore chiamato").fill("GIOCATORE_D_01");
  await header.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  assert.equal(await page.getByRole("heading", { name: "GIOCATORE_D_01" }).isVisible(), true);
  assert.equal(await navigation.getByRole("link", { name: "Asta" }).getAttribute("aria-current"), "page");

  await page.close();
});

test("La mia rosa usa card di Ruolo compatte e senza distribuzione degli Slot", async () => {
  const page = await openActiveAuction();
  await assignPlayer(page, "GIOCATORE_D_01", "main", 120);
  await assignPlayer(page, "GIOCATORE_D_02", "main", 50);

  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "La mia rosa" })
    .click();

  assert.deepEqual(
    await page.locator("[data-roster-role] .team-role-heading > h2").allTextContents(),
    ["POR", "DIF", "CEN", "ATT"],
  );
  const defenders = page.getByRole("region", { name: "Rosa DIF" });
  assert.deepEqual(await defenders.locator(".team-role-heading span").allTextContents(), ["170", "17%", "2/8"]);
  assert.deepEqual(
    await defenders.getByRole("list", { name: "Acquisti DIF" }).locator("li > span").allTextContents(),
    ["GIOCATORE_D_01", "GIOCATORE_D_02"],
  );
  assert.deepEqual(
    await defenders.getByRole("list", { name: "Acquisti DIF" }).locator("li > strong").allTextContents(),
    ["120", "50"],
  );

  const goalkeepers = page.getByRole("region", { name: "Rosa POR" });
  assert.deepEqual(await goalkeepers.locator(".team-role-heading span").allTextContents(), ["0", "0%", "0/3"]);
  assert.equal(await goalkeepers.getByRole("listitem").count(), 0);

  assert.equal(await page.getByText("posti liberi", { exact: false }).count(), 0);
  assert.equal(await page.getByRole("region", { name: "Distribuzione degli Slot acquisiti" }).count(), 0);
  assert.equal(
    await page.locator("[data-roster-role]").evaluateAll((cards) =>
      new Set(cards.map((card) => Math.round(card.getBoundingClientRect().height))).size,
    ),
    1,
  );

  await page.setViewportSize({ width: 1000, height: 720 });
  assert.equal(
    await page.locator(".roster-columns").evaluate((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    ),
    2,
  );
  await page.setViewportSize({ width: 700, height: 720 });
  assert.equal(
    await page.locator(".roster-columns").evaluate((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    ),
    1,
  );
  assert.equal(
    await page.locator(".active-topbar + *").evaluate((content) => getComputedStyle(content).marginTop),
    "16px",
  );

  await page.close();
});

test("Squadre confronta tutte le rose in card sempre aperte e raggruppate per Ruolo", async () => {
  const page = await openActiveAuction();
  await assignPlayer(page, "GIOCATORE_D_01", "opponent-2", 157);
  await assignPlayer(page, "GIOCATORE_P_01", "opponent-2", 100);
  await assignPlayer(page, "GIOCATORE_D_02", "opponent-2", 50);
  await assignPlayer(page, "GIOCATORE_C_01", "opponent-3", 200);
  await assignPlayer(page, "GIOCATORE_P_02", "main", 60);

  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Squadre" })
    .click();

  assert.deepEqual(
    await page.locator("[data-team-roster]").evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-team-roster")),
    ),
    ["main", "opponent-2", "opponent-3", "opponent-4"],
  );
  assert.equal(
    await page.locator(".team-card-grid").evaluate((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    ),
    4,
  );

  const mainTeam = page.locator('[data-team-roster="main"]');
  assert.equal(await mainTeam.getAttribute("aria-label"), "Squadra principale I Falchi");
  assert.deepEqual(await mainTeam.locator(".team-roster-summary dt").allTextContents(), ["Residuo", "Max", "Rosa"]);
  assert.deepEqual(await mainTeam.locator(".team-roster-summary dd").allTextContents(), ["940", "917", "1/25"]);

  const team = page.locator('[data-team-roster="opponent-2"]');
  assert.deepEqual(await team.locator(".team-roster-summary dd").allTextContents(), ["693", "672", "3/25"]);
  assert.deepEqual(
    await team.getByRole("heading", { level: 3 }).allTextContents(),
    ["POR", "DIF", "CEN", "ATT"],
  );
  const defenders = team.getByRole("region", { name: "DIF di Squadra 2" });
  assert.deepEqual(await defenders.locator(".team-role-heading span").allTextContents(), ["207", "20,7%", "2/8"]);
  assert.deepEqual(
    await defenders.getByRole("list", { name: "Acquisti DIF di Squadra 2" }).locator("li > span").allTextContents(),
    ["GIOCATORE_D_01", "GIOCATORE_D_02"],
  );
  assert.deepEqual(
    await defenders.getByRole("list", { name: "Acquisti DIF di Squadra 2" }).locator("li > strong").allTextContents(),
    ["157", "50"],
  );
  const midfielders = team.getByRole("region", { name: "CEN di Squadra 2" });
  assert.deepEqual(await midfielders.locator(".team-role-heading span").allTextContents(), ["0", "0%", "0/8"]);
  assert.equal(await midfielders.getByRole("listitem").count(), 0);
  assert.equal(await team.getByText("Nessun acquisto", { exact: true }).count(), 0);
  assert.equal(await team.getByRole("button").count(), 0);

  assert.equal(
    await page.locator("[data-team-roster]").evaluateAll((cards) =>
      new Set(cards.map((card) => Math.round(card.getBoundingClientRect().height))).size,
    ),
    1,
  );

  await page.setViewportSize({ width: 1000, height: 720 });
  assert.equal(
    await page.locator(".team-card-grid").evaluate((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    ),
    2,
  );
  await page.setViewportSize({ width: 700, height: 720 });
  assert.equal(
    await page.locator(".team-card-grid").evaluate((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    ),
    1,
  );

  await page.close();
});
