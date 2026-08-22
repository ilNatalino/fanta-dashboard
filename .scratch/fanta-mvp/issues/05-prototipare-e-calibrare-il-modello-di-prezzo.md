# Prototipare e calibrare il modello di prezzo

Type: `prototype`
Status: `resolved`
Parent: [Mappa — Specifica MVP dell'assistente d'asta Fantacalcio](../map.md)
Blocked by: 02, 04

## Question

Qual è il metodo più semplice e robusto per calcolare lo scostamento d'asta per ruolo e il prezzo adattato confrontando prezzi finali e PFC, inclusi campioni piccoli, valori anomali, correzioni e annullamenti?

## Answer

Per ogni acquisto attivo dello stesso ruolo si calcola il rapporto `prezzo finale / PFC`. Il moltiplicatore del ruolo è la mediana di questi rapporti; lo scostamento d'asta per ruolo è `mediana − 1` e il prezzo adattato di un calciatore è il suo `PFC × mediana`, arrotondato al credito intero più vicino.

Il prezzo adattato resta nascosto come `Dati insufficienti` finché il ruolo non raggiunge la soglia configurata, predefinita a tre acquisti. Entrano nel campione tutti gli acquisti attivi, compresi quelli della squadra principale. Non si applicano esclusioni, tagli o massimali arbitrari: con tre osservazioni, la mediana permette a due risultati coerenti di prevalere su un singolo valore anomalo.

Il calcolo viene sempre ricostruito dagli acquisti attivi. Una correzione sostituisce squadra o prezzo dell'acquisto; un annullamento rimuove l'osservazione. Se il conteggio scende sotto soglia, il prezzo adattato torna immediatamente a `Dati insufficienti`. Il modello presuppone PFC strettamente positivi; la relativa validazione appartiene a [Definire importazione, correzioni e ripristino locale](08-definire-importazione-correzioni-e-ripristino-locale.md).

Il [prototipo terminale](../prototypes/05-price-model/README.md) ha confrontato mediana dei rapporti, media dei rapporti e rapporto dei totali sui casi rappresentativi. Con rapporti DIF `1,10`, `1,16` e `2,52`, la mediana produce uno scostamento del `+16%`, contro `+59%` della media e `+31%` del rapporto dei totali. Dopo la correzione del valore anomalo, i tre metodi convergono al `+12–13%`. Il prototipo ha inoltre confermato la scomparsa e ricomparsa del prezzo adattato quando un annullamento porta il campione da tre a due osservazioni e un nuovo acquisto lo riporta a tre.

Il repository non contiene metadati Git; il prototipo resta quindi conservato nella cartella `.scratch` e collegato qui come fonte primaria locale, anziché su un branch usa e getta.
