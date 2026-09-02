import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { chromium } from "playwright";
import { CatalogApplication } from "../dist/catalog-application.js";
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

class DeterministicStateStorage {
  current = null;
  previous = null;
  failNextWrite = false;
  failNextRestore = false;

  load() {
    return { current: this.current, previous: this.previous };
  }

  save(state) {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error("scrittura simulata fallita");
    }
    this.previous = this.current;
    this.current = JSON.stringify(state);
  }

  restorePrevious() {
    if (this.failNextRestore) {
      this.failNextRestore = false;
      throw new Error("ripristino simulato fallito");
    }
    this.current = this.previous;
  }

  clear() {
    this.current = null;
    this.previous = null;
  }
}

function currentState(storage) {
  return storage.current ? JSON.parse(storage.current) : null;
}

function savedState(playerName) {
  return {
    version: 1,
    catalog: [{
      name: playerName,
      team: "CLUB",
      role: "D",
      slot: 1,
      pma: 10,
      pfc: 12,
      expectedFantamedia: 6,
      expectedTitolarita: 80,
    }],
    shortlistCategories: [],
  };
}

const auctionInput = {
  teamCount: 2,
  initialBudget: 500,
  rosterSlots: { P: 2, D: 3, C: 2, A: 2 },
  adaptationThreshold: 3,
  historicalMarketPerceptionTolerance: 5,
  mainTeamName: "I Falchi",
  opponentTeamNames: ["I Lupi"],
};

async function applicationWithCatalog() {
  const storage = new DeterministicStateStorage();
  const application = new CatalogApplication(storage);
  const csv = await readFile(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
    "utf8",
  );
  assert.equal(application.importCatalog(csv).status, "imported");
  return { application, storage };
}

async function applicationWithAuction(purchased = false) {
  const prepared = await applicationWithCatalog();
  assert.equal(prepared.application.createShortlistCategory("Priorità").status, "updated");
  assert.equal(
    prepared.application.setShortlistAssociation("GIOCATORE_D_01", "Priorità", true).status,
    "updated",
  );
  assert.equal(prepared.application.startAuction(auctionInput).status, "started");
  if (purchased) {
    assert.equal(
      prepared.application.assignPlayer("GIOCATORE_D_01", "main", 157).status,
      "purchased",
    );
  }
  return prepared;
}

async function openWithStoredCopies(current, previous) {
  const page = await browser.newPage();
  page.setDefaultTimeout(5_000);
  await page.addInitScript(({ currentCopy, previousCopy }) => {
    if (currentCopy !== null) localStorage.setItem("fanta-dashboard.state", currentCopy);
    if (previousCopy !== null) {
      localStorage.setItem("fanta-dashboard.state.previous", previousCopy);
    }
  }, { currentCopy: current, previousCopy: previous });
  await page.goto(server.url);
  return page;
}

