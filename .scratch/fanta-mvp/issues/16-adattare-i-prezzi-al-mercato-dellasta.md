# 16 — Adattare i prezzi al mercato dell'Asta

**What to build:** I segnali che trasformano gli Acquisti osservati nello Scostamento d'asta per ruolo e nel Prezzo adattato all'asta, mantenendoli distinti dal Massimo spendibile della Squadra principale.

**Blocked by:** 15 — Registrare un Acquisto valido e bloccare quelli impossibili.

**Status:** ready-for-agent

- [ ] Per ogni Ruolo il moltiplicatore usa la mediana dei rapporti `prezzo finale / PFC` di tutti gli Acquisti attivi, inclusi quelli della Squadra principale.
- [ ] Prima della Soglia di adattamento configurata la Scheda d'asta mostra `Dati insufficienti`.
- [ ] Dalla soglia in poi la Scheda d'asta mostra Prezzo adattato all'asta, Scostamento d'asta per ruolo e numero di osservazioni.
- [ ] Il Prezzo adattato all'asta è il PFC moltiplicato per la mediana e arrotondato al credito intero più vicino; non applica esclusioni, tagli o massimali.
- [ ] Dopo i primi due Acquisti DIF della fixture compare `Dati insufficienti`; con `GIOCATORE_D_03` a 76 crediti lo scostamento è `+16%` e il prezzo adattato di `GIOCATORE_D_04` è 24 crediti.
- [ ] Il Massimo spendibile è il budget residuo della Squadra principale meno un credito per ciascun altro Posto di ruolo ancora da riempire.
- [ ] Se il Ruolo del Calciatore chiamato è completo nella Squadra principale compare `Non acquistabile`, mentre i riferimenti di mercato restano visibili.
- [ ] Segnali di mercato e vincoli personali occupano zone semanticamente separate dell'interfaccia.
- [ ] I controlli automatici esercitano soglia, valore anomalo, arrotondamento e Massimo spendibile attraverso lo stato osservabile dell'app.
