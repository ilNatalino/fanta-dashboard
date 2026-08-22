# 12 — Configurare e avviare l'Asta attiva

**What to build:** Il percorso completo con cui il Fantallenatore principale configura Squadre, budget e Posti di ruolo, avvia l'unica Asta attiva e la ritrova nello stesso stato dopo un refresh.

**Blocked by:** 11 — Importare e ritrovare il Catalogo calciatori.

**Status:** done

- [x] Con un Catalogo calciatori disponibile, il Fantallenatore principale può configurare numero di Squadre, budget iniziale comune e Posti di ruolo POR, DIF, CEN e ATT.
- [x] Soglia di adattamento e tolleranza della Percezione storica di mercato sono configurabili con valori predefiniti rispettivamente pari a 3 e 5%.
- [x] Il nome della Squadra principale è obbligatorio; le Squadre avversarie ricevono nomi numerati automatici e possono essere rinominate.
- [x] La configurazione rappresentativa crea otto Squadre con 1.000 crediti e rose da 3 POR, 8 DIF, 8 CEN e 6 ATT.
- [x] Avviare l'asta blocca numero di Squadre, budget e Posti di ruolo, mentre i nomi delle Squadre restano modificabili.
- [x] L'app gestisce un'unica Asta attiva e non offre uno storico di aste.
- [x] Dopo un refresh o una riapertura, Configurazione d'asta, Squadre e stato di avvio vengono ripristinati automaticamente.
- [x] I controlli automatici attraversano configurazione, avvio, blocco delle regole e ripristino tramite l'interfaccia dell'applicazione.
