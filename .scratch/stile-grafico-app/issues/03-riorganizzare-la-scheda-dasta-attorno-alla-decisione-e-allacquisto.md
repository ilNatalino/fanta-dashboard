# 03 — Riorganizzare la Scheda d’asta attorno alla decisione e all’Acquisto

**What to build:** Una Scheda d’asta centrata sulla decisione corrente, che renda immediatamente confrontabili i riferimenti principali e accompagni il Fantallenatore principale fino alla registrazione dell’Acquisto senza perdere contesto.

**Blocked by:** 02 — Compattare testata e navigazione operativa.

**Status:** ready-for-agent

- [ ] Il nome del Calciatore chiamato domina la Scheda d’asta e squadra reale, Ruolo Classic, Slot e Fascia editoriale SOS Fanta formano un blocco identificativo compatto e leggibile nei due temi.
- [ ] PFC e Prezzo adattato all’asta sono i due riferimenti principali, restano semanticamente separati e sono distinguibili rispettivamente come dato del provider e segnale derivato dall’Asta attiva.
- [ ] Prima della Soglia di adattamento viene mostrato il progresso reale nel formato `N di S acquisti nel ruolo`; raggiunta la soglia compare il Prezzo adattato all’asta calcolato dalle regole esistenti.
- [ ] PMA e Percezione storica di mercato sono raggruppati come mercato storico, mentre Fantamedia prevista e Titolarità prevista sono raggruppate come Prestazioni attese, entrambi con enfasi secondaria.
- [ ] A 1280 × 720 e zoom 100% identità, PFC, stato del Prezzo adattato all’asta, Massimo spendibile nella testata e comando `Assegna giocatore` sono interamente visibili senza scorrere.
- [ ] L’apertura del modulo di Acquisto sostituisce il comando `Assegna giocatore`; Squadra e prezzo finale hanno etichette persistenti e `Registra Acquisto` è l’unica azione primaria del modulo.
- [ ] Un Acquisto valido produce un feedback breve e aggiorna la UI esistente; un errore è contestuale al campo, conserva i valori inseriti, il modulo aperto e la posizione di lettura.
- [ ] Profilo editoriale SOS Fanta, Shortlist e Alternative immediate restano sotto la zona decisionale; il Profilo usa una divulgazione nativa da tastiera e le Alternative sono righe confrontabili per nome, squadra reale e PFC.
- [ ] I test browser coprono la prima finestra a 1280 × 720, i due stati della Soglia di adattamento, il flusso tastiera, la sostituzione del comando, un Acquisto valido e la correzione di un errore senza modificare le aspettative dei test di dominio.
