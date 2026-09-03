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

async function openPage() {
  const page = await browser.newPage();
  await page.goto(server.url);
  return page;
}

async function importRepresentativeCatalog(page) {
  await page.getByLabel("Seleziona CSV").setInputFiles(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
  );
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("32 calciatori disponibili").waitFor({ state: "visible" });
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
}

test("il Catalogo disponibile espone la configurazione rappresentativa e richiede la Squadra principale", async () => {
  const page = await openPage();
  await importRepresentativeCatalog(page);

  assert.equal(await page.getByRole("heading", { name: "Configura l’Asta attiva" }).isVisible(), true);
  assert.equal(await page.getByLabel("Numero di Squadre").inputValue(), "8");
  assert.equal(await page.getByLabel("Budget iniziale comune").inputValue(), "1000");
  assert.deepEqual(
    await Promise.all(["POR", "DIF", "CEN", "ATT"].map((role) => page.getByLabel(`Posti ${role}`).inputValue())),
    ["3", "8", "8", "6"],
  );
  assert.equal(await page.getByLabel("Soglia di adattamento").inputValue(), "3");
  assert.equal(await page.getByLabel("Tolleranza della Percezione storica di mercato (%)").inputValue(), "5");
  assert.deepEqual(
    await page.locator("[data-opponent-name]").evaluateAll((inputs) => inputs.map((input) => input.value)),
    ["Squadra 2", "Squadra 3", "Squadra 4", "Squadra 5", "Squadra 6", "Squadra 7", "Squadra 8"],
  );

  await page.getByRole("button", { name: "Avvia asta" }).click();
  assert.equal(await page.getByLabel("Nome della Squadra principale").evaluate((input) => input.matches(":invalid")), true);
  assert.equal(await page.getByRole("heading", { name: "Asta attiva", exact: true }).count(), 0);

  await page.close();
});

test("l'avvio salva l'unica Asta attiva, blocca le regole strutturali e sopravvive al refresh", async () => {
  const page = await openPage();
  await importRepresentativeCatalog(page);

  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();

  assert.equal(await page.getByRole("heading", { name: "Asta attiva", exact: true }).isVisible(), true);
  assert.equal(await page.getByText("Sessione in corso", { exact: true }).count(), 1);
  assert.equal(await page.getByLabel("Numero di Squadre").isDisabled(), true);
  assert.equal(await page.getByLabel("Budget iniziale comune").isDisabled(), true);
  assert.deepEqual(
    await Promise.all(["POR", "DIF", "CEN", "ATT"].map((role) => page.getByLabel(`Posti ${role}`).isDisabled())),
    [true, true, true, true],
  );
  assert.equal(await page.getByLabel("Nome della Squadra principale").isEnabled(), true);
  assert.deepEqual(
    await page.locator("[data-team-name]").evaluateAll((inputs) => inputs.map((input) => input.value)),
    ["I Falchi", "Squadra 2", "Squadra 3", "Squadra 4", "Squadra 5", "Squadra 6", "Squadra 7", "Squadra 8"],
  );

  await page.reload();

  assert.equal(await page.getByRole("heading", { name: "Asta attiva", exact: true }).isVisible(), true);
  assert.equal(await page.getByLabel("Numero di Squadre").inputValue(), "8");
  assert.equal(await page.getByLabel("Budget iniziale comune").inputValue(), "1000");
  assert.equal(await page.getByLabel("Nome della Squadra principale").inputValue(), "I Falchi");
  assert.equal(await page.getByText("Asta avviata", { exact: true }).isVisible(), true);

  await page.close();
});

test("numero di Squadre, budget, Posti di ruolo, Soglia di adattamento e tolleranza della Percezione storica di mercato sono configurabili", async () => {
  const page = await openPage();
  await importRepresentativeCatalog(page);

  await page.getByLabel("Numero di Squadre").fill("5");
  assert.deepEqual(
    await page.locator("[data-opponent-name]").evaluateAll((inputs) => inputs.map((input) => input.value)),
    ["Squadra 2", "Squadra 3", "Squadra 4", "Squadra 5"],
  );
  await page.getByLabel("Budget iniziale comune").fill("750");
  await page.getByLabel("Posti POR").fill("2");
  await page.getByLabel("Posti DIF").fill("7");
  await page.getByLabel("Posti CEN").fill("7");
  await page.getByLabel("Posti ATT").fill("5");
  await page.getByText("Parametri di mercato avanzati", { exact: true }).click();
  await page.getByLabel("Soglia di adattamento").fill("4");
  await page.getByLabel("Tolleranza della Percezione storica di mercato (%)").fill("7");
  await page.getByLabel("Nome della Squadra principale").fill("I Lupi");
  await page.getByRole("button", { name: "Avvia asta" }).click();

  assert.equal(await page.getByLabel("Numero di Squadre").inputValue(), "5");
  assert.equal(await page.getByLabel("Budget iniziale comune").inputValue(), "750");
  assert.deepEqual(
    await Promise.all(["POR", "DIF", "CEN", "ATT"].map((role) => page.getByLabel(`Posti ${role}`).inputValue())),
    ["2", "7", "7", "5"],
  );
  assert.equal(await page.getByLabel("Soglia di adattamento").inputValue(), "4");
  assert.equal(await page.getByLabel("Tolleranza della Percezione storica di mercato (%)").inputValue(), "7");
  assert.equal(await page.locator("[data-team-name]").count(), 5);

  await page.close();
});

test("dopo l'avvio i nomi delle Squadre, la Soglia di adattamento e la tolleranza della Percezione storica di mercato restano modificabili", async () => {
  const page = await openPage();
  await importRepresentativeCatalog(page);
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();

  await page.locator("summary").filter({ hasText: "Configurazione d’asta" }).click();
  await page.getByLabel("Nome della Squadra principale").fill("Le Aquile");
  await page.getByLabel("Squadra avversaria 2").fill("I Rivali");
  await page.getByLabel("Soglia di adattamento").fill("4");
  await page.getByLabel("Tolleranza della Percezione storica di mercato (%)").fill("6");
  await page.getByRole("button", { name: "Salva Configurazione d’asta" }).click();

  assert.equal(await page.getByText("Configurazione d’asta salvata.", { exact: true }).isVisible(), true);
  await page.reload();
  assert.equal(await page.getByLabel("Nome della Squadra principale").inputValue(), "Le Aquile");
  assert.equal(await page.getByLabel("Squadra avversaria 2").inputValue(), "I Rivali");
  assert.equal(await page.getByLabel("Soglia di adattamento").inputValue(), "4");
  assert.equal(await page.getByLabel("Tolleranza della Percezione storica di mercato (%)").inputValue(), "6");

  await page.close();
});
