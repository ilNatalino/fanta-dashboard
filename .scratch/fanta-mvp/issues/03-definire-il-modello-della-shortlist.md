# Definire il modello della shortlist

Type: `grilling`
Status: `resolved`
Parent: [Mappa — Specifica MVP dell'assistente d'asta Fantacalcio](../map.md)
Blocked by: none

## Question

Quali categorie manuali servono davvero nell'MVP, se siano alternative mutuamente esclusive o etichette combinabili, e come debbano influenzare ranking e alternative senza alterare i riferimenti di prezzo del mercato?

## Answer

La shortlist è uno strumento personale di memoria e organizzazione. Non esistono categorie predefinite né un'etichetta separata `Preferito`.

### Appartenenza e categorie

- Il fantallenatore principale crea e nomina liberamente le categorie della shortlist.
- Il nome è obbligatorio e univoco ignorando maiuscole, minuscole e spazi iniziali o finali.
- Un calciatore può appartenere a più categorie contemporaneamente.
- Un calciatore appartiene alla shortlist quando è associato ad almeno una categoria; rimuoverlo dall'ultima categoria lo rimuove anche dalla shortlist.

### Gestione

- Le categorie possono essere create, rinominate o eliminate prima o durante l'asta.
- Eliminare una categoria popolata richiede conferma e rimuove soltanto la categoria e le sue associazioni; non modifica catalogo, calciatori o acquisti.
- Un calciatore può essere aggiunto o rimosso dalle categorie sia dalla lista del catalogo sia dalla sua scheda d'asta.
- L'MVP non richiede una schermata separata per operazioni massive; le interazioni precise saranno validate nel prototipo della dashboard.

### Acquisti e persistenza

- Categorie e associazioni sopravvivono al reset dell'asta insieme agli altri dati preparatori.
- Un calciatore acquistato conserva le categorie ma viene nascosto dalla vista predefinita dei disponibili nella shortlist.
- Un filtro consente di mostrare anche gli acquistati; se un acquisto viene annullato, il calciatore torna automaticamente tra i disponibili conservando le categorie.

### Effetti sul resto del prodotto

Le categorie servono esclusivamente a organizzare, filtrare ed evidenziare i calciatori d'interesse. Non modificano PMA, PFC, prezzo adattato, ranking o selezione delle alternative. Un'eventuale priorità personale con effetti analitici dovrà essere un concetto separato e verrà valutata nel ticket sul ranking.
