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

async function createCategory(page, name) {
  await page.getByLabel("Nuova categoria").fill(name);
  await page.getByRole("button", { name: "Crea categoria" }).click();
}

async function startAuction(page) {
  await page.getByLabel("Numero di Squadre").fill("2");
  await page.getByLabel("Budget iniziale comune").fill("500");
  await page.getByLabel("Posti DIF").fill("3");
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByLabel("Squadra avversaria 2").fill("I Lupi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
}

async function resetAuction(page) {
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Resetta asta" }).click();
  await page.getByRole("heading", { name: "Configura l’Asta attiva" }).waitFor();
}

function updatedCatalogCsv() {
  return [
    "name,team,role,slot,pma,pfc,expectedFantamedia,expectedTitolarita",
    " giocatore_d_01 ,NUOVO_CLUB,D,1,140,150,7,95",
    "NUOVO_P,PRESENTE,P,1,10,12,6,80",
  ].join("\n");
}

async function selectReplacement(page, csv = updatedCatalogCsv()) {
  await page.locator("summary").filter({ hasText: "Sostituisci Catalogo calciatori" }).click();
  await page.getByLabel("Seleziona CSV").setInputFiles({
    name: "catalogo-aggiornato.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
}

test("durante l'Asta la sostituzione del Catalogo è bloccata fino al Reset", async () => {
  const page = await openCatalog();
  await startAuction(page);

  assert.equal(
    await page.getByText("Per sostituire il Catalogo calciatori devi prima eseguire il Reset dell’asta.").isVisible(),
    true,
  );
  assert.equal(await page.getByRole("button", { name: "Sostituisci Catalogo calciatori" }).isDisabled(), true);
  assert.equal(await page.getByLabel("Seleziona CSV").count(), 0);

  await page.close();
});

test("la conferma riepiloga le perdite e la sostituzione riconcilia la Shortlist conservando il setup", async () => {
  const page = await openCatalog();
  await createCategory(page, "Osservati");
  await createCategory(page, "Occasioni");
  await page.getByLabel("GIOCATORE_D_01 · Osservati").check();
  await page.getByLabel("GIOCATORE_C_02 · Osservati").check();
  await page.getByLabel("GIOCATORE_C_02 · Occasioni").check();
  await startAuction(page);
  await resetAuction(page);
  await selectReplacement(page);

  let confirmationMessage = "";
  await Promise.all([
    page.waitForEvent("dialog").then(async (dialog) => {
      confirmationMessage = dialog.message();
      await dialog.dismiss();
    }),
    page.getByRole("button", { name: "Conferma sostituzione" }).click(),
  ]);

  assert.match(confirmationMessage, /2 associazioni della Shortlist/);
  assert.equal(await page.getByText("32 calciatori disponibili").isVisible(), true);
  assert.equal(await page.getByLabel("GIOCATORE_C_02 · Occasioni").isChecked(), true);

  await Promise.all([
    page.waitForEvent("dialog").then((dialog) => dialog.accept()),
    page.getByRole("button", { name: "Conferma sostituzione" }).click(),
  ]);

  assert.equal(await page.getByText("2 calciatori disponibili").isVisible(), true);
  assert.equal(await page.getByRole("heading", { name: "Osservati" }).isVisible(), true);
  assert.equal(await page.getByRole("heading", { name: "Occasioni" }).isVisible(), true);
  assert.equal(await page.getByLabel("giocatore_d_01 · Osservati").isChecked(), true);
  assert.equal(await page.getByText("GIOCATORE_C_02").count(), 0);
  assert.equal(await page.getByLabel("Numero di Squadre").inputValue(), "2");
  assert.equal(await page.getByLabel("Budget iniziale comune").inputValue(), "500");
  assert.equal(await page.getByLabel("Posti DIF").inputValue(), "3");
  assert.equal(await page.getByLabel("Nome della Squadra principale").inputValue(), "I Falchi");
  assert.equal(await page.getByLabel("Squadra avversaria 2").inputValue(), "I Lupi");

  await page.reload();
  assert.equal(await page.getByText("2 calciatori disponibili").isVisible(), true);
  assert.equal(await page.getByLabel("giocatore_d_01 · Osservati").isChecked(), true);
  assert.equal(await page.getByLabel("Budget iniziale comune").inputValue(), "500");

  await page.close();
});

test("un CSV invalido non propone la conferma e lascia invariato l'intero stato", async () => {
  const page = await openCatalog();
  await createCategory(page, "Osservati");
  await page.getByLabel("GIOCATORE_D_01 · Osservati").check();
  await selectReplacement(page, [
    "name,team,role,slot,pma,pfc,expectedFantamedia,expectedTitolarita",
    "ROTTO,,X,0,-1,0,no,101",
  ].join("\n"));
  let confirmationShown = false;
  page.on("dialog", async (dialog) => {
    confirmationShown = true;
    await dialog.dismiss();
  });

  await page.getByRole("button", { name: "Conferma sostituzione" }).click();
  await page.getByRole("alert").waitFor({ state: "visible" });

  assert.equal(confirmationShown, false);
  assert.equal(await page.getByRole("alert").isVisible(), true);
  assert.equal(await page.getByText("32 calciatori disponibili").isVisible(), true);
  assert.equal(await page.getByLabel("GIOCATORE_D_01 · Osservati").isChecked(), true);

  await page.reload();
  assert.equal(await page.getByText("32 calciatori disponibili").isVisible(), true);
  assert.equal(await page.getByLabel("GIOCATORE_D_01 · Osservati").isChecked(), true);

  await page.close();
});
