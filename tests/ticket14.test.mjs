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
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  return page;
}

async function createCategory(page, name) {
  const panel = page.locator("details").filter({ hasText: "Gestisci Shortlist" });
  if (await panel.getAttribute("open") === null) await panel.locator("summary").click();
  await page.getByLabel("Nuova categoria").fill(name);
  await page.getByRole("button", { name: "Crea categoria" }).click();
}

test("l'Asta presenta il command center operativo in tre zone informative", async () => {
  const page = await openActiveAuction();

  assert.equal(await page.getByRole("heading", { name: "Asta", exact: true }).isVisible(), true);
  assert.equal(await page.getByRole("region", { name: "Ranking e Scarsità" }).isVisible(), true);
  assert.equal(await page.getByRole("region", { name: "Scheda d’asta" }).isVisible(), true);
  assert.equal(await page.getByRole("region", { name: "I Falchi" }).isVisible(), true);
  assert.equal(await page.getByText("Budget residuo: 1.000 crediti").isVisible(), true);
  assert.deepEqual(
    await page.locator("[data-main-team-role]").allTextContents(),
    ["POR 0/3", "DIF 0/8", "CEN 0/8", "ATT 0/6"],
  );

  await page.close();
});

test("la ricerca apre e chiude la Scheda d’asta senza modificare il Catalogo", async () => {
  const page = await openActiveAuction();
  const card = page.getByRole("region", { name: "Scheda d’asta" });

  await page.getByLabel("Cerca il Calciatore chiamato").fill("GIOCATORE_D_01");
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();

  assert.equal(await card.getByRole("heading", { name: "GIOCATORE_D_01" }).isVisible(), true);
  assert.equal(await card.getByText("CLUB_06 · DIF · Slot 1").isVisible(), true);
  const cardText = await card.innerText();
  assert.match(cardText, /PMA\s+153/);
  assert.match(cardText, /PFC\s+143/);
  assert.equal(await card.getByText("In hype · +7%").isVisible(), true);
  assert.match(cardText, /Fantamedia prevista\s+6,96/);
  assert.match(cardText, /Titolarità prevista\s+92%/);

  await card.getByRole("button", { name: "Chiudi Scheda d’asta" }).click();
  assert.equal(await card.getByRole("heading", { name: "GIOCATORE_D_01" }).count(), 0);
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Catalogo" })
    .click();
  assert.equal(await page.getByText("32 calciatori disponibili").isVisible(), true);
  assert.equal(await page.getByText(/cronologia/i).count(), 0);

  await page.close();
});

test("Ranking, ordinamenti trasparenti e Scarsità restano distinti per Ruolo Classic", async () => {
  const page = await openActiveAuction();
  const region = page.getByRole("region", { name: "Ranking e Scarsità" });

  await region.getByRole("button", { name: "ATT", exact: true }).click();
  assert.deepEqual(
    await region.getByRole("list", { name: "Ranking ATT" }).getByRole("listitem").allTextContents(),
    [
      "GIOCATORE_A_01 · PFC 388",
      "GIOCATORE_A_02 · PFC 146",
      "GIOCATORE_A_03 · PFC 74",
      "GIOCATORE_A_04 · PFC 43",
      "GIOCATORE_A_05 · PFC 25",
      "GIOCATORE_A_07 · PFC 1",
      "GIOCATORE_A_06 · PFC 1",
      "GIOCATORE_A_08 · PFC 1",
    ],
  );
  assert.deepEqual(
    await region.getByRole("list", { name: "Scarsità ATT" }).getByRole("listitem").allTextContents(),
    ["S1 1", "S2 1", "S3 1", "S4 1", "S5 2", "S6 2"],
  );

  await region.getByLabel("Ordina ranking").selectOption("pma");
  assert.deepEqual(
    await region.getByRole("list", { name: "Ranking ATT" }).getByRole("listitem").allTextContents(),
    [
      "GIOCATORE_A_01 · PMA 358",
      "GIOCATORE_A_02 · PMA 85",
      "GIOCATORE_A_03 · PMA 23",
      "GIOCATORE_A_07 · PMA 22",
      "GIOCATORE_A_05 · PMA 17",
      "GIOCATORE_A_04 · PMA 15",
      "GIOCATORE_A_08 · PMA 13",
      "GIOCATORE_A_06 · PMA 8",
    ],
  );
  assert.deepEqual(
    await region.getByLabel("Ordina ranking").locator("option").allTextContents(),
    ["PFC decrescente", "Slot crescente", "PMA decrescente", "Fantamedia decrescente", "Titolarità decrescente"],
  );
  await region.getByLabel("Ordina ranking").selectOption("expectedFantamedia");
  assert.equal(
    await region.getByRole("list", { name: "Ranking ATT" }).getByRole("listitem").first().innerText(),
    "GIOCATORE_A_01 · Fantamedia 7,54",
  );

  await page.close();
});

