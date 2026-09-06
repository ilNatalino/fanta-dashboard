import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import { chromium } from "playwright";
import { startServer } from "../scripts/serve.mjs";

const execFileAsync = promisify(execFile);

let appUrl;
let browser;
let server;
let temporaryRoot;

async function buildPwa(releaseId) {
  await execFileAsync("npm", ["run", "build:pwa"], {
    cwd: process.cwd(),
    env: { ...process.env, PWA_RELEASE_ID: releaseId },
  });
}

async function publishPwa(releaseId, { title, missingFile } = {}) {
  await buildPwa(releaseId);
  if (title) {
    const updatedIndex = (await readFile("_site/index.html", "utf8")).replace(
      "<title>Asta Fantacalcio</title>",
      `<title>${title}</title>`,
    );
    await writeFile("_site/index.html", updatedIndex);
  }
  if (missingFile) await rm(join("_site", missingFile));

  const publishedApp = join(temporaryRoot, "fanta-dashboard");
  await rm(publishedApp, { recursive: true, force: true });
  await cp("_site", publishedApp, { recursive: true });
}

async function openControlledPage(context) {
  const page = await context.newPage();
  await page.goto(appUrl);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  assert.equal(await page.evaluate(() => navigator.serviceWorker.controller !== null), true);
  return page;
}

async function importRepresentativeCatalog(page) {
  await page.getByLabel("Seleziona CSV").setInputFiles(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
  );
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("32 calciatori disponibili").waitFor();
}

async function startAuctionWithPurchase(page) {
  await importRepresentativeCatalog(page);
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  await page.getByLabel("Cerca il Calciatore chiamato").fill("GIOCATORE_D_01");
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption("opponent-2");
  await card.getByLabel("Prezzo finale").fill("10");
  await card.getByRole("button", { name: "Registra Acquisto" }).click();
  await card.getByRole("status").getByText(
    "GIOCATORE_D_01 assegnato a Squadra 2 per 10 crediti. Budget residuo: 990 crediti.",
  ).waitFor();
}

async function assertAuctionWithPurchase(page) {
  assert.equal(
    await page.getByRole("heading", { name: "Asta attiva", exact: true }).isVisible(),
    true,
  );
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Squadre" })
    .click();
  const defenders = page.getByRole("region", { name: "DIF di Squadra 2" });
  const purchases = defenders.getByRole("list", { name: "Acquisti DIF di Squadra 2" });
  assert.deepEqual(await purchases.locator("li > span").allTextContents(), ["GIOCATORE_D_01"]);
  assert.deepEqual(await purchases.locator("li > strong").allTextContents(), ["10"]);
}

async function updateServiceWorker(page, expectedState) {
  return page.evaluate(async (state) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error("Service worker non registrato");
    await registration.update();
    const worker = registration.waiting ?? registration.installing;
    if (!worker) throw new Error("Aggiornamento non rilevato");
    if (worker.state !== state) {
      await new Promise((resolve, reject) => {
        worker.addEventListener("statechange", () => {
          if (worker.state === state) resolve(undefined);
          if (state === "installed" && worker.state === "redundant") {
            reject(new Error("Installazione aggiornamento fallita"));
          }
        });
      });
    }
    return worker.state;
  }, expectedState);
}

test.before(async () => {
  await buildPwa("release-one");

  temporaryRoot = await mkdtemp(join(tmpdir(), "fanta-dashboard-pwa-"));
  await cp("_site", join(temporaryRoot, "fanta-dashboard"), { recursive: true });
  server = await startServer(temporaryRoot);
  browser = await chromium.launch({ channel: "chrome", headless: true });
  appUrl = `${server.url}/fanta-dashboard/index.html`;
});

test.after(async () => {
  await browser?.close();
  await server?.close();
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
});

