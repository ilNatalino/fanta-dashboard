# PROTOTYPE — Dashboard desktop durante l'asta

Tre varianti strutturali della stessa dashboard, selezionabili tramite `?variant=A`, `?variant=B` e `?variant=C` oppure con la barra flottante. Il prototipo risponde alla domanda: quale gerarchia rende più rapidi ricerca del calciatore chiamato, lettura dei riferimenti, controllo della squadra principale e registrazione dell'acquisto?

## Avvio

Dal repository:

```sh
python3 -m http.server 4173 --directory .scratch/fanta-mvp/prototypes/09-dashboard
```

Aprire `http://localhost:4173/?variant=A`.

## Varianti

- **A — Command center:** ranking, scheda d'asta e rosa della squadra principale sempre visibili in tre colonne; include le pagine `La mia rosa` e `Squadre` tramite il parametro `page`.
- **B — Focus sul chiamato:** il calciatore e il prezzo adattato dominano la schermata; contesto e strumenti restano in una fascia inferiore.
- **C — Tabella + inspector:** il catalogo è la superficie primaria e la scheda d'asta è un pannello laterale persistente.

Il prototipo usa dati in memoria e non implementa persistenza, validazioni complete o calcoli di produzione.

## Esito

È stata scelta **A — Command center**, con tre pagine: `Asta`, `La mia rosa` e `Squadre`. La pagina live conserva ranking, Scheda d'asta e rosa principale sempre visibili; le viste dedicate approfondiscono composizione, spesa e Slot della squadra principale e i dati osservati delle Squadre avversarie.
