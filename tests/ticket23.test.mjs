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

async function openAuction(page) {
  const catalog = [
    "name,team,role,slot,pma,pfc,expectedFantamedia,expectedTitolarita",
    "BASTONI,Inter,D,1,58,48,6.35,92",
    "BREMER,Juventus,D,1,61,53,6.39,92",
    "ABANKWAH,Genoa,D,5,3,2,5.8,30",
    "NESSUNO,Roma,D,2,10,8,6,50",
  ].join("\n");
  await page.getByLabel("Seleziona CSV").setInputFiles({
    name: "catalogo.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(catalog),
  });
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("4 calciatori disponibili").waitFor();
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
}

async function openPlayer(page, name) {
  await page.getByLabel("Cerca il Calciatore chiamato").fill(name);
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  return page.getByRole("region", { name: "Scheda d’asta" });
}

test("la Scheda d’asta mostra il profilo locale e lo richiude a ogni calciatore", async () => {
  const page = await browser.newPage();
  const profileResponse = page.waitForResponse((response) =>
    response.url().endsWith("/sos-fanta-profiles.json"),
  );
  await page.goto(server.url);
  assert.match((await profileResponse).headers()["content-type"], /application\/json/);
  await openAuction(page);

  let card = await openPlayer(page, "BASTONI");
  assert.equal(await card.locator(".sos-fanta-tier").innerText(), "TOP");
  const profile = card.locator("details.sos-fanta-profile");
  assert.equal(await profile.getAttribute("open"), null);
  await profile.getByText("Profilo SOS Fanta", { exact: true }).click();
  assert.equal(await profile.getAttribute("open"), "");
  assert.match(await profile.innerText(), /Alessandro Bastoni continua ad essere una scelta eccellente/i);

  card = await openPlayer(page, "BREMER");
  assert.equal(await card.locator(".sos-fanta-tier").innerText(), "TOP");
  assert.equal(await card.locator("details.sos-fanta-profile").getAttribute("open"), null);

  card = await openPlayer(page, "ABANKWAH");
  assert.equal(await card.locator(".sos-fanta-tier").innerText(), "JOLLY 3ª FASCIA");
  assert.equal(await card.locator("details.sos-fanta-profile").count(), 0);

  card = await openPlayer(page, "NESSUNO");
  assert.equal(await card.locator(".sos-fanta-tier").count(), 0);
  assert.equal(await card.locator("details.sos-fanta-profile").count(), 0);
  await page.close();
});

test("un JSON SOS Fanta non valido non blocca la dashboard", async () => {
  const page = await browser.newPage();
  await page.route("**/sos-fanta-profiles.json", (route) => route.fulfill({
    contentType: "application/json",
    body: "json non valido",
  }));
  await page.goto(server.url);
  assert.equal(await page.getByRole("heading", { name: "Importa il Catalogo calciatori" }).isVisible(), true);
  await page.close();
});