test("l'artefatto PWA è installabile da un percorso non-root", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const failedResources = [];
  page.on("requestfailed", (request) => failedResources.push(request.url()));
  page.on("response", (response) => {
    if (response.status() >= 400) failedResources.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(appUrl);
  await page.getByRole("heading", { name: "Importa il Catalogo calciatori" }).waitFor();

  const manifest = await page.evaluate(async () => {
    const href = document.querySelector('link[rel="manifest"]')?.getAttribute("href");
    if (!href) throw new Error("Manifest non collegato");
    return fetch(href).then((response) => response.json());
  });
  assert.equal(manifest.name, "Asta Fantacalcio");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./index.html");
  assert.equal(manifest.scope, "./");
  assert.deepEqual(manifest.icons.map(({ sizes }) => sizes), ["192x192", "512x512"]);

  const serviceWorkerScope = await page.evaluate(() =>
    navigator.serviceWorker.ready.then((registration) => registration.scope)
  );
  assert.match(serviceWorkerScope, /\/fanta-dashboard\/$/);
  assert.deepEqual(failedResources, []);

  for (const [path, contentType] of [
    ["styles.css", "text/css"],
    ["manifest.webmanifest", "application/manifest+json"],
    ["service-worker.js", "text/javascript"],
    ["assets/app-icon-192.png", "image/png"],
    ["assets/app-icon-512.png", "image/png"],
    ["assets/tabler-icons.svg", "image/svg+xml"],
    ["sos-fanta-profiles.json", "application/json"],
    ["dist/browser-storage.js", "text/javascript"],
    ["dist/catalog-application.js", "text/javascript"],
    ["dist/catalog-view.js", "text/javascript"],
    ["dist/main.js", "text/javascript"],
  ]) {
    const response = await page.request.get(new URL(`./${path}`, appUrl).href);
    assert.equal(response.status(), 200, path);
    assert.equal(response.headers()["content-type"].startsWith(contentType), true, path);
  }

  const sourceResponse = await page.request.get(
    new URL("./src/main.ts", appUrl).href,
  );
  assert.equal(sourceResponse.status(), 404);
  const testResponse = await page.request.get(
    new URL("./tests/pwa.test.mjs", appUrl).href,
  );
  assert.equal(testResponse.status(), 404);

  await context.close();
});

test("l'Asta attiva resta disponibile dopo la riapertura offline", async () => {
  const context = await browser.newContext();
  let page = await openControlledPage(context);
  await startAuctionWithPurchase(page);

  await page.close();
  await context.setOffline(true);
  page = await context.newPage();
  await page.goto(appUrl);

  await assertAuctionWithPurchase(page);

  await context.close();
});

test("l'aggiornamento attende la chiusura e conserva l'Asta attiva", async () => {
  const context = await browser.newContext();
  let page = await openControlledPage(context);
  await startAuctionWithPurchase(page);
  await publishPwa("release-two", { title: "Asta Fantacalcio · release 2" });

  const waitingState = await updateServiceWorker(page, "installed");
  assert.equal(waitingState, "installed");
  assert.equal(await page.title(), "Asta Fantacalcio");

  await page.close();
  page = await context.newPage();
  await page.goto(appUrl);
  assert.equal(await page.title(), "Asta Fantacalcio · release 2");
  await assertAuctionWithPurchase(page);

  await context.close();
});

test("un aggiornamento incompleto conserva l'ultima versione disponibile offline", async () => {
  const context = await browser.newContext();
  let page = await openControlledPage(context);
  const stableTitle = await page.title();
  await importRepresentativeCatalog(page);
  await publishPwa("release-incomplete", { missingFile: "assets/tabler-icons.svg" });

  const failedState = await updateServiceWorker(page, "redundant");
  assert.equal(failedState, "redundant");
  assert.equal(await page.title(), stableTitle);

  await page.close();
  await context.setOffline(true);
  page = await context.newPage();
  await page.goto(appUrl);
  assert.equal(await page.title(), stableTitle);
  assert.equal(await page.getByText("32 calciatori disponibili").isVisible(), true);

  await context.close();
});
