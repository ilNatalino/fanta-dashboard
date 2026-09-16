import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";
import { startServer } from "../scripts/serve.mjs";

let browser;
let server;

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

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

async function visibleTargetSizes(page) {
  return page.locator("button, input, select, summary, .primary-navigation a")
    .evaluateAll((elements) => elements
      .filter((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
      })
      .map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return { label: element.getAttribute("aria-label") ?? element.textContent.trim(), width, height };
      }));
}

function contrastRatio(foreground, background) {
  const luminance = (color) => {
    const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("la dashboard completa non crea overflow nelle quattro viewport del Catalogo rappresentativo", async () => {
  const page = await openActiveAuction();
  const views = ["Asta", "La mia rosa", "Squadre", "Catalogo", "Configurazione", "Backup"];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const view of views) {
      await page.getByRole("navigation", { name: "Navigazione primaria" })
        .getByRole("link", { name: view })
        .click();
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        true,
        `overflow in ${view} a ${viewport.width}x${viewport.height}`,
      );
    }
  }

  await page.close();
});

test("le azioni touch, reduced motion e stati principali restano percepibili", async () => {
  const page = await openActiveAuction({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const navigation = page.getByRole("navigation", { name: "Navigazione primaria" });
  const targetSizes = await visibleTargetSizes(page);
  assert.equal(targetSizes.every(({ width, height }) => width >= 44 && height >= 44), true, JSON.stringify(targetSizes));

  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page.locator("button, a, input, select, summary").evaluateAll((elements) => elements
      .map((element) => getComputedStyle(element).transitionDuration)
      .every((duration) => duration.split(", ").every((value) => value === "0s"))),
    true,
  );

  await navigation.getByRole("link", { name: "Asta" }).click();
  const search = page.getByLabel("Cerca il Calciatore chiamato");
  await search.fill("inesistente");
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  assert.equal(await page.getByRole("alert").isVisible(), true);
  assert.equal(
    await page.getByText("Nessun calciatore corrisponde al nome inserito.", { exact: true }).isVisible(),
    true,
  );

  await search.fill("GIOCATORE_D_01");
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption("main");
  await card.getByLabel("Prezzo finale").fill("9999");
  await card.getByRole("button", { name: "Registra Acquisto" }).click();
  assert.equal(await card.getByLabel("Prezzo finale").getAttribute("aria-invalid"), "true");
  assert.equal(await page.getByRole("alert").getByText(/prezzo finale/i).isVisible(), true);
  const cardTargetSizes = await visibleTargetSizes(page);
  assert.equal(cardTargetSizes.every(({ width, height }) => width >= 44 && height >= 44), true, JSON.stringify(cardTargetSizes));

  await card.getByLabel("Prezzo finale").fill("10");
  await card.getByRole("button", { name: "Registra Acquisto" }).click();
  assert.equal(await page.getByRole("status").getByText(/GIOCATORE_D_01 assegnato/).isVisible(), true);

  await page.close();
});

test("testo, placeholder, link e badge rispettano il contrasto nei due temi", async () => {
  const page = await openActiveAuction({ viewport: { width: 1280, height: 720 } });
  const navigation = page.getByRole("navigation", { name: "Navigazione primaria" });
  for (const themeAction of ["Usa tema chiaro", "Usa tema scuro"]) {
    for (const view of ["Asta", "La mia rosa", "Squadre", "Catalogo", "Configurazione", "Backup"]) {
      await navigation.getByRole("link", { name: view }).click();
      const contrastFailures = await page.locator(
        "button:not(:disabled), input, select, a, label, dt, dd, th, td, .role, .sos-fanta-tier, .notice, .errors",
      ).evaluateAll((elements) => {
        const parse = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number);
        const opaqueBackground = (element) => {
          for (let current = element; current; current = current.parentElement) {
            const color = getComputedStyle(current).backgroundColor;
            if (!color.startsWith("rgba") || !color.endsWith(", 0)")) return color;
          }
          return getComputedStyle(document.body).backgroundColor;
        };
        const visible = (element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
        };
        const ratio = (foreground, background) => {
          const relativeLuminance = (color) => parse(color).map((channel) => {
            const normalized = channel / 255;
            return normalized <= 0.04045
              ? normalized / 12.92
              : ((normalized + 0.055) / 1.055) ** 2.4;
          });
          const [red, green, blue] = relativeLuminance(foreground);
          const foregroundLuminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
          const [backgroundRed, backgroundGreen, backgroundBlue] = relativeLuminance(background);
          const backgroundLuminance = 0.2126 * backgroundRed + 0.7152 * backgroundGreen + 0.0722 * backgroundBlue;
          const values = [foregroundLuminance, backgroundLuminance].sort((left, right) => right - left);
          return (values[0] + 0.05) / (values[1] + 0.05);
        };
        return elements.filter(visible).flatMap((element) => {
          const style = getComputedStyle(element);
          const background = opaqueBackground(element);
          const checks = [{ foreground: style.color, background, minimum: 4.5, kind: "text" }];
          if (element.matches("input, select")) {
            checks.push({
              foreground: getComputedStyle(element, "::placeholder").color,
              background,
              minimum: 4.5,
              kind: "placeholder",
            });
          }
          return checks
            .filter(({ foreground }) => foreground !== "rgba(0, 0, 0, 0)")
            .filter(({ foreground, background, minimum }) => ratio(foreground, background) < minimum)
            .map(({ foreground, background, minimum, kind }) => ({
              kind,
              text: element.textContent.trim() || element.getAttribute("aria-label"),
              foreground,
              background,
              ratio: ratio(foreground, background),
              minimum,
            }));
        });
      });
      assert.deepEqual(contrastFailures, [], `${view} ${themeAction}: ${JSON.stringify(contrastFailures)}`);
    }
    await navigation.getByRole("link", { name: "Asta" }).click();
    const boundaryAudit = await page.getByLabel("Cerca il Calciatore chiamato").evaluate((element) => {
      element.focus();
      const style = getComputedStyle(element);
      return {
        focusColor: style.outlineColor,
        borderColor: style.borderTopColor,
        backgroundColor: style.backgroundColor,
        outlineWidth: style.outlineWidth,
      };
    });
    assert.equal(boundaryAudit.outlineWidth, "3px");
    assert.equal(
      contrastRatio(boundaryAudit.focusColor, boundaryAudit.backgroundColor) >= 3,
      true,
      JSON.stringify(boundaryAudit),
    );
    assert.equal(
      contrastRatio(boundaryAudit.borderColor, boundaryAudit.backgroundColor) >= 3,
      true,
      JSON.stringify(boundaryAudit),
    );
    await page.getByRole("button", { name: themeAction }).click();
  }
  await page.close();
});
