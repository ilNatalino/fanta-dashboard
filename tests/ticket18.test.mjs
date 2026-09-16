import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

async function openActiveAuction(teamCount = 4) {
  const page = await browser.newPage();
  await page.goto(server.url);
  await page.getByLabel("Seleziona CSV").setInputFiles(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
  );
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.getByText("32 calciatori disponibili").waitFor({ state: "visible" });
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Asta" })
    .click();
  await page.getByLabel("Numero di Squadre").fill(String(teamCount));
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  return page;
}

async function assignPlayer(page, playerName, teamId, finalPrice) {
  const header = page.getByRole("banner");
  await header.getByLabel("Cerca il Calciatore chiamato").fill(playerName);
  await header.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption(teamId);
  await card.getByLabel("Prezzo finale").fill(String(finalPrice));
  await card.getByRole("button", { name: "Registra Acquisto" }).click();
}

test("la navigazione primaria apre le viste operative e la Configurazione mantenendo ricerca e riepilogo", async () => {
  const page = await openActiveAuction();
  const navigation = page.getByRole("navigation", { name: "Navigazione primaria" });
  const header = page.getByRole("banner");

  assert.deepEqual(
    await navigation.getByRole("link").allTextContents(),
    ["Asta", "La mia rosa", "Squadre", "Catalogo", "Configurazione", "Backup"],
  );
  assert.equal(await navigation.getByRole("link", { name: "Asta" }).getAttribute("aria-current"), "page");
  assert.equal(await header.getByLabel("Cerca il Calciatore chiamato").isVisible(), true);
  assert.match(await header.getByRole("group", { name: "Riepilogo I Falchi" }).innerText(), /1\.000 crediti residui[\s\S]*976 crediti spendibili[\s\S]*0\/25 posti/);
  assert.equal(
    await page.locator(".active-topbar + *").evaluate((content) => getComputedStyle(content).marginTop),
    "24px",
  );

  await navigation.getByRole("link", { name: "La mia rosa" }).click();
  assert.equal(await page.locator(".roster-view > .active-heading").count(), 0);
  assert.equal(await page.locator("#my-roster-title").getAttribute("class"), "visually-hidden");
  assert.equal(await header.getByLabel("Cerca il Calciatore chiamato").isVisible(), true);

  await navigation.getByRole("link", { name: "Squadre" }).click();
  assert.equal(await page.locator(".teams-view > .active-heading").count(), 0);
  assert.equal(await page.locator("#teams-title").getAttribute("class"), "visually-hidden");
  assert.equal(await header.getByRole("group", { name: "Riepilogo I Falchi" }).isVisible(), true);

  await navigation.getByRole("link", { name: "Configurazione" }).click();
  assert.equal(await page.getByRole("heading", { name: "Configurazione d’asta", exact: true }).isVisible(), true);
  assert.equal(await page.locator(".configuration-view details").count(), 0);
  assert.equal(await page.getByLabel("Numero di Squadre").isDisabled(), true);

  await header.getByLabel("Cerca il Calciatore chiamato").fill("GIOCATORE_D_01");
  await header.getByRole("button", { name: "Apri Scheda d’asta" }).click();
  assert.equal(await page.getByRole("heading", { name: "GIOCATORE_D_01" }).isVisible(), true);
  assert.equal(await navigation.getByRole("link", { name: "Asta" }).getAttribute("aria-current"), "page");

  await page.close();
});