test("la Scheda gestisce la Shortlist senza alterare Ranking, Scarsità o Alternative immediate", async () => {
  const page = await browser.newPage();
  await page.goto(server.url);
  await page.getByLabel("Seleziona CSV").setInputFiles(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
  );
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("32 calciatori disponibili").waitFor({ state: "visible" });
  await createCategory(page, "Osservati");
  await page.getByLabel("GIOCATORE_P_05 · Osservati").check();
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();

  await page.getByLabel("Cerca il Calciatore chiamato").fill("GIOCATORE_P_04");
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  const alternatives = card.getByRole("list", { name: "Alternative immediate" });
  assert.deepEqual(
    await alternatives.getByRole("listitem").allTextContents(),
    [
      "GIOCATORE_P_03 · CLUB_07 · PFC 1",
      "GIOCATORE_P_05 · CLUB_07 · PFC 1 · Osservati",
      "GIOCATORE_P_06 · CLUB_12 · PFC 1",
    ],
  );

  await card.getByLabel("Osservati").check();
  assert.equal(await card.getByText("In Shortlist").isVisible(), true);
  await page.getByRole("region", { name: "Ranking e Scarsità" })
    .getByLabel("Filtra per categoria")
    .selectOption({ label: "Osservati" });
  assert.deepEqual(
    await page.getByRole("list", { name: "Ranking POR" }).getByRole("listitem").allTextContents(),
    ["GIOCATORE_P_04 · PFC 1", "GIOCATORE_P_05 · PFC 1"],
  );
  assert.deepEqual(
    await page.getByRole("list", { name: "Scarsità POR" }).getByRole("listitem").allTextContents(),
    ["S1 1", "S2 1", "S3 6"],
  );
  assert.deepEqual(
    await alternatives.getByRole("listitem").allTextContents(),
    [
      "GIOCATORE_P_03 · CLUB_07 · PFC 1",
      "GIOCATORE_P_05 · CLUB_07 · PFC 1 · Osservati",
      "GIOCATORE_P_06 · CLUB_12 · PFC 1",
    ],
  );

  await page.close();
});

test("la Percezione storica distingue hype, linea e sottovalutazione con la tolleranza configurata", async () => {
  const page = await openActiveAuction();
  const search = page.getByLabel("Cerca il Calciatore chiamato");
  const openCard = page.getByRole("button", { name: "Apri Scheda d’asta" });
  const card = page.getByRole("region", { name: "Scheda d’asta" });

  await search.fill("GIOCATORE_D_01");
  await openCard.click();
  assert.equal(await card.getByText("In hype · +7%").isVisible(), true);

  await search.fill("GIOCATORE_C_01");
  await openCard.click();
  assert.equal(await card.getByText("In linea · +2%").isVisible(), true);

  await search.fill("GIOCATORE_A_02");
  await openCard.click();
  assert.equal(await card.getByText("Sottovalutato · -42%").isVisible(), true);

  await page.close();
});

test("la Scarsità include gli Slot del Ruolo che hanno zero disponibili", async () => {
  const page = await browser.newPage();
  const csv = [
    "name,team,role,slot,pma,pfc,expectedFantamedia,expectedTitolarita",
    "PORTIERE_UNO,CLUB_01,P,1,10,12,6,90",
    "PORTIERE_TRE_A,CLUB_02,P,3,5,6,5,60",
    "PORTIERE_TRE_B,CLUB_03,P,3,4,5,5,50",
  ].join("\n");
  await page.goto(server.url);
  await page.getByLabel("Seleziona CSV").setInputFiles({
    name: "catalogo-con-slot-vuoto.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("3 calciatori disponibili").waitFor({ state: "visible" });
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();

  assert.deepEqual(
    await page.getByRole("list", { name: "Scarsità POR" }).getByRole("listitem").allTextContents(),
    ["S1 1", "S2 0", "S3 2"],
  );

  await page.close();
});
