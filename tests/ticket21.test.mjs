import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";
import { CatalogApplication } from "../dist/catalog-application.js";
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
  page.setDefaultTimeout(5_000);
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

async function openDifferentAuction() {
  const page = await browser.newPage();
  page.setDefaultTimeout(5_000);
  await page.goto(server.url);
  await page.getByLabel("Seleziona CSV").setInputFiles({
    name: "catalogo-corrente.csv",
    mimeType: "text/csv",
    buffer: Buffer.from([
      "name,team,role,slot,pma,pfc,expectedFantamedia,expectedTitolarita",
      "CORRENTE_D_01,CLUB,D,1,10,12,6,80",
      "CORRENTE_D_02,CLUB,D,2,8,9,5.5,70",
    ].join("\n")),
  });
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("2 calciatori disponibili").waitFor({ state: "visible" });
  await createCategory(page, "Stato corrente");
  await page.getByLabel("CORRENTE_D_01 · Stato corrente").check();
  await page.getByLabel("Numero di Squadre").fill("2");
  await page.getByLabel("Budget iniziale comune").fill("300");
  await page.getByLabel("Posti DIF").fill("1");
  await page.getByLabel("Nome della Squadra principale").fill("Squadra corrente");
  await page.getByLabel("Squadra avversaria 2").fill("Avversaria corrente");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  await assignPlayer(page, "CORRENTE_D_01", "main", 10);
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

async function importBackup(page, contents, acceptConfirmation) {
  await page.getByLabel("Seleziona Backup locale").setInputFiles({
    name: "fanta-dashboard-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(contents),
  });
  const dialog = page.waitForEvent("dialog");
  await page.getByRole("button", { name: "Ripristina Backup locale" }).click();
  const confirmation = await dialog;
  const message = confirmation.message();
  await (acceptConfirmation ? confirmation.accept() : confirmation.dismiss());
  return message;
}

test("il Backup locale ripristina atomicamente Catalogo, categorie sovrapposte, Squadre e Acquisti", async () => {
  const sourcePage = await openCatalog();
  await createCategory(sourcePage, "Priorità");
  await createCategory(sourcePage, "Occasioni");
  await sourcePage.getByLabel("GIOCATORE_D_01 · Priorità").check();
  await sourcePage.getByLabel("GIOCATORE_D_01 · Occasioni").check();
  await startAuction(sourcePage);
  await assignPlayer(sourcePage, "GIOCATORE_D_01", "main", 157);
  await assignPlayer(sourcePage, "GIOCATORE_D_02", "opponent-2", 55);

  const downloadPromise = sourcePage.waitForEvent("download");
  await sourcePage.getByRole("button", { name: "Esporta Backup locale" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const backupContents = Buffer.concat(chunks).toString("utf8");
  const backup = JSON.parse(backupContents);

  assert.equal(download.suggestedFilename(), "fanta-dashboard-backup.json");
  assert.equal(backup.version, 1);
  assert.equal(backup.catalog.length, 32);
  assert.deepEqual(
    backup.shortlistCategories.map((category) => category.name),
    ["Priorità", "Occasioni"],
  );
  assert.equal(backup.auction.teams[0].name, "I Falchi");
  assert.equal(backup.auction.purchases.length, 2);
  await sourcePage.close();

  const page = await openDifferentAuction();

  const dismissedMessage = await importBackup(page, backupContents, false);
  assert.match(dismissedMessage, /sostituire l.intero stato corrente/i);
  assert.equal(await page.getByText("1 calciatori disponibili").isVisible(), true);
  assert.equal(await page.getByLabel("Budget iniziale comune").inputValue(), "300");
  assert.equal(await page.getByLabel("Nome della Squadra principale").inputValue(), "Squadra corrente");
  assert.equal(await page.getByLabel("CORRENTE_D_01 · Stato corrente").isChecked(), true);
  assert.equal(await page.getByText(/Acquistato · Squadra corrente · 10 crediti/).isVisible(), true);

  await importBackup(page, backupContents, true);
  assert.equal(await page.getByRole("status").getByText("Backup locale ripristinato.").isVisible(), true);
  assert.equal(await page.getByText("30 calciatori disponibili").isVisible(), true);
  assert.equal(await page.getByLabel("Budget iniziale comune").inputValue(), "500");
  assert.equal(await page.getByLabel("Posti DIF").inputValue(), "3");
  assert.equal(await page.getByLabel("Nome della Squadra principale").inputValue(), "I Falchi");
  assert.equal(await page.getByLabel("Squadra avversaria 2").inputValue(), "I Lupi");
  assert.equal(await page.getByLabel("GIOCATORE_D_01 · Priorità").isChecked(), true);
  assert.equal(await page.getByLabel("GIOCATORE_D_01 · Occasioni").isChecked(), true);
  assert.equal(await page.getByText(/Acquistato · I Falchi · 157 crediti/).isVisible(), true);

  await page.reload();
  assert.equal(await page.getByLabel("Budget iniziale comune").inputValue(), "500");
  assert.equal(await page.getByLabel("Posti DIF").inputValue(), "3");
  assert.equal(await page.getByLabel("Nome della Squadra principale").inputValue(), "I Falchi");
  assert.equal(await page.getByLabel("GIOCATORE_D_01 · Occasioni").isChecked(), true);
  assert.equal(await page.getByText(/Acquistato · I Falchi · 157 crediti/).isVisible(), true);

  await page.close();
});

test("backup invalidi o incompatibili sono rifiutati senza proporre conferma né modificare lo stato", async () => {
  const page = await openCatalog();
  await createCategory(page, "Da conservare");
  await page.getByLabel("GIOCATORE_C_01 · Da conservare").check();
  await startAuction(page);
  await assignPlayer(page, "GIOCATORE_D_01", "main", 157);
  let confirmationShown = false;
  page.on("dialog", async (dialog) => {
    confirmationShown = true;
    await dialog.dismiss();
  });

  for (const invalidBackup of [
    JSON.stringify({ version: 2, catalog: [], shortlistCategories: [] }),
    JSON.stringify({
      version: 1,
      catalog: [],
      shortlistCategories: [{ name: "Rotta", playerNames: ["INESISTENTE"] }],
    }),
    "questo non è JSON",
  ]) {
    await page.getByLabel("Seleziona Backup locale").setInputFiles({
      name: "backup-invalido.json",
      mimeType: "application/json",
      buffer: Buffer.from(invalidBackup),
    });
    await page.getByRole("button", { name: "Ripristina Backup locale" }).click();
    await page.getByRole("alert").waitFor({ state: "visible" });
    assert.equal(await page.getByText("31 calciatori disponibili").isVisible(), true);
    assert.equal(await page.getByLabel("Budget iniziale comune").inputValue(), "500");
    assert.equal(await page.getByLabel("Posti DIF").inputValue(), "3");
    assert.equal(await page.getByLabel("Nome della Squadra principale").inputValue(), "I Falchi");
    assert.equal(await page.getByLabel("GIOCATORE_C_01 · Da conservare").isChecked(), true);
    assert.equal(await page.getByText(/Acquistato · I Falchi · 157 crediti/).isVisible(), true);
  }

  assert.equal(confirmationShown, false);
  await page.reload();
  assert.equal(await page.getByText("31 calciatori disponibili").isVisible(), true);
  assert.equal(await page.getByLabel("Budget iniziale comune").inputValue(), "500");
  assert.equal(await page.getByLabel("Posti DIF").inputValue(), "3");
  assert.equal(await page.getByLabel("Nome della Squadra principale").inputValue(), "I Falchi");
  assert.equal(await page.getByLabel("GIOCATORE_C_01 · Da conservare").isChecked(), true);
  assert.equal(await page.getByText(/Acquistato · I Falchi · 157 crediti/).isVisible(), true);

  await page.close();
});

test("un errore di salvataggio durante il ripristino conserva lo stato corrente", () => {
  const currentState = {
    version: 1,
    catalog: [{
      name: "CORRENTE",
      team: "CLUB",
      role: "D",
      slot: 1,
      pma: 10,
      pfc: 12,
      expectedFantamedia: 6,
      expectedTitolarita: 80,
    }],
    shortlistCategories: [],
  };
  const replacementState = {
    ...currentState,
    catalog: [{ ...currentState.catalog[0], name: "RIPRISTINATO" }],
  };
  const application = new CatalogApplication({
    load: () => structuredClone(currentState),
    save: () => { throw new Error("quota esaurita"); },
  });
  const stateBeforeRestore = structuredClone(application.observe());

  assert.deepEqual(
    application.importBackup(JSON.stringify(replacementState), true),
    { status: "failed", error: "Impossibile salvare il Backup locale ripristinato." },
  );
  assert.deepEqual(application.observe(), stateBeforeRestore);
});