test("La mia rosa usa card di Ruolo compatte e senza distribuzione degli Slot", async () => {
  const page = await openActiveAuction();
  await assignPlayer(page, "GIOCATORE_D_01", "main", 120);
  await assignPlayer(page, "GIOCATORE_D_02", "main", 50);

  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "La mia rosa" })
    .click();

  assert.deepEqual(
    await page.locator("[data-roster-role] .team-role-heading > h2").allTextContents(),
    ["POR", "DIF", "CEN", "ATT"],
  );
  const defenders = page.getByRole("region", { name: "Rosa DIF" });
  assert.deepEqual(await defenders.locator(".team-role-heading span").allTextContents(), ["170", "17%", "2/8"]);
  assert.deepEqual(
    await defenders.getByRole("list", { name: "Acquisti DIF" }).locator("li > span").allTextContents(),
    ["GIOCATORE_D_01", "GIOCATORE_D_02"],
  );
  assert.deepEqual(
    await defenders.getByRole("list", { name: "Acquisti DIF" }).locator("li > strong").allTextContents(),
    ["120", "50"],
  );

  const goalkeepers = page.getByRole("region", { name: "Rosa POR" });
  assert.deepEqual(await goalkeepers.locator(".team-role-heading span").allTextContents(), ["0", "0%", "0/3"]);
  assert.equal(await goalkeepers.getByRole("listitem").count(), 0);

  assert.equal(await page.getByText("posti liberi", { exact: false }).count(), 0);
  assert.equal(await page.getByRole("region", { name: "Distribuzione degli Slot acquisiti" }).count(), 0);
  assert.equal(
    await page.locator("[data-roster-role]").evaluateAll((cards) =>
      new Set(cards.map((card) => Math.round(card.getBoundingClientRect().height))).size,
    ),
    1,
  );

  await page.setViewportSize({ width: 1000, height: 720 });
  assert.equal(
    await page.locator(".roster-columns").evaluate((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    ),
    2,
  );
  await page.setViewportSize({ width: 700, height: 720 });
  assert.equal(
    await page.locator(".roster-columns").evaluate((grid) =>
      getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    ),
    1,
  );
  assert.equal(
    await page.locator(".active-topbar + *").evaluate((content) => getComputedStyle(content).marginTop),
    "16px",
  );

  await page.close();
});

test("Squadre confronta tutti i partecipanti e apre solo la Squadra principale con uno stato vuoto compatto", async () => {
  const page = await openActiveAuction(8);
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Squadre" }).click();
  const teams = page.getByRole("region", { name: "Squadre", exact: true });
  assert.equal(await teams.locator("summary").count(), 8);
  for (const name of ["I Falchi", ...Array.from({ length: 7 }, (_, i) => `Squadra ${i + 2}`)]) {
    const row = teams.locator("summary").filter({ hasText: name });
    assert.equal(await row.isVisible(), true);
    assert.match(await row.innerText(), /Budget residuo\s*1\.000/);
    assert.match(await row.innerText(), /Massimo spendibile\s*976/);
    assert.match(await row.innerText(), /Posti occupati\s*0\/25/);
    for (const [role, slots] of [["POR", 3], ["DIF", 8], ["CEN", 8], ["ATT", 6]]) {
      assert.match(await row.innerText(), new RegExp(`${role}\\s*0/${slots}`));
    }
  }
  assert.equal(await teams.getByText("Squadra principale", { exact: true }).isVisible(), true);
  const mainRoster = teams.getByRole("region", { name: "Rosa di I Falchi", exact: true });
  assert.equal(await mainRoster.getByText("Nessun Acquisto registrato.", { exact: true }).isVisible(), true);
  assert.equal(await teams.getByRole("region", { name: /^Rosa di / }).count(), 1);
  const row = teams.locator("summary").filter({ hasText: "I Falchi" });
  assert.ok((await mainRoster.boundingBox()).height < (await row.boundingBox()).height * 2);

  await row.focus();
  await page.keyboard.press("Enter");
  assert.equal(await mainRoster.isVisible(), false);
  assert.equal(await row.evaluate((element) => element === document.activeElement), true);
  const opponent = teams.locator("summary").filter({ hasText: "Squadra 2" });
  await opponent.focus();
  await page.keyboard.press("Space");
  assert.equal(await teams.getByRole("region", { name: "Rosa di Squadra 2", exact: true })
    .getByText("Nessun Acquisto registrato.", { exact: true }).isVisible(), true);
  await row.click();
  assert.equal(await mainRoster.isVisible(), true);
  assert.equal(await teams.getByRole("region", { name: /^Rosa di / }).count(), 1);
  await page.close();
});

