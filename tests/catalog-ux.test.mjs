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
  await page.getByText("32 calciatori disponibili").waitFor();
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  return page;
}

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

test("la ricerca del Calciatore chiamato comunica gli errori e porta il focus alla Scheda d’asta", async () => {
  const page = await openActiveAuction();
  const search = page.getByLabel("Cerca il Calciatore chiamato");

  await search.fill("INESISTENTE");
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  assert.match(await page.getByRole("alert").innerText(), /nessun calciatore/i);
  assert.equal(await search.evaluate((element) => document.activeElement === element), true);

  await search.fill("GIOCATORE_D_01");
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  const playerHeading = page.getByRole("heading", { name: "GIOCATORE_D_01" });
  assert.equal(await playerHeading.evaluate((element) => document.activeElement === element), true);

  await page.close();
});

test("le scorciatoie mantengono rapido il flusso tastiera dell'asta", async () => {
  const page = await openActiveAuction();
  const search = page.getByLabel("Cerca il Calciatore chiamato");

  await page.getByRole("heading", { name: "Asta attiva", exact: true }).click();
  await page.keyboard.press("/");
  assert.equal(await search.evaluate((element) => document.activeElement === element), true);

  await search.fill("GIOCATORE_D_01");
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  await page.keyboard.press("a");
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  const team = card.getByLabel("Squadra");
  assert.equal(await team.evaluate((element) => document.activeElement === element), true);
  await team.selectOption("opponent-2");
  assert.match(await card.locator("[data-purchase-context]").innerText(), /Budget residuo: 1\.000 crediti/);

  await card.getByRole("heading", { name: "GIOCATORE_D_01" }).click();
  await page.keyboard.press("Escape");
  assert.equal(await card.getByRole("heading", { name: "GIOCATORE_D_01" }).count(), 0);

  const rankingButtons = page.getByRole("list", { name: "Ranking DIF" }).getByRole("button");
  await rankingButtons.first().focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(await rankingButtons.nth(1).evaluate((element) => document.activeElement === element), true);

  await page.close();
});

test("il Ranking conserva posizione e selezione e il modulo Acquisto riceve il focus", async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const csv = [
    "name,team,role,slot,pma,pfc,expectedFantamedia,expectedTitolarita",
    ...Array.from({ length: 40 }, (_, index) => {
      const number = String(index + 1).padStart(2, "0");
      return `CENTROCAMPISTA_${number},CLUB_${number},C,${index % 8 + 1},${100 - index},${200 - index},6.2,80`;
    }),
  ].join("\n");
  await page.goto(server.url);
  await page.getByLabel("Seleziona CSV").setInputFiles({
    name: "catalogo-lungo.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("40 calciatori disponibili").waitFor();
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  await page.getByLabel("Numero di Squadre").fill("2");
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  await page.getByRole("region", { name: "Ranking e Scarsità" })
    .getByRole("button", { name: "CEN" })
    .click();

  const ranking = page.getByRole("list", { name: "Ranking CEN" });
  await ranking.evaluate((element) => { element.scrollTop = 500; });
  const player = ranking.getByRole("button", { name: /CENTROCAMPISTA_25/ });
  await player.scrollIntoViewIfNeeded();
  const scrollBeforeSelection = await ranking.evaluate((element) => element.scrollTop);
  await player.click();

  assert.equal(await ranking.evaluate((element) => element.scrollTop), scrollBeforeSelection);
  assert.equal(await player.getAttribute("aria-current"), "true");

  await page.getByRole("region", { name: "Scheda d’asta" })
    .getByRole("button", { name: "Assegna giocatore" })
    .click();
  const team = page.getByRole("region", { name: "Scheda d’asta" }).getByLabel("Squadra");
  assert.equal(await team.evaluate((element) => document.activeElement === element), true);

  await page.close();
});

test("il command center non crea overflow orizzontale nella fascia tablet", async () => {
  const page = await openActiveAuction();
  await page.setViewportSize({ width: 800, height: 900 });

  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    800,
  );
  assert.equal(
    await page.locator(".auction-command-center").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length),
    2,
  );

  await page.close();
});

