# Definire la promessa dei riferimenti di prezzo

Type: `grilling`
Status: `resolved`
Parent: [Mappa — Specifica MVP dell'assistente d'asta Fantacalcio](../map.md)
Blocked by: none

## Question

Quali riferimenti di prezzo deve promettere la scheda d'asta, come devono adattarsi all'andamento dell'asta corrente e quali vincoli personali devono restare separati dai segnali di mercato?

## Answer

L'MVP non mostra una fascia minima–massima. La scheda d'asta separa riferimenti storici, andamento dell'asta corrente e vincoli personali, senza fondere questi significati in un unico consiglio.

### Riferimenti del CSV

- `PMA` e `PFC` originali sono sempre visibili e non vengono modificati.
- La percezione storica di mercato confronta PMA e PFC usando una tolleranza percentuale configurabile, predefinita al `5%`:
  - PMA superiore al PFC oltre la tolleranza: `In hype`;
  - PMA inferiore al PFC oltre la tolleranza: `Sottovalutato`;
  - differenza compresa nella tolleranza: `In linea`.
- Questa classificazione riguarda il mercato storico rappresentato dal CSV, non l'asta attiva.

### Adattamento all'asta corrente

- Lo scostamento d'asta per ruolo confronta i prezzi finali osservati con i rispettivi PFC per tutti gli acquisti, compresi quelli della squadra principale.
- Il prezzo adattato all'asta applica al PFC del calciatore lo scostamento osservato nel suo ruolo. È un indicatore del mercato corrente e non incorpora budget, composizione o necessità della squadra principale.
- Prima di mostrare il prezzo adattato sono necessari almeno tre acquisti osservati nello stesso ruolo. La soglia è configurabile e il valore predefinito è `3`.
- Prima della soglia la scheda mostra `Dati insufficienti`; dopo la soglia mostra prezzo adattato, scostamento del ruolo e numero di osservazioni.
- Ogni acquisto, correzione o annullamento ricalcola gli indicatori; il reset dell'asta li azzera insieme agli altri progressi.
- Il metodo statistico esatto, incluso il trattamento dei valori anomali, sarà deciso in [Prototipare e calibrare il modello di prezzo](05-prototipare-e-calibrare-il-modello-di-prezzo.md).

### Vincolo personale

- Il prezzo adattato non viene limitato dal budget personale, perché deve conservare il significato di segnale di mercato.
- La scheda mostra separatamente il `Massimo spendibile`, pari al budget residuo della squadra principale meno un credito per ciascun altro posto ancora da riempire.
- Se il ruolo del calciatore è già completo nella squadra principale, la scheda indica `Non acquistabile`; i riferimenti di mercato restano comunque visibili.

### Presentazione

Tutti i prezzi e tutte le percentuali sono mostrati come numeri interi, senza decimali.