test("Squadre espande gli Acquisti per Ruolo Classic senza modificare il Backup locale", async () => {
  const page = await openActiveAuction();
  await assignPlayer(page, "GIOCATORE_D_01", "opponent-2", 157);
  await assignPlayer(page, "GIOCATORE_P_01", "opponent-2", 100);
  await assignPlayer(page, "GIOCATORE_D_02", "opponent-2", 50);
  await assignPlayer(page, "GIOCATORE_C_01", "opponent-3", 200);
  await assignPlayer(page, "GIOCATORE_P_02", "main", 60);

  const navigation = page.getByRole("navigation", { name: "Navigazione primaria" });
  const exportBackup = async () => {
    await navigation.getByRole("link", { name: "Backup" }).click();
    const downloadPending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Esporta Backup locale" }).click();
    const download = await downloadPending;
    return JSON.parse(await readFile(await download.path(), "utf8"));
  };
  const before = await exportBackup();
  await navigation.getByRole("link", { name: "Squadre" }).click();
  const teams = page.getByRole("region", { name: "Squadre", exact: true });
  const main = teams.getByRole("article", { name: "Squadra principale I Falchi", exact: true });
  assert.match(await main.locator("summary").innerText(), /Budget residuo\s*940[\s\S]*Massimo spendibile\s*917[\s\S]*Posti occupati\s*1\/25/);
  assert.equal(await main.getByRole("listitem").getByText("GIOCATORE_P_02", { exact: true }).isVisible(), true);

  const opponent = teams.getByRole("article", { name: "Squadra Squadra 2", exact: true });
  assert.match(await opponent.locator("summary").innerText(), /Budget residuo\s*693[\s\S]*Massimo spendibile\s*672[\s\S]*Posti occupati\s*3\/25[\s\S]*POR\s*1\/3[\s\S]*DIF\s*2\/8/);
  await opponent.getByText("Apri rosa", { exact: true }).click();
  assert.equal(await teams.getByRole("region", { name: /^Rosa di / }).count(), 1);
  assert.equal(await main.getByText("GIOCATORE_P_02", { exact: true }).isVisible(), false);
  assert.deepEqual(await opponent.getByRole("heading", { level: 3 }).allTextContents(), ["POR", "DIF", "CEN", "ATT"]);
  const defenders = opponent.getByRole("region", { name: "DIF di Squadra 2", exact: true });
  assert.equal(await defenders.getByLabel("207 crediti spesi", { exact: true }).isVisible(), true);
  assert.equal(await defenders.getByLabel("20,7 percento del budget", { exact: true }).isVisible(), true);
  assert.equal(await defenders.getByLabel("2 di 8 posti occupati", { exact: true }).isVisible(), true);
  assert.deepEqual(await defenders.getByRole("listitem").allTextContents(), ["GIOCATORE_D_01157", "GIOCATORE_D_0250"]);
  assert.equal(await opponent.getByRole("region", { name: "CEN di Squadra 2", exact: true })
    .getByText("Nessun Acquisto", { exact: true }).isVisible(), true);
  await opponent.getByText("Chiudi rosa", { exact: true }).click();
  assert.equal(await teams.getByRole("region", { name: /^Rosa di / }).count(), 0);
  assert.deepEqual(await exportBackup(), before);
  await page.close();
});

test("Squadre mantiene riepiloghi e dettagli leggibili nei due temi da desktop a mobile", async () => {
  const page = await openActiveAuction(8);
  await assignPlayer(page, "GIOCATORE_D_01", "opponent-2", 157);
  await assignPlayer(page, "GIOCATORE_P_01", "opponent-2", 100);
  const navigation = page.getByRole("navigation", { name: "Navigazione primaria" });
  await navigation.getByRole("link", { name: "Configurazione" }).click();
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi della Valle del Fantacalcio");
  await page.getByRole("button", { name: "Salva configurazione" }).click();
  await navigation.getByRole("link", { name: "Squadre" }).click();
  const teams = page.getByRole("region", { name: "Squadre", exact: true });
  const mainRow = teams.locator("summary").filter({ hasText: "I Falchi della Valle del Fantacalcio" });
  const opponentRow = teams.locator("summary").filter({ hasText: "Squadra 2" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => document.fonts.ready);

  for (const nextTheme of ["Usa tema chiaro", "Usa tema scuro"]) {
    for (const [width, height] of [[1440, 900], [1280, 720], [768, 1024], [390, 844]]) {
      await page.setViewportSize({ width, height });
      for (const row of [opponentRow, mainRow]) {
        await row.click();
        const focusedRow = await row.boundingBox();
        assert.ok(focusedRow.width >= 44 && focusedRow.height >= 44);
        assert.equal(await teams.locator("summary").count(), 8);
        assert.equal(await teams.getByRole("region", { name: /^Rosa di / }).count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);

        const issues = await teams.evaluate((section) =>
          Array.from(section.querySelectorAll("span, strong, p, h3")).flatMap((element) => {
            if (element.children.length || !element.checkVisibility()) return [];
            return element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight
              ? [`Testo troncato: ${element.textContent}`]
              : [];
          }),
        );
        assert.deepEqual(issues, [], `${nextTheme}, ${width}, ${await row.innerText()}`);
      }
    }
    await page.getByRole("button", { name: nextTheme }).click();
  }
  await page.close();
});