test("su mobile la Scheda d’asta precede il Ranking e la testata lascia spazio allo scorrimento", async () => {
  const page = await openActiveAuction();
  await page.setViewportSize({ width: 390, height: 844 });

  assert.equal(
    await page.locator(".active-topbar").evaluate((element) => getComputedStyle(element).position),
    "static",
  );
  const cardTop = await page.getByRole("region", { name: "Scheda d’asta" })
    .evaluate((element) => element.getBoundingClientRect().top);
  const rankingTop = await page.getByRole("region", { name: "Ranking e Scarsità" })
    .evaluate((element) => element.getBoundingClientRect().top);
  assert.equal(cardTop < rankingTop, true);
  assert.equal(await page.getByLabel("Cerca il Calciatore chiamato").getAttribute("placeholder"), "Nome del calciatore");

  await page.close();
});

test("il setup raggruppa le impostazioni e conclude il flusso con Avvia asta", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(server.url);
  await page.getByLabel("Seleziona CSV").setInputFiles(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
  );
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();

  const setup = page.locator("#auction-setup");
  assert.equal(await setup.getByRole("group", { name: "Partecipanti e budget" }).isVisible(), true);
  assert.equal(await setup.getByRole("group", { name: "Composizione delle rose" }).isVisible(), true);
  assert.equal(await setup.getByRole("note").getByText(/non saranno più modificabili/i).isVisible(), true);
  assert.equal(await setup.getByRole("button", { name: "Avvia asta" }).count(), 1);

  await page.close();
});

test("il tema chiaro è selezionabile e persiste al refresh", async () => {
  const page = await browser.newPage();
  await page.goto(server.url);

  const themeToggle = page.getByRole("button", { name: "Usa tema chiaro" });
  assert.equal(await themeToggle.innerText(), "");
  assert.deepEqual(await themeToggle.boundingBox().then(({ width, height }) => [width, height]), [40, 40]);
  assert.equal(await themeToggle.locator("use").getAttribute("href"), "/assets/tabler-icons.svg#tabler-sun");
  await themeToggle.click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  assert.equal(await themeToggle.locator("use").getAttribute("href"), "/assets/tabler-icons.svg#tabler-moon");
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  assert.equal(await page.getByRole("button", { name: "Usa tema scuro" }).isVisible(), true);

  await page.close();
});

test("il Catalogo mobile usa una lista compatta senza scorrimento orizzontale", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(server.url);
  await page.getByLabel("Seleziona CSV").setInputFiles(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
  );
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("32 calciatori disponibili").waitFor();

  assert.equal(await page.getByRole("table").isVisible(), false);
  const mobileCatalog = page.getByRole("list", { name: "Catalogo calciatori mobile" });
  assert.equal(await mobileCatalog.isVisible(), true);
  assert.match(await mobileCatalog.getByRole("listitem").first().innerText(), /PFC/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);

  await page.close();
});

test("la Correzione dell’acquisto funziona anche dal dettaglio del Catalogo mobile", async () => {
  const page = await openActiveAuction();
  await page.getByLabel("Cerca il Calciatore chiamato").fill("GIOCATORE_D_01");
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption("opponent-2");
  await card.getByLabel("Prezzo finale").fill("157");
  await card.getByRole("button", { name: "Registra Acquisto" }).click();

  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Catalogo" })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  const mobilePlayer = page.getByRole("list", { name: "Catalogo calciatori mobile" })
    .getByRole("listitem")
    .filter({ hasText: "GIOCATORE_D_01" });
  await mobilePlayer.locator("summary").click();
  await mobilePlayer.getByRole("button", { name: "Correggi Acquisto mobile GIOCATORE_D_01" }).click();

  const correction = mobilePlayer.getByRole("form", { name: "Correzione mobile dell’acquisto GIOCATORE_D_01" });
  await correction.getByLabel("Squadra").selectOption("main");
  await correction.getByLabel("Prezzo finale").fill("120");
  await correction.getByRole("button", { name: "Salva Correzione dell’acquisto" }).click();
  await mobilePlayer.locator("summary").click();
  assert.match(await mobilePlayer.innerText(), /Acquistato · I Falchi · 120 crediti/);

  await page.close();
});
