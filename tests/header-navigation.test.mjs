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

async function openActiveAuction(options = {}) {
  const page = await browser.newPage(options);
  await page.goto(server.url);
  await page.getByLabel("Seleziona CSV").setInputFiles(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
  );
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  await page.getByLabel("Numero di Squadre").fill("4");
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  return page;
}

test("la testata compatta separa contesto e indicatori senza una capsula di navigazione", async () => {
  const page = await openActiveAuction({ viewport: { width: 1440, height: 900 } });
  const header = page.getByRole("banner");
  const navigation = page.getByRole("navigation", { name: "Navigazione primaria" });
  const links = navigation.getByRole("link");

  assert.deepEqual(await links.allTextContents(), [
    "Asta",
    "La mia rosa",
    "Squadre",
    "Catalogo",
    "Configurazione",
    "Backup",
  ]);
  assert.deepEqual(await links.evaluateAll((elements) => elements.map((link) => link.getAttribute("href"))), [
    "#auction",
    "#my-team",
    "#teams",
    "#catalog",
    "#configuration",
    "#backup",
  ]);

  const current = navigation.getByRole("link", { name: "Asta" });
  const inactiveLink = navigation.getByRole("link", { name: "Backup" });
  assert.equal(await current.getAttribute("aria-current"), "page");
  const readPresentation = (element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      borderBottomWidth: Number.parseFloat(style.borderBottomWidth),
      fontWeight: Number(style.fontWeight),
    };
  };
  const [currentPresentation, inactivePresentation] = await Promise.all([
    current.evaluate(readPresentation),
    inactiveLink.evaluate(readPresentation),
  ]);
  assert.equal(currentPresentation.background, inactivePresentation.background);
  assert.equal(currentPresentation.borderBottomWidth > inactivePresentation.borderBottomWidth, true);
  assert.equal(currentPresentation.fontWeight > inactivePresentation.fontWeight, true);

  const summary = header.getByRole("group", { name: "Riepilogo I Falchi" });
  assert.equal(await summary.locator("strong").innerText(), "I Falchi");
  assert.deepEqual(await summary.locator("dt").allTextContents(), [
    "Budget residuo",
    "Massimo spendibile",
    "Posti di ruolo",
  ]);
  assert.deepEqual(await summary.locator("dd").allTextContents(), [
    "1.000 crediti residui",
    "976 crediti spendibili",
    "0/25 posti",
  ]);
  const headerHeight = (await header.boundingBox()).height;
  assert.equal(headerHeight <= 112, true, `testata alta ${headerHeight}px`);

  await navigation.getByRole("link", { name: "La mia rosa" }).focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await navigation.getByRole("link", { name: "La mia rosa" }).getAttribute("aria-current"),
    "page",
  );

  await page.keyboard.press("/");
  assert.equal(
    await header.getByLabel("Cerca il Calciatore chiamato").evaluate((element) => element === document.activeElement),
    true,
  );
  await header.getByLabel("Cerca il Calciatore chiamato").fill("GIOCATORE_D_01");
  await page.keyboard.press("Enter");
  assert.equal(await page.getByRole("heading", { name: "GIOCATORE_D_01" }).isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("heading", { name: "GIOCATORE_D_01" }).count(), 0);

  await page.close();
});

test("su touch la navigazione scorre senza allargare il documento e mostra la vista corrente", async () => {
  const page = await openActiveAuction({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const navigation = page.getByRole("navigation", { name: "Navigazione primaria" });

  await navigation.getByRole("link", { name: "Backup" }).click();
  const current = navigation.getByRole("link", { name: "Backup" });
  assert.equal(await current.getAttribute("aria-current"), "page");
  assert.equal(
    await current.evaluate((element) => {
      const item = element.getBoundingClientRect();
      const container = element.parentElement.getBoundingClientRect();
      return item.left >= container.left && item.right <= container.right;
    }),
    true,
  );
  assert.equal(await navigation.evaluate((element) => element.scrollLeft > 0), true);

  await navigation.getByRole("link", { name: "Asta" }).click();
  await page.getByLabel("Cerca il Calciatore chiamato").fill("GIOCATORE_D_01");
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  await page.getByRole("button", { name: "Crea categoria" }).click();
  const catalog = navigation.getByRole("link", { name: "Catalogo" });
  assert.equal(await catalog.getAttribute("aria-current"), "page");
  const catalogVisibility = await catalog.evaluate((element) => {
    const item = element.getBoundingClientRect();
    const container = element.parentElement.getBoundingClientRect();
    return {
      visible: item.left >= container.left && item.right <= container.right,
      item: { left: item.left, right: item.right },
      container: { left: container.left, right: container.right },
      scrollLeft: element.parentElement.scrollLeft,
    };
  });
  assert.equal(
    catalogVisibility.visible,
    true,
    JSON.stringify(catalogVisibility),
  );

  const targetSizes = await headerTargetSizes(page);
  assert.equal(
    targetSizes.every(({ width, height }) => width >= 44 && height >= 44),
    true,
  );

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `overflow orizzontale a ${viewport.width}px`,
    );
  }

  await page.close();
});

async function headerTargetSizes(page) {
  const header = page.getByRole("banner");
  const controls = await header.locator("button, input").evaluateAll(
    (elements) => elements.map((element) => {
      const { width, height } = element.getBoundingClientRect();
      return { width, height };
    }),
  );
  const destinations = await header.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link")
    .evaluateAll((elements) => elements.map((element) => {
      const { width, height } = element.getBoundingClientRect();
      return { width, height };
    }));
  return [...controls, ...destinations];
}
