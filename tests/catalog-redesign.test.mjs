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

async function openCatalog(options = {}) {
  const page = await browser.newPage(options);
  await page.goto(server.url);
  await page.getByLabel("Seleziona CSV").setInputFiles(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
  );
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("32 calciatori disponibili").waitFor();
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function startAuction(page) {
  const navigation = page.getByRole("navigation", { name: "Navigazione primaria" });
  await navigation.getByRole("link", { name: "Asta" }).click();
  await page.getByLabel("Numero di Squadre").fill("4");
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  await navigation.getByRole("link", { name: "Catalogo" }).click();
}

test("il Catalogo mostra almeno otto righe nella prima finestra desktop anche durante l’Asta attiva", async () => {
  const page = await openCatalog({ viewport: { width: 1280, height: 720 } });
  for (const active of [false, true]) {
    if (active) await startAuction(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    const table = page.getByRole("table");
    const visibleRows = await table.locator("tbody tr").evaluateAll((rows) => rows.filter((row) => {
      const box = row.getBoundingClientRect();
      return box.top >= 0 && box.bottom <= window.innerHeight;
    }).length);
    assert.ok(visibleRows >= 8, `${visibleRows} righe visibili, asta attiva: ${active}`);
    const heights = await table.getByRole("row").evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));
    assert.ok(Math.max(...heights) - Math.min(...heights) <= 1, `altezze: ${heights}`);
    assert.equal(await table.getByRole("columnheader").count(), active ? 10 : 9);
  }
  await page.close();
});

test("filtri e ordinamento conservano focus e indicano colonna e direzione da tastiera", async () => {
  const page = await openCatalog({ viewport: { width: 1280, height: 720 } });
  const filters = page.getByRole("region", { name: "Ricerca e filtri del Catalogo" });
  const defenders = filters.getByRole("button", { name: "DIF", exact: true });
  await defenders.focus();
  await page.keyboard.press("Space");
  assert.equal(await defenders.getAttribute("aria-pressed"), "true");
  assert.equal(await defenders.evaluate((element) => element === document.activeElement), true);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  assert.equal(await filters.getByRole("button", { name: "CEN", exact: true }).getAttribute("aria-pressed"), "true");
  const slot = filters.getByRole("group", { name: "Slot" }).getByRole("button", { name: "1", exact: true });
  await slot.focus();
  await page.keyboard.press("Enter");
  assert.equal(await slot.evaluate((element) => element === document.activeElement), true);
  await filters.getByLabel("Cerca per nome o squadra reale").fill("club_06");
  assert.equal(await page.getByText("1 calciatore su 32").isVisible(), true);
  const sort = page.getByRole("button", { name: /Ordina Nome/ });
  await sort.focus();
  await page.keyboard.press("Enter");
  const nameHeader = page.getByRole("columnheader", { name: /Nome/ });
  assert.equal(await nameHeader.getAttribute("aria-sort"), "ascending");
  assert.equal(await sort.evaluate((element) => element === document.activeElement), true);
  await page.keyboard.press("Enter");
  assert.equal(await nameHeader.getAttribute("aria-sort"), "descending");
  assert.equal(await page.getByRole("columnheader", { name: /PFC/ }).getAttribute("aria-sort"), null);
  const reset = filters.getByRole("button", { name: "Azzera ricerca e filtri" });
  await reset.focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.getByText("32 calciatori su 32").isVisible(), true);
  assert.equal(await filters.getByLabel("Cerca per nome o squadra reale").evaluate((element) => element === document.activeElement), true);
  assert.equal(await nameHeader.getAttribute("aria-sort"), "descending");
  await page.close();
});

