# Mappa — Specifica MVP dell'assistente d'asta Fantacalcio

Label: `wayfinder:map`

## Destination

Una specifica MVP completa e pronta per l'implementazione di una web app desktop personale che, durante un'asta live Classic, mostra per il calciatore chiamato riferimenti di prezzo storici e adattati all'asta corrente e permette di registrare rapidamente gli acquisti.

## Notes

- Dominio e lessico canonico: [Asta Fantacalcio](../../CONTEXT.md).
- Consultare `/wayfinder`, `/grilling` e `/domain-modeling` in ogni sessione; usare `/prototype` nei ticket di tipo `prototype`.
- Il fantallenatore principale usa l'app da solo e senza account; i dati devono sopravvivere al refresh sullo stesso dispositivo.
- La configurazione d'asta comprende numero di squadre, budget iniziale comune e posti POR/DIF/CEN/ATT, tutti modificabili con valori predefiniti.
- Ogni acquisto assegna un calciatore a una squadra specifica e conserva il prezzo finale; non si registrano i singoli rilanci.
- Il calciatore chiamato viene selezionato tramite ricerca testuale e mostrato in una scheda d'asta compatta.
- L'input iniziale è il CSV completo del provider: l'app legge `name`, `team`, `role`, `slot`, `pma`, `pfc`, `expectedFantamedia` ed `expectedTitolarita` e ignora le altre colonne. `slot` conserva la scala ordinale del foglio sorgente (attualmente 1–8, con massimo variabile per ruolo) ed `expectedTitolarita` usa la scala 0–100.
- La scheda separa PMA, PFC, percezione storica di mercato, prezzo adattato allo scostamento del ruolo e massimo spendibile personale.
- La shortlist usa categorie personali, personalizzabili e sovrapponibili; serve a organizzare i calciatori d'interesse senza influenzare prezzi o raccomandazioni.

## Decisions so far

<!-- Le risoluzioni compariranno qui come indice, una riga per ticket chiuso. -->

- [Definire il ciclo della sessione d'asta](issues/01-definire-il-ciclo-della-sessione-dasta.md#answer) — Un solo catalogo e una sola asta persistente, con setup bloccato all'avvio, assegnazioni correggibili, reset dei soli progressi e nessuna chiusura esplicita.
- [Definire la promessa dei riferimenti di prezzo](issues/02-definire-la-promessa-della-fascia-di-prezzo.md#answer) — PMA e PFC restano visibili; il prezzo adattato riflette lo scostamento live del ruolo dopo una soglia configurabile, mentre il massimo spendibile resta un vincolo personale separato.
- [Definire il modello della shortlist](issues/03-definire-il-modello-della-shortlist.md#answer) — Categorie personali, sovrapponibili e persistenti organizzano i calciatori d'interesse, ma non alterano prezzi, ranking o alternative.
- [Preparare un CSV rappresentativo e casi d'asta](issues/04-preparare-un-csv-rappresentativo-e-casi-dasta.md#answer) — Una fixture anonima da 32 calciatori, la configurazione a otto squadre e 17 eventi controllati coprono importazione reale, soglie, anomalie, correzione e annullamento.
- [Prototipare e calibrare il modello di prezzo](issues/05-prototipare-e-calibrare-il-modello-di-prezzo.md#answer) — Lo scostamento usa la mediana dei rapporti prezzo finale/PFC degli acquisti attivi per ruolo, disponibile dalla soglia configurata e ricalcolata dopo correzioni o annullamenti.
- [Definire il ranking dei giocatori disponibili](issues/06-definire-il-ranking-dei-giocatori-disponibili.md#answer) — Ogni ruolo ha un ranking dei disponibili per PFC decrescente e nome alfabetico; gli altri segnali restano filtri o ordinamenti alternativi e non esiste un Auction Score.
- [Definire scarsità e alternative immediate](issues/07-definire-scarsita-e-alternative-immediate.md#answer) — La scarsità conta i disponibili di ogni slot del ruolo; le alternative sono fino a tre disponibili dello stesso ruolo e slot, senza punteggi d'urgenza né previsioni sugli avversari.
- [Definire importazione, correzioni e ripristino locale](issues/08-definire-importazione-correzioni-e-ripristino-locale.md#answer) — Importazione, correzioni e ripristino sono atomici; autosalvataggio, copia valida precedente e backup manuale proteggono lo stato locale senza promettere sincronizzazione.
- [Prototipare la dashboard desktop durante l'asta](issues/09-prototipare-la-dashboard-desktop-durante-lasta.md#answer) — Un command center a tre colonne tiene sempre visibile la rosa principale e si completa con viste dedicate a rosa e squadre, separando segnali di mercato, vincoli personali e dati osservati.
- [Definire gli scenari di accettazione dell'MVP](issues/10-definire-gli-scenari-di-accettazione-dellmvp.md#answer) — Quindici scenari osservabili coprono il percorso nominale e i rischi critici usando fixture canoniche, risultati deterministici e vincoli d'interfaccia non estetici.

## Not yet specified

Nessuna area ancora nella nebbia.

## Out of scope

- Modalità Mantra o ruoli diversi da POR/DIF/CEN/ATT.
- Account, multiutente, collaborazione in tempo reale, sincronizzazione cloud e interfaccia mobile.
- Inserimento del prezzo corrente, cronologia dei rilanci e guida semaforica durante ogni offerta.
- Inflazione generale dell'asta, market temperature e ricalibrazione basata su budget, rose o intenzioni degli avversari.
- Monitoraggio strategico, competitor analysis e previsione delle intenzioni degli avversari.
- Probability/risk engine, opportunity cost, simulazioni what-if ed endgame optimizer.
- Generazione automatica dei piani A/B/C e nomination advisor.
