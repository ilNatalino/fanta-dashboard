# 19 — Completare e resettare l'Asta attiva

**What to build:** La conclusione naturale e il riavvio sicuro del ciclo d'asta, mantenendo consultabili le rose complete e permettendo di eliminare soltanto i progressi dopo conferma.

**Blocked by:** 17 — Correggere e annullare gli Acquisti; 18 — Consultare La mia rosa e le Squadre avversarie.

**Status:** ready-for-agent

- [ ] L'Asta diventa completa per condizione naturale quando tutte le Squadre occupano i Posti di ruolo configurati.
- [ ] Non esiste un comando `Termina asta` e le rose restano consultabili dopo il completamento.
- [ ] Il Reset dell'asta richiede una conferma esplicita e può essere annullato senza modificare lo stato.
- [ ] Un reset confermato elimina Acquisti, assegnazioni, prezzi finali, disponibilità derivata e campioni dello Scostamento d'asta per ruolo.
- [ ] Dopo il reset tutti i calciatori tornano disponibili e i Prezzi adattati all'asta tornano a `Dati insufficienti`.
- [ ] Catalogo calciatori, Configurazione d'asta, nomi delle Squadre, categorie e associazioni della Shortlist vengono conservati.
- [ ] Lo stesso setup torna allo stato pre-asta e le regole strutturali possono essere modificate prima di un nuovo avvio.
- [ ] Refresh e riapertura ripristinano correttamente sia un'Asta completa sia uno stato appena resettato.
- [ ] I controlli automatici attraversano completamento, consultazione finale, conferma e conservazione selettiva del reset.
