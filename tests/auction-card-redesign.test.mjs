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

async function openAuction(viewport = { width: 1280, height: 720 }) {
  const page = await browser.newPage({ viewport });
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

async function openPlayer(page, playerName) {
  const header = page.getByRole("banner");
  await header.getByLabel("Cerca il Calciatore chiamato").fill(playerName);
  await header.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  return page.getByRole("region", { name: "Scheda d’asta" });
}

async function assignPlayer(page, playerName, teamId, finalPrice) {
  const card = await openPlayer(page, playerName);
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  const form = card.getByRole("form", { name: "Registra Acquisto" });
  await form.getByLabel("Squadra").selectOption(teamId);
  await form.getByLabel("Prezzo finale").fill(String(finalPrice));
  await form.getByRole("button", { name: "Registra Acquisto" }).click();
}

test("la zona decisionale resta nella prima finestra e il modulo sostituisce il comando", async () => {
  const page = await openAuction();
  const card = await openPlayer(page, "GIOCATORE_D_01");
  const decision = card.getByRole("region", { name: "Decisione per GIOCATORE_D_01" });

  assert.deepEqual(
    await decision.locator("[data-player-identity] dd").allTextContents(),
    ["CLUB_06", "DIF", "Slot 1"],
  );
  assert.equal(
    await decision.getByRole("group", { name: "Riferimento provider" }).getByText("143", { exact: true }).isVisible(),
    true,
  );
  assert.equal(
    await decision.getByRole("group", { name: "Segnale Asta attiva" })
      .getByText("0 di 3 acquisti nel ruolo", { exact: true })
      .isVisible(),
    true,
  );

  const firstWindowTargets = [
    decision.getByRole("heading", { name: "GIOCATORE_D_01" }),
    decision.getByText("143", { exact: true }),
    decision.getByText("0 di 3 acquisti nel ruolo", { exact: true }),
    page.getByRole("banner").getByText("976 crediti spendibili", { exact: true }),
    decision.getByRole("button", { name: "Assegna giocatore" }),
  ];
  for (const target of firstWindowTargets) {
    const box = await target.boundingBox();
    assert.ok(box, "elemento decisionale non renderizzato");
    assert.equal(box.y >= 0 && box.y + box.height <= 720, true, JSON.stringify(box));
  }

  await decision.getByRole("button", { name: "Assegna giocatore" }).click();
  assert.equal(await decision.getByRole("button", { name: "Assegna giocatore" }).count(), 0);
  const form = decision.getByRole("form", { name: "Registra Acquisto" });
  assert.equal(await form.getByLabel("Squadra").isVisible(), true);
  assert.equal(await form.getByLabel("Prezzo finale").isVisible(), true);
  assert.deepEqual(await form.locator("button").allTextContents(), ["Registra Acquisto"]);

  await page.close();
});

test("la soglia e gli errori accompagnano la registrazione senza perdere contesto", async () => {
  const page = await openAuction();

  await assignPlayer(page, "GIOCATORE_D_02", "opponent-2", 48);
  await assignPlayer(page, "GIOCATORE_D_03", "opponent-2", 30);

  let card = await openPlayer(page, "GIOCATORE_D_04");
  assert.equal(
    await card.getByRole("group", { name: "Segnale Asta attiva" })
      .getByText("2 di 3 acquisti nel ruolo", { exact: true })
      .isVisible(),
    true,
  );
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption("opponent-2");
  await card.getByLabel("Prezzo finale").fill("20");
  await card.getByRole("button", { name: "Registra Acquisto" }).click();

  card = await openPlayer(page, "GIOCATORE_D_05");
  const liveSignal = card.getByRole("group", { name: "Segnale Asta attiva" });
  assert.match(await liveSignal.innerText(), /Prezzo adattato all’asta\s+\d+ crediti/);
  assert.match(await liveSignal.innerText(), /3 acquisti nel ruolo/i);
  assert.equal(await liveSignal.getByText("Dati insufficienti", { exact: true }).count(), 0);

  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  let form = card.getByRole("form", { name: "Registra Acquisto" });
  await form.getByLabel("Squadra").selectOption("main");
  await form.getByLabel("Prezzo finale").fill("2000");
  const scrollBeforeError = await page.evaluate(() => window.scrollY);
  await form.getByRole("button", { name: "Registra Acquisto" }).click();

  form = card.getByRole("form", { name: "Registra Acquisto" });
  const price = form.getByLabel("Prezzo finale");
  const errorId = await price.getAttribute("aria-describedby");
  assert.equal(await price.getAttribute("aria-invalid"), "true");
  assert.equal(errorId, "purchase-price-error");
  assert.equal(
    await form.locator(`#${errorId}`).getByText("Il prezzo finale supera il budget disponibile.", { exact: true }).isVisible(),
    true,
  );
  assert.equal(await form.getByLabel("Squadra").inputValue(), "main");
  assert.equal(await price.inputValue(), "2000");
  assert.equal(Math.abs(await page.evaluate(() => window.scrollY) - scrollBeforeError) <= 2, true);

  await price.fill("10");
  await form.getByRole("button", { name: "Registra Acquisto" }).click();
  assert.equal(
    await page.getByRole("status").getByText(/GIOCATORE_D_05 assegnato a I Falchi per 10 crediti/).isVisible(),
    true,
  );
  assert.equal(
    await page.getByRole("banner").getByText("990 crediti residui", { exact: true }).isVisible(),
    true,
  );

  await page.close();
});

test("profilo, Alternative immediate e Acquisto restano operabili da tastiera nei due temi", async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(server.url);
  const catalog = [
    "name,team,role,slot,pma,pfc,expectedFantamedia,expectedTitolarita",
    "BASTONI,Inter,D,1,58,48,6.35,92",
    "BREMER,Juventus,D,1,61,53,6.39,92",
    "ALTERNATIVA,Roma,D,1,50,41,6.10,80",
  ].join("\n");
  await page.getByLabel("Seleziona CSV").setInputFiles({
    name: "catalogo.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(catalog),
  });
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();

  const search = page.getByRole("banner").getByLabel("Cerca il Calciatore chiamato");
  await search.focus();
  await search.fill("BASTONI");
  await page.keyboard.press("Enter");
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  const heading = card.getByRole("heading", { name: "BASTONI" });
  assert.equal(await heading.evaluate((element) => element === document.activeElement), true);
  assert.deepEqual(
    await card.locator("[data-player-identity] dd").allTextContents(),
    ["Inter", "DIF", "Slot 1", "TOP"],
  );

  for (const themeAction of ["Usa tema chiaro", "Usa tema scuro"]) {
    const tier = card.locator(".sos-fanta-tier");
    const colors = await tier.evaluate((element) => ({
      foreground: getComputedStyle(element).color,
      background: getComputedStyle(element.closest(".card")).backgroundColor,
    }));
    assert.equal(contrastRatio(colors.foreground, colors.background) >= 4.5, true, JSON.stringify(colors));
    await page.getByRole("button", { name: themeAction }).click();
  }

  const profile = card.locator("details.sos-fanta-profile");
  const summary = profile.getByText("Profilo SOS Fanta", { exact: true });
  await summary.focus();
  await page.keyboard.press("Enter");
  assert.equal(await profile.getAttribute("open"), "");

  const alternativeRows = card.locator("[data-alternative-row]");
  assert.deepEqual(
    await alternativeRows.evaluateAll((rows) => rows.map((row) =>
      [...row.querySelectorAll("[data-alternative-cell]")].map((cell) => cell.textContent.trim())
    )),
    [
      ["BREMER", "Juventus", "PFC 53"],
      ["ALTERNATIVA", "Roma", "PFC 41"],
    ],
  );

  const assign = card.getByRole("button", { name: "Assegna giocatore" });
  await assign.focus();
  await page.keyboard.press("Enter");
  const form = card.getByRole("form", { name: "Registra Acquisto" });
  const team = form.getByLabel("Squadra");
  assert.equal(await team.evaluate((element) => element === document.activeElement), true);
  await page.keyboard.type("I Falchi");
  assert.equal(await team.inputValue(), "main");
  await page.keyboard.press("Tab");
  await page.keyboard.type("10");
  await page.keyboard.press("Tab");
  assert.equal(
    await form.getByRole("button", { name: "Registra Acquisto" })
      .evaluate((element) => element === document.activeElement),
    true,
  );
  await page.keyboard.press("Enter");
  assert.equal(await page.getByRole("status").getByText(/BASTONI assegnato a I Falchi/).isVisible(), true);

  await page.close();
});
