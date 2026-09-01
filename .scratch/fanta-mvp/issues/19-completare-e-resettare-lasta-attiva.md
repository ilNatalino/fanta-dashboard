# 19 — Completare e resettare l'Asta attiva

**What to build:** La conclusione naturale e il riavvio sicuro del ciclo d'asta, mantenendo consultabili le rose complete e permettendo di eliminare soltanto i progressi dopo conferma.

**Blocked by:** 17 — Correggere e annullare gli Acquisti; 18 — Consultare La mia rosa e le Squadre avversarie.

**Status:** done

- [x] L'Asta diventa completa per condizione naturale quando tutte le Squadre occupano i Posti di ruolo configurati.
- [x] Non esiste un comando `Termina asta` e le rose restano consultabili dopo il completamento.
- [x] Il Reset dell'asta richiede una conferma esplicita e può essere annullato senza modificare lo stato.
- [x] Un reset confermato elimina Acquisti, assegnazioni, prezzi finali, disponibilità derivata e campioni dello Scostamento d'asta per ruolo.
- [x] Dopo il reset tutti i calciatori tornano disponibili e i Prezzi adattati all'asta tornano a `Dati insufficienti`.
- [x] Catalogo calciatori, Configurazione d'asta, nomi delle Squadre, categorie e associazioni della Shortlist vengono conservati.
- [x] Lo stesso setup torna allo stato pre-asta e le regole strutturali possono essere modificate prima di un nuovo avvio.
- [x] Refresh e riapertura ripristinano correttamente sia un'Asta completa sia uno stato appena resettato.
- [x] I controlli automatici attraversano completamento, consultazione finale, conferma e conservazione selettiva del reset.
