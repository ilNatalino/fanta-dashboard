# Definire scarsità e alternative immediate

Type: `grilling`
Status: `resolved`
Parent: [Mappa — Specifica MVP dell'assistente d'asta Fantacalcio](../map.md)
Blocked by: 06

## Question

Come devono essere definite e comunicate la scarsità per ruolo/slot e le alternative immediate, affinché siano utili senza introdurre nell'MVP previsioni sugli avversari?

## Answer

La scarsità per slot è il conteggio dei calciatori ancora disponibili in ogni slot del ruolo selezionato. Il riepilogo mostra tutti gli slot previsti dal catalogo, compresi quelli esauriti, per esempio `S1 6 · S2 3 · S3 0`. I conteggi diminuiscono con gli acquisti e risalgono quando un acquisto viene annullato.

La scarsità non usa il totale iniziale come denominatore e non produce punteggi o etichette `alta/media/bassa`. Non considera budget, posti mancanti, rose o intenzioni delle squadre avversarie: comunica soltanto l'inventario osservabile del catalogo durante l'asta attiva.

Per il calciatore chiamato, le alternative immediate sono al massimo i primi tre altri calciatori ancora disponibili nello stesso ruolo e nello stesso slot, ordinati per PFC decrescente e poi per nome alfabetico. Se nello slot ne restano meno di tre, la lista ne mostra meno; non viene riempita automaticamente con calciatori di slot diversi. Le categorie della shortlist possono essere evidenziate sulle alternative, ma non ne modificano l'ordine.

Il riepilogo della scarsità viene comunicato come sequenza numerica compatta e neutrale, senza colori d'allarme o giudizi d'urgenza. Ogni alternativa mostra almeno nome, squadra e PFC; mostra anche il prezzo adattato quando disponibile. La disposizione grafica precisa verrà validata in [Prototipare la dashboard desktop durante l'asta](09-prototipare-la-dashboard-desktop-durante-lasta.md).
