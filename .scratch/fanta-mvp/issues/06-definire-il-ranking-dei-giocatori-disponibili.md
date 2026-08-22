# Definire il ranking dei giocatori disponibili

Type: `grilling`
Status: `resolved`
Parent: [Mappa — Specifica MVP dell'assistente d'asta Fantacalcio](../map.md)
Blocked by: 03, 05

## Question

Che cosa deve ordinare il ranking dei calciatori disponibili, quali segnali devono contribuire e se un Auction Score numerico debba essere mostrato all'utente oppure restare un dettaglio interno?

## Answer

L'MVP presenta un ranking distinto per ciascun ruolo Classic, non una classifica globale tra POR, DIF, CEN e ATT. Il ranking predefinito contiene i calciatori non ancora acquistati del ruolo selezionato e li ordina per PFC decrescente; a parità di PFC usa il nome alfabetico come unico criterio di spareggio.

Il prezzo adattato non introduce un ordinamento separato: applica lo stesso moltiplicatore a tutti i calciatori di uno stesso ruolo e conserva quindi l'ordine del PFC. Il confronto di urgenza tra ruoli appartiene a [Definire scarsità e alternative immediate](07-definire-scarsita-e-alternative-immediate.md), non al ranking.

Slot, PMA, fantamedia prevista e titolarità prevista restano visibili e possono essere usati come filtri o ordinamenti alternativi. Non vengono però combinati con il PFC né pesati in una formula composita. Le categorie della shortlist possono filtrare o evidenziare i calciatori d'interesse, ma non cambiano il loro posto nel ranking.

L'Auction Score non fa parte dell'MVP: non viene mostrato e non viene calcolato neppure come dettaglio interno. Sarebbe una duplicazione meno trasparente della valutazione del provider e introdurrebbe una precisione artificiale senza un beneficio distinto.
