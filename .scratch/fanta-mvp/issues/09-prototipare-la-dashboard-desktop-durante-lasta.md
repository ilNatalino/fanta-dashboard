# Prototipare la dashboard desktop durante l'asta

Type: `prototype`
Status: `resolved`
Parent: [Mappa — Specifica MVP dell'assistente d'asta Fantacalcio](../map.md)
Blocked by: 01, 03, 05, 07, 08

## Question

Quale disposizione desktop e quali interazioni rendono immediati ricerca, lettura della scheda d'asta, controllo di rosa e budget e registrazione dell'acquisto senza sovraccaricare la schermata?

## Answer

Il [prototipo interattivo della dashboard](../prototypes/09-dashboard/README.md) ha confrontato tre strutture: un command center a tre colonne, una vista concentrata sul calciatore chiamato e una tabella con inspector laterale. La base scelta è **A — Command center**, estesa con le pagine `Asta`, `La mia rosa` e `Squadre`.

### Pagina Asta

La schermata live mantiene tre colonne con responsabilità distinte:

1. A sinistra, il ranking dei calciatori disponibili del ruolo selezionato, con selettore POR/DIF/CEN/ATT e riepilogo neutrale della scarsità per slot.
2. Al centro, la Scheda d'asta del calciatore chiamato. Il primo livello mostra identità, ruolo, squadra, slot, percezione storica, PMA, PFC e prezzo adattato; fantamedia e titolarità previste, alternative immediate e categorie della shortlist restano informazioni secondarie ma visibili. Il comando `Assegna giocatore` apre il modulo compatto per squadra acquirente e prezzo finale.
3. A destra, la rosa della Squadra principale resta sempre visibile. Budget residuo e Massimo spendibile sono affiancati in una zona fissa; sotto compare l'elenco completo dei calciatori acquistati, raggruppato per ruolo e scorrevole autonomamente. Il precedente riepilogo grafico dei posti POR/DIF/CEN/ATT è stato eliminato per non duplicare la pagina dedicata.

Il Massimo spendibile non compare più tra i segnali di mercato della Scheda d'asta: resta fisso accanto al budget residuo, chiarendo che è un vincolo della Squadra principale e non una valutazione del calciatore. La testata globale mostra sempre nome della Squadra principale, budget residuo e numero di posti occupati.

### Pagina La mia rosa

La vista dedicata presenta la rosa in colonne per ruolo, non su un campo da gioco: l'MVP organizza una rosa d'asta e non una formazione o un modulo. Per ciascun reparto l'intestazione mostra insieme:

- crediti spesi nel ruolo;
- percentuale rispetto al budget iniziale comune;
- Posti di ruolo occupati e totali.

Ogni colonna elenca i calciatori acquistati con prezzo, squadra reale e Slot, seguiti dai Posti di ruolo ancora liberi. Sopra la rosa compaiono due specchietti separati: la distribuzione degli Slot acquisiti dalla Squadra principale per ruolo e la Scarsità per slot ancora osservabile nel catalogo, sempre distinta dai Posti di ruolo liberi.

### Pagina Squadre

La pagina `Squadre` mostra tutte le Squadre avversarie e permette di aprirne la rosa completa. Per ciascuna riporta soltanto fatti derivati dagli acquisti registrati: budget residuo, crediti spesi, Posti di ruolo occupati e calciatori acquistati con prezzo finale. Non introduce punteggi strategici, confronti d'urgenza o previsioni sulle intenzioni degli avversari.

### Navigazione e densità

La navigazione primaria è `Asta · La mia rosa · Squadre`. La ricerca del calciatore chiamato e il riepilogo compatto della Squadra principale restano nella testata. Le informazioni analitiche dettagliate sulla rosa — spesa percentuale e matrici degli Slot — vivono soltanto nella pagina `La mia rosa`; la schermata live conserva il minimo necessario per operare rapidamente.

Il prototipo è intenzionalmente usa-e-getta, senza persistenza né calcoli di produzione. Le varianti restano selezionabili tramite `?variant=A|B|C`, mentre le pagine della variante scelta usano `?page=roster|teams`, così l'artefatto conserva le alternative valutate come fonte primaria della decisione.
