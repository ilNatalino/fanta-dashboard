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

async function openActiveAuction({ goalkeeperSlots = 3 } = {}) {
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
  await page.getByLabel("Posti POR").fill(String(goalkeeperSlots));
  await page.getByLabel("Nome della Squadra principale").fill("I Falchi");
  await page.getByRole("button", { name: "Avvia asta" }).click();
  return page;
}

async function openPlayer(page, playerName) {
  await page.getByLabel("Cerca il Calciatore chiamato").fill(playerName);
  await page.getByRole("button", { name: "Apri Scheda d’asta" }).click();
}

test("un Acquisto valido aggiorna atomicamente disponibilità, budget e inventario", async () => {
  const page = await openActiveAuction();
  const card = page.getByRole("region", { name: "Scheda d’asta" });

  await openPlayer(page, "GIOCATORE_D_01");
  await card.getByRole("button", { name: "Assegna giocatore" }).click();

  assert.equal(await card.getByLabel("Squadra").inputValue(), "");
  assert.equal(await card.getByLabel("Squadra").getByRole("option", { name: /I Falchi · Squadra principale/ }).count(), 1);
  assert.equal(await card.getByLabel("Squadra").getAttribute("required"), "");
  assert.equal(await card.getByLabel("Prezzo finale").getAttribute("required"), "");

  await card.getByLabel("Squadra").selectOption("opponent-2");
  await card.getByLabel("Prezzo finale").fill("157");
  await card.getByRole("button", { name: "Registra Acquisto" }).click();

  assert.equal(await card.getByRole("heading", { name: "GIOCATORE_D_01" }).count(), 0);
  assert.equal(
    await card.getByRole("status").innerText(),
    "GIOCATORE_D_01 assegnato a Squadra 2 per 157 crediti. Budget residuo: 843 crediti.",
  );
  const navigation = page.getByRole("navigation", { name: "Navigazione primaria" });
  await navigation.getByRole("link", { name: "Catalogo" }).click();
  assert.equal(await page.getByText("31 calciatori disponibili").isVisible(), true);
  assert.match(
    await page.getByRole("row", { name: /GIOCATORE_D_01/ }).innerText(),
    /Acquistato · Squadra 2 · 157 crediti/,
  );
  await navigation.getByRole("link", { name: "Asta" }).click();
  assert.equal(
    await page.getByRole("list", { name: "Ranking DIF" }).getByText(/GIOCATORE_D_01/).count(),
    0,
  );
  assert.deepEqual(
    await page.getByRole("list", { name: "Scarsità DIF" }).getByRole("listitem").allTextContents(),
    ["S1 0", "S2 1", "S3 1", "S4 1", "S5 1", "S6 1", "S7 1", "S8 1"],
  );

  await page.reload();
  assert.equal(await page.getByText("31 calciatori disponibili").isVisible(), true);
  await openPlayer(page, "GIOCATORE_D_02");
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  assert.equal(
    await card.getByLabel("Squadra").getByRole("option", { name: "Squadra 2 · 843 crediti" }).count(),
    1,
  );

  await page.close();
});

test("gli Acquisti impossibili conservano modulo e stato fino a un salvataggio valido", async () => {
  const page = await openActiveAuction({ goalkeeperSlots: 1 });
  const card = page.getByRole("region", { name: "Scheda d’asta" });
  const mainTeam = page.getByRole("region", { name: "I Falchi" });

  await openPlayer(page, "GIOCATORE_D_01");
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption("opponent-2");
  await card.getByLabel("Prezzo finale").fill("157");
  await card.getByRole("button", { name: "Registra Acquisto" }).click();

  await openPlayer(page, "GIOCATORE_D_01");
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption("opponent-2");
  await card.getByLabel("Prezzo finale").fill("157");
  await card.getByRole("button", { name: "Registra Acquisto" }).click();
  assert.match(await card.getByRole("alert").innerText(), /già stato acquistato/i);
  assert.equal(await card.getByLabel("Squadra").inputValue(), "opponent-2");
  assert.equal(await card.getByLabel("Prezzo finale").inputValue(), "157");
  assert.equal(await page.getByText("31 calciatori disponibili").isVisible(), true);

  await openPlayer(page, "GIOCATORE_D_02");
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption("main");
  await card.getByLabel("Prezzo finale").fill("1001");
  await card.getByRole("button", { name: "Registra Acquisto" }).click();
  assert.match(await card.getByRole("alert").innerText(), /supera il budget disponibile/i);
  assert.equal(await card.getByLabel("Squadra").inputValue(), "main");
  assert.equal(await card.getByLabel("Prezzo finale").inputValue(), "1001");
  assert.equal(await mainTeam.getByText("Budget residuo: 1.000 crediti").isVisible(), true);
  assert.equal(await mainTeam.getByText("DIF 0/8").isVisible(), true);

  await openPlayer(page, "GIOCATORE_P_01");
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption("main");
  await card.getByLabel("Prezzo finale").fill("1");
  await card.getByRole("button", { name: "Registra Acquisto" }).click();
  assert.equal(await mainTeam.getByText("Budget residuo: 999 crediti").isVisible(), true);
  assert.equal(await mainTeam.getByText("POR 1/1").isVisible(), true);
  assert.equal(
    await mainTeam.getByRole("list", { name: "Rosa I Falchi" }).getByRole("listitem").innerText(),
    "GIOCATORE_P_01 · 1 crediti",
  );

  await openPlayer(page, "GIOCATORE_P_02");
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption("main");
  await card.getByLabel("Prezzo finale").fill("1");
  await card.getByRole("button", { name: "Registra Acquisto" }).click();
  assert.match(await card.getByRole("alert").innerText(), /non ha Posti di ruolo liberi per POR/i);
  assert.equal(await card.getByLabel("Squadra").inputValue(), "main");
  assert.equal(await card.getByLabel("Prezzo finale").inputValue(), "1");
  assert.equal(await page.getByText("30 calciatori disponibili").isVisible(), true);
  assert.equal(await mainTeam.getByText("Budget residuo: 999 crediti").isVisible(), true);
  assert.equal(await mainTeam.getByText("POR 1/1").isVisible(), true);

  await page.reload();
  assert.equal(await page.getByText("30 calciatori disponibili").isVisible(), true);
  assert.equal(await mainTeam.getByText("Budget residuo: 999 crediti").isVisible(), true);
  assert.equal(await mainTeam.getByText("POR 1/1").isVisible(), true);
  assert.equal(await mainTeam.getByText("GIOCATORE_P_01 · 1 crediti").isVisible(), true);

  await page.close();
});

test("la Scarsità mantiene a zero l'ultimo Slot dopo l'Acquisto", async () => {
  const page = await openActiveAuction();
  const card = page.getByRole("region", { name: "Scheda d’asta" });

  await openPlayer(page, "GIOCATORE_D_08");
  await card.getByRole("button", { name: "Assegna giocatore" }).click();
  await card.getByLabel("Squadra").selectOption("opponent-2");
  await card.getByLabel("Prezzo finale").fill("1");
  await card.getByRole("button", { name: "Registra Acquisto" }).click();

  assert.deepEqual(
    await page.getByRole("list", { name: "Scarsità DIF" }).getByRole("listitem").allTextContents(),
    ["S1 1", "S2 1", "S3 1", "S4 1", "S5 1", "S6 1", "S7 1", "S8 0"],
  );

  await page.close();
});