async function openWithFailedWrites(state) {
  const page = await browser.newPage();
  page.setDefaultTimeout(5_000);
  await page.addInitScript((saved) => {
    const originalSetItem = Storage.prototype.setItem;
    originalSetItem.call(localStorage, "fanta-dashboard.state", JSON.stringify(saved));
    Storage.prototype.setItem = function setItem(key, value) {
      if (key.startsWith("fanta-dashboard.state")) {
        throw new DOMException("Scrittura simulata fallita", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    };
  }, state);
  await page.goto(server.url);
  return page;
}

test("una copia corrente corrotta recupera la copia valida precedente con un avviso", () => {
  const previousState = savedState("ULTIMO_CONFERMATO");
  const storage = new DeterministicStateStorage();
  storage.current = "{json corrotto";
  storage.previous = JSON.stringify(previousState);

  const application = new CatalogApplication(storage);

  assert.deepEqual(application.observe(), previousState);
  assert.deepEqual(application.persistenceStatus(), {
    status: "recovered",
    notice: "È stata recuperata la copia valida precedente. L’ultima operazione potrebbe essere stata persa.",
  });
  assert.deepEqual(currentState(storage), previousState);
});

test("un errore nel riscrivere la copia recuperata non impedisce di usare quella valida", () => {
  const previousState = savedState("ULTIMO_CONFERMATO");
  const storage = new DeterministicStateStorage();
  storage.current = "{json corrotto";
  storage.previous = JSON.stringify(previousState);
  storage.failNextRestore = true;

  const application = new CatalogApplication(storage);

  assert.deepEqual(application.observe(), previousState);
  assert.deepEqual(application.persistenceStatus(), {
    status: "recovered",
    notice: "È stata recuperata la copia valida precedente. L’ultima operazione potrebbe essere stata persa.",
  });
  assert.equal(storage.current, "{json corrotto");

  assert.deepEqual(application.createShortlistCategory("Nuova operazione"), {
    status: "updated",
  });
  assert.deepEqual(JSON.parse(storage.previous), previousState);
  assert.deepEqual(currentState(storage).shortlistCategories, [{
    name: "Nuova operazione",
    playerNames: [],
  }]);
});

test("il recupero della copia precedente è comunicato nella sessione ripristinata", async () => {
  const previousState = savedState("ULTIMO_CONFERMATO");
  const page = await openWithStoredCopies("{json corrotto", JSON.stringify(previousState));

  assert.equal(await page.getByText("1 calciatori disponibili").isVisible(), true);
  assert.equal(
    await page.getByRole("status").getByText(
      "È stata recuperata la copia valida precedente. L’ultima operazione potrebbe essere stata persa.",
    ).isVisible(),
    true,
  );

  await page.close();
});

test("il browser conserva stato corrente e copia precedente entro la promessa locale", async () => {
  const page = await browser.newPage();
  page.setDefaultTimeout(5_000);
  await page.goto(server.url);
  await page.getByLabel("Seleziona CSV").setInputFiles(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
  );
  await page.getByRole("button", { name: "Importa catalogo" }).click();
  await page.locator("summary").filter({ hasText: "Gestisci Shortlist" }).click();
  await page.getByLabel("Nuova categoria").fill("Ultima operazione");
  await page.getByRole("button", { name: "Crea categoria" }).click();

  const copies = await page.evaluate(() => ({
    current: JSON.parse(localStorage.getItem("fanta-dashboard.state")),
    previous: JSON.parse(localStorage.getItem("fanta-dashboard.state.previous")),
  }));
  assert.deepEqual(copies.current.shortlistCategories, [{
    name: "Ultima operazione",
    playerNames: [],
  }]);
  assert.deepEqual(copies.previous.shortlistCategories, []);
  await page.getByRole("navigation", { name: "Navigazione primaria" })
    .getByRole("link", { name: "Backup" })
    .click();
  assert.equal(
    await page.getByText(
      "Il salvataggio automatico vale sullo stesso dispositivo, browser e profilo in navigazione normale.",
    ).isVisible(),
    true,
  );

  await page.reload();
  await page.locator("summary").filter({ hasText: "Gestisci Shortlist" }).click();
  assert.equal(await page.getByRole("heading", { name: "Ultima operazione" }).isVisible(), true);
  assert.equal(await page.getByText(/ultima operazione potrebbe essere stata persa/i).count(), 0);
  await page.close();
});

test("due copie invalide bloccano la sessione e restano esportabili per la diagnosi", () => {
  const storage = new DeterministicStateStorage();
  storage.current = "{json corrotto";
  storage.previous = JSON.stringify({ version: 2, catalog: [] });

  const application = new CatalogApplication(storage);

  assert.equal(application.observe(), null);
  assert.deepEqual(application.persistenceStatus(), {
    status: "blocked",
    error: "I dati locali non sono leggibili o compatibili. La sessione è bloccata per evitare un reset silenzioso.",
  });
  const exported = application.exportProblematicData();
  assert.equal(exported.status, "exported");
  assert.equal(exported.filename, "fanta-dashboard-dati-problematici.json");
  assert.deepEqual(JSON.parse(exported.contents), {
    current: storage.current,
    previous: storage.previous,
  });
});

test("la sessione bloccata nasconde l'app e permette di esportare i dati problematici", async () => {
  const current = "corrente illeggibile";
  const previous = JSON.stringify({ version: 99 });
  const page = await openWithStoredCopies(current, previous);

  assert.equal(await page.getByRole("heading", { name: "Sessione locale bloccata" }).isVisible(), true);
  assert.equal(await page.getByRole("heading", { name: "Importa il Catalogo calciatori" }).count(), 0);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Esporta dati problematici" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);

  assert.equal(download.suggestedFilename(), "fanta-dashboard-dati-problematici.json");
  assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString("utf8")), { current, previous });
  await page.close();
});

test("il reset esplicito dalla sessione bloccata elimina entrambe le copie", async () => {
  const page = await openWithStoredCopies("corrente illeggibile", "precedente illeggibile");

  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Resetta dati locali" }).click();
  assert.equal(await page.getByRole("heading", { name: "Sessione locale bloccata" }).isVisible(), true);

  await Promise.all([
    page.waitForEvent("dialog").then((dialog) => dialog.accept()),
    page.getByRole("button", { name: "Resetta dati locali" }).click(),
  ]);

  assert.equal(await page.getByRole("heading", { name: "Importa il Catalogo calciatori" }).isVisible(), true);
  assert.deepEqual(
    await page.evaluate(() => ({
      current: localStorage.getItem("fanta-dashboard.state"),
      previous: localStorage.getItem("fanta-dashboard.state.previous"),
    })),
    { current: null, previous: null },
  );
  await page.close();
});

test("il reset dei dati illeggibili richiede conferma esplicita prima di sbloccare la sessione", () => {
  const storage = new DeterministicStateStorage();
  storage.current = "corrente illeggibile";
  storage.previous = "precedente illeggibile";
  const application = new CatalogApplication(storage);

  assert.deepEqual(application.resetProblematicData(), { status: "confirmation-required" });
  assert.notEqual(storage.current, null);
  assert.deepEqual(application.resetProblematicData(true), { status: "reset" });
  assert.deepEqual(storage.load(), { current: null, previous: null });
  assert.deepEqual(application.persistenceStatus(), { status: "ready" });
  assert.equal(application.observe(), null);
});

