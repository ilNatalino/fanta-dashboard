# Preparare un CSV rappresentativo e casi d'asta

Type: `task`
Status: `resolved`
Parent: [Mappa — Specifica MVP dell'assistente d'asta Fantacalcio](../map.md)
Blocked by: none

## Question

Quale estratto anonimizzato del CSV reale, insieme a una configurazione tipica di lega e ad alcuni esiti d'acquisto rappresentativi, useremo per verificare importazione e guida di prezzo su dati realistici?

## Answer

La fixture parte dal [CSV completo del provider](<../../../Listone_Fantaculo_2026_08_20 - ALL.csv>), composto da 507 calciatori e 44 colonne. L'importazione dell'MVP legge direttamente `name`, `team`, `role`, `slot`, `pma`, `pfc`, `expectedFantamedia` ed `expectedTitolarita`, ignorando le altre colonne senza richiedere una conversione manuale.

Il [catalogo rappresentativo](../assets/04-catalogo-rappresentativo.csv) contiene 32 calciatori anonimizzati, otto per ruolo, e conserva tutte le 44 colonne per esercitare questo contratto d'importazione. Copre gli slot realmente presenti nel foglio — POR 1–3, DIF e CEN 1–8, ATT 1–6 — e include i due casi reali con PMA pari a zero. Nomi, squadre, identificativi e commenti liberi sono anonimizzati; i valori numerici restano quelli del foglio sorgente.

La [configurazione d'asta](../assets/04-configurazione-asta.csv) usa otto squadre, 1.000 crediti iniziali e rose da 3 POR, 8 DIF, 8 CEN e 6 ATT. Conserva inoltre la soglia di adattamento predefinita a tre osservazioni e la tolleranza della percezione storica al 5%.

Gli [eventi d'asta sintetici](../assets/04-eventi-asta.csv) comprendono 15 acquisti, una correzione e un annullamento. Coprono mercato in linea, sovrapprezzo, sottoprezzo, valore anomalo, raggiungimento della soglia, ritorno sotto soglia e nuovo raggiungimento; ogni evento indica il conteggio atteso per ruolo e se il prezzo adattato debba essere disponibile. Tutte le assegnazioni rispettano budget e posti della configurazione; la spesa massima raggiunta da una squadra è 562 crediti.

Una [cartella di lavoro di verifica](../../../outputs/wayfinder-ticket-04/fixture-rappresentativa.xlsx) riunisce in forma leggibile catalogo, configurazione ed eventi.
