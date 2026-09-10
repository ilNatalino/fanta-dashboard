# 01 — Introdurre le fondamenta del “tabellino d’asta”

**What to build:** Un fondamento visivo condiviso che renda l’app riconoscibile come un tabellino operativo d’asta nei temi chiaro e scuro, con tipografia locale, numeri confrontabili e stati accessibili, senza modificare i flussi esistenti.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] I temi chiaro e scuro usano token semantici distinti per superfici, testo, bordi, accento di superficie, testo su accento, accento testuale, focus e stati, senza inversioni locali di tema.
- [x] Il verde resta l’unico accento cromatico, il bagliore radiale viene rimosso e superfici, divisori, raggi e ombre seguono il linguaggio sobrio del `tabellino d’asta`.
- [x] Barlow Semi Condensed distingue nomi e titoli brevi, Barlow regolare serve il testo dell’interfaccia e crediti, percentuali, Slot e metriche usano cifre tabulari.
- [x] I caratteri WOFF2 sono ospitati localmente, non generano richieste runtime esterne, usano una strategia di caricamento stabile e sono disponibili nell’app shell offline.
- [x] Focus, successo, errore, indisponibilità e selezione dispongono di una base visiva che non dipende soltanto dal colore; le transizioni comuni sono brevi e vengono eliminate quando è richiesta la riduzione del movimento.
- [x] Il fondamento viene introdotto accanto alle convenzioni ancora necessarie alle viste non migrate, così che build e comportamento esistente restino verdi durante la migrazione.
- [x] Non vengono introdotti framework frontend, librerie di componenti, design system o nuove dipendenze runtime.
- [x] I test browser e PWA verificano caricamento locale dei caratteri, disponibilità offline e assenza di regressioni nella selezione e persistenza del tema.
