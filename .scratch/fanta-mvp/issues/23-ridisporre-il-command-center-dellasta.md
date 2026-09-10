# 23 — Ridisporre il command center dell'Asta

**What to build:** Un command center dell'Asta più concentrato sul Calciatore chiamato, con Ranking e Scarsità per slot separati nelle colonne laterali, Configurazione d'asta in una vista dedicata e i vincoli essenziali della Squadra principale nella testata.

**Blocked by:** 12 — Configurare e avviare l'Asta attiva; 14 — Esplorare il command center dell'Asta; 18 — Consultare La mia rosa e le Squadre avversarie.

**Status:** ready-for-agent

- [ ] Dopo l'avvio, la navigazione primaria è `Asta · La mia rosa · Squadre · Catalogo · Configurazione · Backup`; prima dell'avvio, il setup resta in `Asta` e `Configurazione` non è disponibile.
- [ ] La pagina `Asta` non mostra la fascia con `Sessione in corso`, `Asta attiva`, numero di disponibili e `Regole strutturali bloccate`; lo stato della sessione resta nella testata.
- [ ] Il riepilogo compatto della testata mostra nome della Squadra principale, budget residuo, Massimo spendibile e Posti di ruolo occupati.
- [ ] Il command center desktop mostra Ranking in una colonna laterale compatta a sinistra, Scheda d'asta ampliata al centro e Scarsità per slot in una colonna laterale compatta a destra.
- [ ] Ranking e Scarsità per slot condividono il Ruolo Classic selezionato, inclusi gli aggiornamenti successivi a un Acquisto, una Correzione dell'acquisto o un annullamento.
- [ ] Ranking e Scarsità per slot restano sticky su desktop; la Scheda d'asta usa tutto lo spazio orizzontale restante.
- [ ] La scheda riepilogativa della Squadra principale viene rimossa da `Asta`; la rosa completa resta disponibile in `La mia rosa`.
- [ ] Su tablet la Scheda d'asta occupa la prima riga e Ranking e Scarsità per slot sono affiancati sotto; su mobile i tre blocchi sono verticali nell'ordine Scheda d'asta, Ranking, Scarsità per slot e non sono sticky.
- [ ] La vista `Configurazione` mostra subito, senza pannello comprimibile, regole strutturali in sola lettura, Soglia di adattamento, tolleranza della Percezione storica di mercato, nomi delle Squadre e Reset dell'asta.
- [ ] I test verificano struttura, ordine responsive, sincronizzazione del Ruolo Classic, informazioni della testata e accessibilità delle regioni senza asserzioni pixel-perfect.
