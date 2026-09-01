# 17 — Correggere e annullare gli Acquisti

**What to build:** Il percorso con cui il Fantallenatore principale rettifica Squadra o prezzo di un Acquisto oppure lo annulla, ottenendo un ricalcolo atomico di tutti i dati osservabili.

**Blocked by:** 16 — Adattare i prezzi al mercato dell'Asta.

**Status:** done

- [x] La Correzione dell'acquisto apre un modulo precompilato e permette di modificare soltanto Squadra e prezzo finale.
- [x] La validazione considera lo stato risultante senza contare due volte l'Acquisto originale.
- [x] Una correzione invalida lascia intatto l'Acquisto originale, conserva i valori inseriti e mostra l'errore contestuale.
- [x] Una correzione valida aggiorna atomicamente rosa, budget, disponibilità, Scarsità per slot, campioni e Prezzi adattati all'asta.
- [x] L'annullamento richiede conferma e restituisce il calciatore ai disponibili conservandone le categorie della Shortlist.
- [x] Un calciatore acquistato conserva le categorie, è nascosto dalla vista predefinita dei disponibili e può essere mostrato tramite filtro; dopo l'annullamento ricompare automaticamente.
- [x] Annullando `GIOCATORE_C_03`, il campione CEN scende da tre a due e il Prezzo adattato all'asta torna immediatamente a `Dati insufficienti`.
- [x] Un Acquisto può essere corretto più volte senza richiedere una cronologia delle revisioni.
- [x] I controlli automatici verificano esiti validi, invalidi e annullati attraverso l'interfaccia dell'applicazione e gli indicatori ricalcolati.
