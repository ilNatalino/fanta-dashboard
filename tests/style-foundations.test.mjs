import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";
import { startServer } from "../scripts/serve.mjs";

let browser;
let server;

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
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test.before(async () => {
  server = await startServer(process.cwd());
  browser = await chromium.launch({ channel: "chrome", headless: true });
});

test.after(async () => {
  await browser?.close();
  await server?.close();
});

test("la tipografia del tabellino viene caricata soltanto dall'app", async () => {
  const page = await browser.newPage();
  const externalRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== new URL(server.url).origin) {
      externalRequests.push(request.url());
    }
  });

  await page.goto(server.url);
  await page.evaluate(() => document.fonts.ready);

  const presentation = {
    body: await page.locator("body").evaluate((element) => getComputedStyle(element).fontFamily),
    heading: await page.getByRole("heading", { name: "Importa il Catalogo calciatori" })
      .evaluate((element) => getComputedStyle(element).fontFamily),
    resources: await page.evaluate(() =>
      performance.getEntriesByType("resource")
        .map(({ name }) => new URL(name).pathname)
        .filter((pathname) => pathname.endsWith(".woff2"))
        .sort()
    ),
  };
  assert.equal(presentation.body, 'Barlow, system-ui, sans-serif');
  assert.equal(
    presentation.heading,
    '"Barlow Semi Condensed", Barlow, system-ui, sans-serif',
  );
  assert.equal(presentation.resources.length > 0, true);
  assert.equal(
    presentation.resources.every((pathname) => pathname.startsWith("/assets/fonts/")),
    true,
  );
  assert.equal(presentation.resources.includes("/assets/fonts/barlow-latin-400.woff2"), true);
  assert.equal(
    presentation.resources.includes("/assets/fonts/barlow-semi-condensed-latin-700.woff2"),
    true,
  );
  assert.deepEqual(externalRequests, []);

  await page.close();
});

test("i temi e gli stati mantengono una gerarchia visiva non soltanto cromatica", async () => {
  const page = await browser.newPage();
  await page.goto(server.url);

  const body = page.locator("body");
  const importPanel = page.getByRole("form", { name: "File del provider" });
  const importButton = page.getByRole("button", { name: "Importa catalogo" });
  const navigation = page.getByRole("navigation", { name: "Navigazione primaria" });
  const currentNavigation = navigation.getByRole("link", { name: "Catalogo" });
  const anotherNavigation = navigation.getByRole("link", { name: "Backup" });
  const disabledButton = page.getByRole("button", { name: "Avvia asta" });
  const readPresentation = async () => {
    const bodyStyle = await body.evaluate((element) => getComputedStyle(element));
    const buttonStyle = await importButton.evaluate((element) => getComputedStyle(element));
    const currentNavigationStyle = await currentNavigation
      .evaluate((element) => getComputedStyle(element));
    return {
      pageBackground: bodyStyle.backgroundColor,
      pageImage: bodyStyle.backgroundImage,
      primaryText: bodyStyle.color,
      panelBackground: await importPanel.evaluate((element) =>
        getComputedStyle(element).backgroundColor
      ),
      buttonBackground: buttonStyle.backgroundColor,
      buttonText: buttonStyle.color,
      accentText: currentNavigationStyle.color,
      currentNavigationHasBorder: currentNavigationStyle.borderBottomStyle !== "none"
        && currentNavigationStyle.borderBottomWidth !== "0px",
      currentNavigationWeight: Number(currentNavigationStyle.fontWeight),
      anotherNavigationWeight: Number(
        await anotherNavigation.evaluate((element) => getComputedStyle(element).fontWeight),
      ),
      disabledOpacity: Number(
        await disabledButton.evaluate((element) => getComputedStyle(element).opacity),
      ),
      numericVariant: bodyStyle.fontVariantNumeric,
    };
  };

  for (const nextThemeAction of ["Usa tema chiaro", "Usa tema scuro"]) {
    assert.equal(await page.getByRole("button", { name: nextThemeAction }).isVisible(), true);
    const presentation = await readPresentation();
    assert.equal(presentation.pageImage, "none");
    assert.notEqual(presentation.pageBackground, presentation.panelBackground);
    assert.notEqual(presentation.buttonBackground, presentation.accentText);
    assert.equal(await currentNavigation.getAttribute("aria-current"), "page");
    assert.equal(presentation.currentNavigationHasBorder, true);
    assert.equal(presentation.currentNavigationWeight > presentation.anotherNavigationWeight, true);
    assert.equal(presentation.disabledOpacity < 1, true);
    assert.match(presentation.numericVariant, /tabular-nums/);
    assert.equal(contrastRatio(presentation.primaryText, presentation.pageBackground) >= 4.5, true);
    assert.equal(contrastRatio(presentation.buttonText, presentation.buttonBackground) >= 4.5, true);
    assert.equal(contrastRatio(presentation.accentText, presentation.pageBackground) >= 4.5, true);
    await page.getByRole("button", { name: nextThemeAction }).click();
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await importButton.evaluate((element) =>
      getComputedStyle(element).transitionDuration
        .split(", ")
        .every((duration) => duration === "0s")
    ),
    true,
  );

  await page.getByLabel("Seleziona CSV").setInputFiles({
    name: "catalogo-non-valido.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("colonna\nvalore"),
  });
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  const alert = page.getByRole("alert");
  assert.equal(
    await alert.evaluate((element) => Number.parseFloat(getComputedStyle(element).borderLeftWidth) >= 3),
    true,
  );

  await page.close();
});
