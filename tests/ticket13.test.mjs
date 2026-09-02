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
  await page.locator("summary").filter({ hasText: "Gestisci Shortlist" }).click();
  return page;
}

async function createCategory(page, name) {
  await page.getByLabel("Nuova categoria").fill(name);
  await page.getByRole("button", { name: "Crea categoria" }).click();
}

test("le categorie richiedono un nome univoco ignorando maiuscole e spazi esterni", async () => {
  const page = await openCatalog();
  const categoryName = page.getByLabel("Nuova categoria");

  await page.getByRole("button", { name: "Crea categoria" }).click();
  assert.equal(await categoryName.evaluate((input) => input.matches(":invalid")), true);

  await categoryName.fill("  Obiettivi  ");
  await page.getByRole("button", { name: "Crea categoria" }).click();
  assert.equal(await page.getByRole("heading", { name: "Obiettivi" }).isVisible(), true);

  await page.getByLabel("Nuova categoria").fill(" obiettivi ");
  await page.getByRole("button", { name: "Crea categoria" }).click();
  assert.match(await page.getByRole("alert").innerText(), /esiste già una categoria/i);
  assert.equal(await page.getByRole("heading", { name: "Obiettivi" }).count(), 1);

  await page.close();
});

test("un calciatore resta nella Shortlist finché conserva almeno una categoria", async () => {
  const page = await openCatalog();
  await createCategory(page, "Obiettivi");
  await createCategory(page, "Low cost");

  const row = page.getByRole("row", { name: /GIOCATORE_D_01/ });
  const objectives = page.getByLabel("GIOCATORE_D_01 · Obiettivi");
  const lowCost = page.getByLabel("GIOCATORE_D_01 · Low cost");

  await objectives.check({ timeout: 2_000 });
  await lowCost.check();
  assert.equal(await row.getByText("In Shortlist").isVisible(), true);
  assert.match(
    await page.getByRole("article").filter({ hasText: "Obiettivi" }).innerText(),
    /1 calciatore/,
  );
  assert.match(
    await page.getByRole("article").filter({ hasText: "Low cost" }).innerText(),
    /1 calciatore/,
  );

  await objectives.uncheck();
  assert.equal(await row.getByText("In Shortlist").isVisible(), true);
  await lowCost.uncheck();
  assert.equal(await row.getByText("In Shortlist").count(), 0);

  await page.close();
});

test("rinomina ed eliminazione preservano l'organizzazione finché la conferma non è esplicita", async () => {
  const page = await openCatalog();
  await createCategory(page, "Obiettivi");
  await createCategory(page, "Low cost");
  await page.getByLabel("GIOCATORE_D_01 · Obiettivi").check();

  await page.getByLabel("Rinomina categoria Obiettivi").fill("  Difensori  ");
  await page.getByRole("button", { name: "Salva nome Obiettivi" }).click({ timeout: 2_000 });
  assert.equal(await page.getByRole("heading", { name: "Difensori" }).isVisible(), true);
  assert.equal(await page.getByLabel("GIOCATORE_D_01 · Difensori").isChecked(), true);

  await page.getByLabel("Rinomina categoria Difensori").fill(" low COST ");
  await page.getByRole("button", { name: "Salva nome Difensori" }).click();
  assert.match(await page.getByRole("alert").innerText(), /esiste già una categoria/i);
  assert.equal(await page.getByRole("heading", { name: "Difensori" }).isVisible(), true);

  let dialogMessage = "";
  page.once("dialog", async (dialog) => {
    dialogMessage = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Elimina categoria Difensori" }).click();
  assert.match(dialogMessage, /1 calciatore/);
  assert.equal(await page.getByRole("heading", { name: "Difensori" }).isVisible(), true);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Elimina categoria Difensori" }).click();
  assert.equal(await page.getByRole("heading", { name: "Difensori" }).count(), 0);
  assert.equal(await page.getByRole("heading", { name: "Low cost" }).isVisible(), true);
  assert.equal(await page.getByRole("row", { name: /GIOCATORE_D_01/ }).isVisible(), true);
  assert.equal(
    await page.getByRole("row", { name: /GIOCATORE_D_01/ }).getByText("In Shortlist").count(),
    0,
  );

  await page.close();
});

test("categorie e associazioni persistono senza cambiare l'ordine PFC, anche durante l'Asta attiva", async () => {
  const page = await openCatalog();
  const initialOrder = await page.getByRole("rowheader").allTextContents();
  await createCategory(page, "Osservati");
  await page.getByLabel("GIOCATORE_D_01 · Osservati").check();
  await page.getByLabel("GIOCATORE_C_02 · Osservati").check();

  await page.reload();
  await page.locator("summary").filter({ hasText: "Gestisci Shortlist" }).click();
  assert.equal(await page.getByRole("heading", { name: "Osservati" }).isVisible(), true);
  assert.equal(await page.getByLabel("GIOCATORE_D_01 · Osservati").isChecked(), true);
  assert.equal(await page.getByLabel("GIOCATORE_C_02 · Osservati").isChecked(), true);
  assert.deepEqual(await page.getByRole("rowheader").allTextContents(), initialOrder);

  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Catalogo" })
    .click();
  await page.locator("summary").filter({ hasText: "Gestisci Shortlist" }).click();
  assert.equal(await page.getByRole("heading", { name: "Shortlist" }).count(), 1);

  await createCategory(page, "Portieri");
  await page.getByLabel("GIOCATORE_P_01 · Portieri").check();
  await page.reload();
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Catalogo" })
    .click();
  assert.equal(await page.getByLabel("GIOCATORE_P_01 · Portieri").isChecked(), true);

  await page.close();
});