test("l'importazione iniziale è completata soltanto dopo una scrittura riuscita", async () => {
  const storage = new DeterministicStateStorage();
  const application = new CatalogApplication(storage);
  const csv = await readFile(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
    "utf8",
  );
  storage.failNextWrite = true;

  assert.deepEqual(application.importCatalog(csv), {
    status: "failed",
    error: "Salvataggio locale non riuscito. L’operazione non è stata completata.",
  });
  assert.equal(application.observe(), null);
  assert.equal(storage.current, null);
});

test("una scrittura fallita conserva l'ultimo stato confermato e comunica l'errore", async () => {
  const storage = new DeterministicStateStorage();
  const application = new CatalogApplication(storage);
  const csv = await readFile(
    ".scratch/fanta-mvp/assets/04-catalogo-rappresentativo.csv",
    "utf8",
  );
  assert.deepEqual(application.importCatalog(csv), { status: "imported" });
  const confirmedState = structuredClone(application.observe());
  storage.failNextWrite = true;

  assert.deepEqual(application.createShortlistCategory("Da non confermare"), {
    status: "failed",
    error: "Salvataggio locale non riuscito. L’operazione non è stata completata.",
  });
  assert.deepEqual(application.observe(), confirmedState);
  assert.deepEqual(currentState(storage), confirmedState);
});

test("l'interfaccia conserva lo stato confermato e mostra l'errore di scrittura", async () => {
  const confirmedState = savedState("CONFERMATO");
  const page = await openWithFailedWrites(confirmedState);

  await page.locator("summary").filter({ hasText: "Gestisci Shortlist" }).click();
  await page.getByLabel("Nuova categoria").fill("Da non confermare");
  await page.getByRole("button", { name: "Crea categoria" }).click();

  assert.equal(
    await page.getByRole("alert").getByText(
      "Salvataggio locale non riuscito. L’operazione non è stata completata.",
    ).isVisible(),
    true,
  );
  assert.equal(await page.getByRole("heading", { name: "Da non confermare" }).count(), 0);
  assert.deepEqual(
    JSON.parse(await page.evaluate(() => localStorage.getItem("fanta-dashboard.state"))),
    confirmedState,
  );
  await page.close();
});

test("ogni altra operazione valida resta atomica quando la scrittura fallisce", async (context) => {
  const replacementCsv = [
    "name,team,role,slot,pma,pfc,expectedFantamedia,expectedTitolarita",
    "NUOVO,CLUB,D,1,10,12,6,80",
  ].join("\n");
  const cases = [
    {
      name: "sostituzione del Catalogo",
      prepare: applicationWithCatalog,
      act: (application) => application.importCatalog(replacementCsv, true),
    },
    {
      name: "avvio dell'Asta",
      prepare: applicationWithCatalog,
      act: (application) => application.startAuction(auctionInput),
    },
    {
      name: "aggiornamento di Configurazione e Squadre",
      prepare: applicationWithAuction,
      act: (application) => application.updateAuctionConfiguration({
        mainTeamName: "Le Aquile",
        opponentTeamNames: ["I Rivali"],
        adaptationThreshold: 4,
        historicalMarketPerceptionTolerance: 6,
      }),
    },
    {
      name: "associazione alla Shortlist",
      prepare: applicationWithAuction,
      act: (application) => application.setShortlistAssociation(
        "GIOCATORE_D_02",
        "Priorità",
        true,
      ),
    },
    {
      name: "rinomina della categoria",
      prepare: applicationWithAuction,
      act: (application) => application.renameShortlistCategory("Priorità", "Obiettivi"),
    },
    {
      name: "eliminazione della categoria",
      prepare: applicationWithAuction,
      act: (application) => application.deleteShortlistCategory("Priorità", true),
    },
    {
      name: "registrazione dell'Acquisto",
      prepare: applicationWithAuction,
      act: (application) => application.assignPlayer("GIOCATORE_D_01", "main", 157),
    },
    {
      name: "Correzione dell'acquisto",
      prepare: () => applicationWithAuction(true),
      act: (application) => application.correctPurchase("GIOCATORE_D_01", "opponent-2", 100),
    },
    {
      name: "annullamento dell'Acquisto",
      prepare: () => applicationWithAuction(true),
      act: (application) => application.cancelPurchase("GIOCATORE_D_01", true),
    },
    {
      name: "Reset dell'asta",
      prepare: () => applicationWithAuction(true),
      act: (application) => application.resetAuction(true),
    },
  ];

  for (const scenario of cases) {
    await context.test(scenario.name, async () => {
      const { application, storage } = await scenario.prepare();
      const confirmedState = structuredClone(application.observe());
      const confirmedCopy = storage.current;
      storage.failNextWrite = true;

      assert.deepEqual(scenario.act(application), {
        status: "failed",
        error: "Salvataggio locale non riuscito. L’operazione non è stata completata.",
      });
      assert.deepEqual(application.observe(), confirmedState);
      assert.equal(storage.current, confirmedCopy);
    });
  }
});
