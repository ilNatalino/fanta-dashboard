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
}

test("senza Catalogo calciatori l'importazione è obbligatoria e l'Asta non può iniziare", async () => {
  const page = await openPage();

  assert.equal(await page.getByRole("heading", { name: "Importa il Catalogo calciatori" }).isVisible(), true);
  assert.equal(await page.getByRole("button", { name: "Avvia asta" }).isDisabled(), true);

  await page.close();
});

test("il Catalogo rappresentativo importa 32 calciatori e mostra solo i campi dell'MVP", async () => {
  const page = await openPage();
  await importRepresentativeCatalog(page);

  assert.equal(await page.getByRole("heading", { name: "Catalogo calciatori", exact: true }).isVisible(), true);
  assert.equal(await page.getByText("32 calciatori disponibili").isVisible(), true);
  assert.deepEqual(
    await page.getByRole("columnheader").allTextContents(),
    ["Nome", "Squadra reale", "Ruolo", "Slot", "PMA", "PFC", "Fantamedia prevista", "Titolarità prevista", "Shortlist"],
  );
  assert.equal(await page.getByRole("row").count(), 33);
  assert.equal(await page.getByRole("row", { name: /GIOCATORE_P_01/ }).innerText(), "GIOCATORE_P_01\tCLUB_13\tPOR\t1\t121,5\t105,5\t5,51\t91%\tCrea una categoria");
  assert.equal(await page.getByText("teamSlug").count(), 0);

  await page.close();
});

test("colonne obbligatorie mancanti o duplicate rifiutano l'intero file", async () => {
  const page = await openPage();
  const csv = [
    "name,team,role,slot,pma,pfc,pfc,expectedFantamedia",
    "ALFA,CLUB_01,P,1,10,12,12,6",
  ].join("\n");

  await page.getByLabel("Seleziona CSV").setInputFiles({
    name: "intestazioni-non-valide.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByRole("alert").waitFor({ state: "visible" });

  assert.equal(await page.getByRole("alert").isVisible(), true);
  assert.match(await page.getByRole("alert").innerText(), /Riga 1 · Campo pfc[\s\S]*colonna obbligatoria duplicata/);
  assert.match(await page.getByRole("alert").innerText(), /Riga 1 · Campo expectedTitolarita[\s\S]*colonna obbligatoria assente/);
  assert.equal(await page.getByRole("heading", { name: "Importa il Catalogo calciatori" }).isVisible(), true);

  await page.close();
});

test("tutti gli errori di riga sono mostrati e il Catalogo valido precedente resta invariato", async () => {
  const page = await openPage();
  await importRepresentativeCatalog(page);
  await page.locator("summary").filter({ hasText: "Sostituisci Catalogo calciatori" }).click();

  const csv = [
    "name,team,role,slot,pma,pfc,expectedFantamedia,expectedTitolarita,extra",
    ' Alpha , CLUB_01 ,P,1,0,"2,3"," 6,25 "," 92 ",ignorata',
    "alpha, ,X,0,-1,0,abc,101,ignorata",
  ].join("\n");
  await page.getByLabel("Seleziona CSV").setInputFiles({
    name: "righe-non-valide.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Conferma sostituzione" }).click();
  await page.getByRole("alert").waitFor({ state: "visible" });

  const alertText = await page.getByRole("alert").innerText();
  assert.match(alertText, /Riga 3 · Campo name[\s\S]*nome duplicato dopo la normalizzazione/);
  assert.match(alertText, /Riga 3 · Campo team[\s\S]*squadra reale obbligatoria/);
  assert.match(alertText, /Riga 3 · Campo role[\s\S]*Ruolo Classic non valido/);
  assert.match(alertText, /Riga 3 · Campo slot[\s\S]*intero positivo/);
  assert.match(alertText, /Riga 3 · Campo pma[\s\S]*numero non negativo/);
  assert.match(alertText, /Riga 3 · Campo pfc[\s\S]*strettamente positivo/);
  assert.match(alertText, /Riga 3 · Campo expectedFantamedia[\s\S]*deve essere un numero/);
  assert.match(alertText, /Riga 3 · Campo expectedTitolarita[\s\S]*compresa tra 0 e 100/);
  assert.equal(await page.getByText("32 calciatori disponibili").isVisible(), true);
  assert.equal(await page.getByRole("row").count(), 33);

  await page.close();
});

test("un secondo CSV valido richiede conferma prima di sostituire il Catalogo", async () => {
  const page = await openPage();
  await importRepresentativeCatalog(page);
  await page.locator("summary").filter({ hasText: "Sostituisci Catalogo calciatori" }).click();
  const csv = [
    "name,team,role,slot,pma,pfc,expectedFantamedia,expectedTitolarita,extra",
    ' NUOVO , CLUB_01 ,P," 1 "," 0 "," 2,3 "," 6,25 "," 92 ",ignorata',
  ].join("\n");

  await page.getByLabel("Seleziona CSV").setInputFiles({
    name: "catalogo-valido.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Conferma sostituzione" }).click();

  assert.equal(await page.getByText("32 calciatori disponibili").isVisible(), true);
  assert.equal(await page.getByRole("row").count(), 33);

  await page.close();
});

test("dopo un refresh il Catalogo confermato torna consultabile", async () => {
  const page = await openPage();
  await importRepresentativeCatalog(page);

  await page.reload();

  assert.equal(await page.getByRole("heading", { name: "Catalogo calciatori", exact: true }).isVisible(), true);
  assert.equal(await page.getByText("32 calciatori disponibili").isVisible(), true);
  assert.equal(await page.getByRole("row").count(), 33);

  await page.close();
});