test("la lista mobile ordina, combina i filtri e azzera una ricerca vuota con controlli touch", async () => {
  const page = await openCatalog({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await startAuction(page);
  const filters = page.getByRole("region", { name: "Ricerca e filtri del Catalogo" });
  const order = filters.getByLabel("Ordina Catalogo per");
  assert.equal(await order.isVisible(), true);
  assert.equal(await order.inputValue(), "pfc");
  const direction = filters.getByLabel("Direzione ordinamento");
  assert.equal(await direction.inputValue(), "descending");
  const list = page.getByRole("list", { name: "Catalogo calciatori mobile" });
  const first = list.getByRole("listitem").first();
  const summary = first.locator("summary");
  const identity = await summary.innerText();
  assert.match(identity, /GIOCATORE_A_01[\s\S]*CLUB_06[\s\S]*ATT[\s\S]*Slot 1[\s\S]*PFC[\s\S]*388,3/);
  await summary.tap();
  assert.match(await first.innerText(), /PMA[\s\S]*357,6[\s\S]*Fantamedia prevista[\s\S]*7,54[\s\S]*Titolarità prevista[\s\S]*92%[\s\S]*Shortlist[\s\S]*Disponibile/);
  await order.selectOption("name");
  assert.equal(await direction.inputValue(), "ascending");
  assert.match(await list.getByRole("listitem").first().innerText(), /GIOCATORE_A_01/);
  await direction.selectOption("descending");
  assert.match(await list.getByRole("listitem").first().innerText(), /GIOCATORE_P_08/);
  await filters.getByRole("button", { name: "DIF", exact: true }).tap();
  await filters.getByRole("button", { name: "CEN", exact: true }).tap();
  await filters.getByRole("group", { name: "Slot" }).getByRole("button", { name: "1", exact: true }).tap();
  await filters.getByRole("button", { name: "Disponibili", exact: true }).tap();
  await filters.getByLabel("Cerca per nome o squadra reale").fill("club_06");
  assert.equal(await page.getByText("1 calciatore su 32").isVisible(), true);
  assert.match(await list.innerText(), /GIOCATORE_D_01/);
  await filters.getByLabel("Cerca per nome o squadra reale").fill("inesistente");
  assert.equal(await list.getByText("Nessun calciatore corrisponde alla ricerca e ai filtri selezionati.").isVisible(), true);
  await list.getByRole("button", { name: "Azzera ricerca e filtri" }).tap();
  assert.equal(await page.getByText("32 calciatori su 32").isVisible(), true);
  assert.equal(await direction.inputValue(), "descending");
  const sizes = await filters.locator("button, input, select").evaluateAll((elements) => elements.map((element) => {
    const { width, height } = element.getBoundingClientRect();
    return { width, height };
  }));
  assert.ok(sizes.every(({ width, height }) => width >= 44 && height >= 44), JSON.stringify(sizes));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.close();
});

test("Shortlist e Correzione dell’acquisto restano utilizzabili con tastiera e touch", async () => {
  for (const mobile of [false, true]) {
    const page = await openCatalog({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    await page.locator("summary").filter({ hasText: "Gestisci Shortlist" }).click();
    await page.getByLabel("Nuova categoria").fill("Osservati");
    await page.getByRole("button", { name: "Crea categoria" }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const context = mobile ? " mobile" : "";
    const player = mobile
      ? page.getByRole("list", { name: "Catalogo calciatori mobile" }).getByRole("listitem").filter({ hasText: "GIOCATORE_D_01" })
      : page.getByRole("row", { name: /^GIOCATORE_D_01/ });
    if (mobile) await player.locator("summary").tap();
    await player.getByLabel(`GIOCATORE_D_01${context} · Osservati`).check();
    if (mobile) await player.locator("summary").tap();
    assert.equal(await player.getByText("In Shortlist", { exact: true }).isVisible(), true);
    await startAuction(page);
    const navigation = page.getByRole("navigation", { name: "Navigazione primaria" });
    await navigation.getByRole("link", { name: "Asta" }).click();
    await page.getByLabel("Cerca il Calciatore chiamato").fill("GIOCATORE_D_01");
    await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
    const card = page.getByRole("region", { name: "Scheda d’asta" });
    await card.getByRole("button", { name: "Assegna giocatore" }).click();
    await card.getByLabel("Squadra").selectOption("opponent-2");
    await card.getByLabel("Prezzo finale").fill("157");
    await card.getByRole("button", { name: "Registra Acquisto" }).click();
    await navigation.getByRole("link", { name: "Catalogo" }).click();
    const purchased = page.getByRole("group", { name: "Stato" }).getByRole("button", { name: "Acquistati", exact: true });
    if (mobile) await purchased.tap();
    else {
      await purchased.focus();
      await page.keyboard.press("Enter");
      assert.equal(await purchased.evaluate((element) => element === document.activeElement), true);
    }
    if (mobile) await player.locator("summary").tap();
    const edit = player.getByRole("button", { name: `Correggi Acquisto${context} GIOCATORE_D_01`, exact: true });
    if (mobile) await edit.tap();
    else {
      await edit.focus();
      await page.keyboard.press("Enter");
    }
    const form = player.getByRole("form", { name: `Correzione${context} dell’acquisto GIOCATORE_D_01` });
    assert.equal(await form.getByLabel("Squadra").evaluate((element) => element === document.activeElement), true);
    await form.getByLabel("Squadra").selectOption("main");
    await form.getByLabel("Prezzo finale").fill("1001");
    await form.getByRole("button", { name: "Salva Correzione dell’acquisto" }).click();
    assert.equal(await form.getByRole("alert").isVisible(), true);
    assert.equal(await form.getByLabel("Prezzo finale").inputValue(), "1001");
    await form.getByLabel("Prezzo finale").fill("120");
    if (mobile) await form.getByRole("button", { name: "Salva Correzione dell’acquisto" }).tap();
    else {
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
    }
    if (mobile) await player.locator("summary").tap();
    assert.match(await player.innerText(), /Acquistato · I Falchi · 120 crediti/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    page.once("dialog", (dialog) => dialog.accept());
    await player.getByRole("button", { name: `Annulla Acquisto${context} GIOCATORE_D_01`, exact: true }).click();
    assert.equal(await page.getByText("0 calciatori su 32").isVisible(), true);
    await page.close();
  }
});

test("il Catalogo conserva sticky, confronto numerico e indicazioni visive nei due temi senza overflow", async () => {
  const page = await openCatalog({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await startAuction(page);
  for (const theme of ["dark", "light"]) {
    if (theme === "light") await page.getByRole("button", { name: "Usa tema chiaro" }).click();
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1280, height: 720 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${theme}, ${viewport.width}`);
      await page.locator("summary").filter({ hasText: "Gestisci Shortlist" }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Shortlist aperta, ${theme}, ${viewport.width}`);
      await page.locator("summary").filter({ hasText: "Gestisci Shortlist" }).click();
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    const table = page.getByRole("table");
    const cells = table.locator("tbody tr").first().getByRole("cell");
    for (const index of [2, 3, 4, 5, 6]) {
      const presentation = await cells.nth(index).evaluate((element) => {
        const style = getComputedStyle(element);
        return { numbers: style.fontVariantNumeric, alignment: style.textAlign };
      });
      assert.match(presentation.numbers, /tabular-nums/);
    assert.equal(presentation.alignment, "right");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileMetrics = page.getByRole("list", { name: "Catalogo calciatori mobile" })
      .getByRole("listitem").first();
    await mobileMetrics.locator("summary").click();
    const mobileMetricStyles = await mobileMetrics.locator("dd").evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element);
      return { numbers: style.fontVariantNumeric, alignment: style.textAlign };
    }));
    assert.ok(mobileMetricStyles.every(({ numbers, alignment }) => numbers.includes("tabular-nums") && alignment === "right"), JSON.stringify(mobileMetricStyles));
    assert.equal(await mobileMetrics.locator("summary").evaluate((element) => getComputedStyle(element, "::marker").content), "normal");
    assert.equal(await mobileMetrics.locator("summary").locator(".catalog-mobile-disclosure").isVisible(), true);
    await mobileMetrics.locator("summary").click();
    await page.setViewportSize({ width: 1280, height: 720 });
    const row = table.locator("tbody tr").first();
    const rowHeader = row.getByRole("rowheader");
    await page.getByRole("heading", { name: "Catalogo calciatori", exact: true }).hover();
    const before = await rowHeader.evaluate((element) => getComputedStyle(element).backgroundColor);
    await cells.nth(4).hover();
    const after = await rowHeader.evaluate((element) => getComputedStyle(element).backgroundColor);
    assert.notEqual(after, before);
    assert.equal(await row.evaluate((element) => getComputedStyle(element).backgroundColor), after);
    const header = table.getByRole("columnheader", { name: /PFC/ });
    const indicator = header.locator('[aria-hidden="true"]');
    assert.equal(await indicator.evaluate((element) => getComputedStyle(element, "::before").content), '"↓"');
    await header.getByRole("button").click();
    assert.equal(await indicator.evaluate((element) => getComputedStyle(element, "::before").content), '"↑"');
    await header.getByRole("button").click();
    const frame = page.getByRole("region", { name: "Tabella del Catalogo" });
    await frame.scrollIntoViewIfNeeded();
    const headerBefore = await header.boundingBox();
    await frame.evaluate((element) => { element.scrollTop = 300; element.scrollLeft = 100; });
    const headerAfter = await header.boundingBox();
    assert.ok(Math.abs(headerAfter.y - headerBefore.y) <= 1);
    const frameBox = await frame.boundingBox();
    const rowBox = await table.getByRole("rowheader").nth(8).boundingBox();
    assert.ok(Math.abs(rowBox.x - frameBox.x) <= 2);
    await frame.evaluate((element) => { element.scrollTop = 0; element.scrollLeft = 0; });
    await page.evaluate(() => window.scrollTo(0, 100));
    const filterBox = await page.getByRole("region", { name: "Ricerca e filtri del Catalogo" }).boundingBox();
    const bannerBox = await page.getByRole("banner").boundingBox();
    assert.ok(filterBox.y >= bannerBox.y + bannerBox.height);
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.close();
});
