# Aggiornamento dello stile grafico dell'app

Status: `ready-for-agent`

## Problem Statement

Durante un'Asta live il Fantallenatore principale deve riconoscere in pochi secondi il Calciatore chiamato, confrontare PFC e Prezzo adattato all'asta, controllare i vincoli della Squadra principale e registrare l'Acquisto. L'interfaccia corrente contiene tutte queste informazioni, ma assegna spesso lo stesso peso visivo a pannelli, controlli, badge e dati secondari. La ripetizione di superfici arrotondate, riempimenti verdi e testi molto marcati rende la dashboard simile a un template generico e rallenta la scansione.

Nel command center, la testata occupa una parte importante dell'altezza disponibile. A 1280 x 720 il comando per assegnare il Calciatore chiamato può trovarsi sotto il bordo iniziale della finestra. Ranking e Scarsità per slot usano molti contenitori separati, mentre PFC, PMA, Prestazioni attese e segnali dell'Asta live hanno una gerarchia troppo uniforme. Il risultato è ordinato, ma non comunica con sufficiente chiarezza quale decisione vada presa per prima.

Il tema scuro presenta inoltre un difetto concreto di leggibilità nella Fascia editoriale SOS Fanta. Il tema chiaro usa il verde dell'accento anche per alcuni testi e collegamenti, con un contrasto insufficiente su superfici chiare. Catalogo calciatori e vista Squadre consumano infine molto spazio verticale prima di mostrare o rendere confrontabili i dati principali, soprattutto quando le rose sono ancora vuote.

L'app ha già un'identità sportiva verde riconoscibile e un'architettura dell'informazione adatta al dominio. Serve quindi un'evoluzione mirata che preservi flussi e terminologia, ma introduca una gerarchia più netta, una maggiore densità operativa e un linguaggio visivo autentico legato al contesto dell'asta.

## Solution

Aggiornare l'interfaccia con una direzione stilistica ispirata al tabellino calcistico e al foglio operativo usato durante un'asta. La nuova grammatica visiva userà tipografia condensata per nomi e titoli brevi, numeri tabulari per crediti e statistiche, superfici più neutre, raggi contenuti e divisori funzionali. Il verde esistente resterà l'accento dell'app, ma sarà riservato alle azioni primarie, alla selezione corrente e a pochi segnali che richiedono attenzione.

Il redesign sarà un'evoluzione dell'interfaccia esistente. Non cambierà la struttura di navigazione, il vocabolario di dominio, la logica dell'Asta attiva o il modello di persistenza. La Scheda d'asta rimarrà al centro del command center e avrà la priorità visiva. PFC e Prezzo adattato all'asta diventeranno i riferimenti principali; PMA, Percezione storica di mercato e Prestazioni attese formeranno un livello informativo secondario. Il riepilogo della Squadra principale sarà più compatto e leggibile, mentre l'azione di assegnazione sarà raggiungibile senza scorrere in una finestra desktop da 1280 x 720.

Ranking e Scarsità per slot adotteranno righe compatte al posto di una successione di piccole card. Il Catalogo calciatori mostrerà prima la tabella e userà una barra filtri più densa. La vista Squadre aprirà con un confronto sintetico tra tutte le Squadre e permetterà di espandere la rosa interessata. La mia rosa manterrà l'organizzazione per Ruolo Classic, con stati vuoti espliciti e una gerarchia più chiara tra spesa, posti occupati e Acquisti.

L'identità sarà coerente nei temi chiaro e scuro. Ogni testo informativo rispetterà almeno il contrasto WCAG AA, gli stati non dipenderanno soltanto dal colore e il movimento sarà limitato a feedback brevi di selezione, apertura e conferma. La direzione complessiva corrisponde a `DESIGN_VARIANCE: 4`, `MOTION_INTENSITY: 2` e `VISUAL_DENSITY: 7`.

## User Stories

1. Come Fantallenatore principale, voglio riconoscere immediatamente il Calciatore chiamato, così da concentrare l'attenzione sulla decisione corrente.
2. Come Fantallenatore principale, voglio vedere il nome del Calciatore chiamato con una tipografia distinta dai dati secondari, così da orientarmi rapidamente nel command center.
3. Come Fantallenatore principale, voglio vedere squadra reale, Ruolo Classic, Slot e Fascia editoriale SOS Fanta come un unico blocco identificativo leggibile, così da capire subito il profilo del calciatore.
4. Come Fantallenatore principale, voglio leggere chiaramente la Fascia editoriale SOS Fanta in entrambi i temi, così da non perdere un'informazione disponibile a causa del contrasto.
5. Come Fantallenatore principale, voglio distinguere il PFC come riferimento principale del provider, così da trovarlo senza analizzare tutte le metriche.
6. Come Fantallenatore principale, voglio distinguere il Prezzo adattato all'asta come segnale principale dell'Asta attiva, così da confrontarlo direttamente con il PFC.
7. Come Fantallenatore principale, voglio che PFC e Prezzo adattato all'asta rimangano semanticamente separati, così da non confondere una valutazione del provider con un dato derivato dal mercato corrente.
8. Come Fantallenatore principale, voglio consultare PMA e Percezione storica di mercato in un livello informativo secondario, così da usarli come contesto senza farli competere con la decisione principale.
9. Come Fantallenatore principale, voglio consultare Fantamedia prevista e Titolarità prevista in un gruppo coerente, così da leggere insieme le Prestazioni attese.
10. Come Fantallenatore principale, voglio vedere quante osservazioni mancano alla Soglia di adattamento, così da comprendere perché il Prezzo adattato all'asta non è ancora disponibile.
11. Come Fantallenatore principale, voglio vedere il comando `Assegna giocatore` insieme ai riferimenti principali del Calciatore chiamato, così da passare rapidamente dalla consultazione alla registrazione.
12. Come Fantallenatore principale, voglio raggiungere l'assegnazione senza scorrere a 1280 x 720, così da non perdere tempo durante l'Asta live.
13. Come Fantallenatore principale, voglio che l'apertura del modulo di Acquisto sostituisca visivamente il comando che l'ha aperto, così da evitare due azioni concorrenti nello stesso spazio.
14. Come Fantallenatore principale, voglio vedere Squadra e prezzo finale con etichette persistenti sopra i campi, così da compilare il modulo senza ambiguità.
15. Come Fantallenatore principale, voglio che il comando `Registra Acquisto` sia l'unica azione primaria del modulo aperto, così da riconoscere con chiarezza il passo conclusivo.
16. Come Fantallenatore principale, voglio ricevere un feedback visivo breve dopo un Acquisto valido, così da sapere che lo stato è stato registrato.
17. Come Fantallenatore principale, voglio vedere gli errori di Acquisto vicino ai campi interessati, così da correggerli senza cercare un messaggio lontano dal modulo.
18. Come Fantallenatore principale, voglio che un errore conservi i valori già inseriti e la posizione di lettura, così da correggere rapidamente il dato sbagliato.
19. Come Fantallenatore principale, voglio consultare il Profilo editoriale SOS Fanta tramite una divulgazione progressiva compatta, così da aprire il testo soltanto quando mi serve.
20. Come Fantallenatore principale, voglio vedere le Alternative immediate come righe confrontabili, così da confrontare nome, squadra reale e PFC senza rumore visivo.
21. Come Fantallenatore principale, voglio vedere il nome della Squadra principale con maggiore evidenza nella testata, così da riconoscere sempre il mio contesto operativo.
22. Come Fantallenatore principale, voglio leggere budget residuo e Massimo spendibile come valori separati e ben allineati, così da non confondere disponibilità totale e vincolo sul prossimo Acquisto.
23. Come Fantallenatore principale, voglio vedere i Posti di ruolo occupati senza sottrarre spazio alla ricerca del Calciatore chiamato, così da conservare il contesto della rosa in una testata compatta.
24. Come Fantallenatore principale, voglio che la testata occupi meno altezza sul desktop, così da lasciare più spazio alle decisioni dell'Asta live.
25. Come Fantallenatore principale, voglio continuare a raggiungere `Asta`, `La mia rosa`, `Squadre`, `Catalogo`, `Configurazione` e `Backup` con le etichette correnti, così da non dover imparare una nuova architettura dell'informazione.
26. Come Fantallenatore principale, voglio che la vista corrente sia riconoscibile senza una grande capsula verde, così da avere una navigazione più sobria e meno simile a un template.
27. Come Fantallenatore principale, voglio che la navigazione rimanga accessibile su schermi stretti e renda visibile la voce corrente, così da cambiare vista senza perdere l'orientamento.
28. Come Fantallenatore principale, voglio cercare il Calciatore chiamato con lo stesso flusso e la stessa scorciatoia da tastiera già disponibili, così da conservare la velocità operativa acquisita.
29. Come Fantallenatore principale, voglio che il Ranking usi righe compatte e allineate, così da confrontare più calciatori nello stesso spazio.
30. Come Fantallenatore principale, voglio distinguere chiaramente il calciatore selezionato nel Ranking, così da collegare la riga alla Scheda d'asta aperta.
31. Come Fantallenatore principale, voglio che lo stato selezionato del Ranking sia riconoscibile anche senza percepire il colore, così da usare l'interfaccia in condizioni visive diverse.
32. Come Fantallenatore principale, voglio che nome e metrica ordinata abbiano colonne visive stabili nel Ranking, così da confrontare i valori senza movimenti irregolari dello sguardo.
33. Come Fantallenatore principale, voglio cambiare Ruolo Classic con controlli compatti ma facili da attivare, così da esplorare POR, DIF, CEN e ATT rapidamente.
34. Come Fantallenatore principale, voglio vedere il filtro degli acquistati nella Shortlist soltanto quando ho selezionato una Categoria della shortlist, così da non incontrare un controllo inattivo senza contesto.
35. Come Fantallenatore principale, voglio che Scarsità per slot mostri Slot e disponibili in colonne allineate, così da individuare immediatamente le fasce in esaurimento.
36. Come Fantallenatore principale, voglio vedere anche gli Slot con zero disponibili con uno stato testuale chiaro, così da riconoscere un esaurimento senza dipendere dal colore.
37. Come Fantallenatore principale, voglio che Ranking e Scarsità per slot restino distinti ma visivamente coordinati, così da leggere offerta disponibile e distribuzione per Slot come due prospettive dello stesso Ruolo Classic.
38. Come Fantallenatore principale, voglio che Ranking e Scarsità per slot restino raggiungibili durante lo scorrimento desktop, così da conservare il contesto mentre consulto una Scheda d'asta lunga.
39. Come Fantallenatore principale, voglio che Scheda d'asta, Ranking e Scarsità per slot mantengano l'ordine attuale su tablet e mobile, così da conservare la priorità operativa già definita.
40. Come Fantallenatore principale, voglio che il Catalogo calciatori mostri più righe nella prima finestra, così da iniziare prima il confronto dei dati.
41. Come Fantallenatore principale, voglio trovare titolo, conteggio e azioni del Catalogo in una testata compatta, così da capire lo stato senza sottrarre spazio alla tabella.
42. Come Fantallenatore principale, voglio che ricerca, Ruolo, Slot e stato siano organizzati in una barra filtri coerente, così da modificare i criteri con meno spostamenti dello sguardo.
43. Come Fantallenatore principale, voglio che il comando per azzerare i filtri abbia un peso secondario, così da non competere con le azioni principali dell'app.
44. Come Fantallenatore principale, voglio che le intestazioni ordinabili del Catalogo indichino chiaramente la colonna e la direzione correnti, così da comprendere l'ordine dei risultati.
45. Come Fantallenatore principale, voglio che i numeri del Catalogo usino cifre tabulari e un allineamento coerente, così da confrontare facilmente PMA, PFC, Fantamedia prevista e Titolarità prevista.
46. Come Fantallenatore principale, voglio che il passaggio del puntatore evidenzi la riga completa del Catalogo, così da seguire una voce attraverso tutte le colonne.
47. Come Fantallenatore principale, voglio che la versione mobile del Catalogo mantenga la gerarchia dei dati senza simulare una tabella compressa, così da leggere ogni calciatore su uno schermo stretto.
48. Come Fantallenatore principale, voglio confrontare tutte le Squadre attraverso un riepilogo sintetico, così da individuare rapidamente differenze di budget, Massimo spendibile e posti occupati.
49. Come Fantallenatore principale, voglio espandere la rosa di una Squadra interessata, così da vedere gli Acquisti senza attraversare grandi pannelli vuoti.
50. Come Fantallenatore principale, voglio riconoscere la Squadra principale nel confronto tra Squadre tramite testo e trattamento strutturale, così da non dipendere soltanto da un bordo verde.
51. Come Fantallenatore principale, voglio che le Squadre senza Acquisti occupino poco spazio e mostrino uno stato vuoto esplicito, così da evitare lunghe zone bianche all'inizio dell'asta.
52. Come Fantallenatore principale, voglio vedere La mia rosa organizzata per Ruolo Classic con una gerarchia chiara tra spesa, percentuale del budget e posti occupati, così da valutare la composizione della Squadra principale.
53. Come Fantallenatore principale, voglio vedere uno stato vuoto esplicito in ogni Ruolo Classic ancora senza Acquisti, così da distinguere l'assenza di dati da un errore di caricamento.
54. Come Fantallenatore principale, voglio usare la stessa identità visiva nei temi chiaro e scuro, così da non percepire due prodotti differenti.
55. Come Fantallenatore principale, voglio che tutti i testi operativi e informativi rispettino almeno il contrasto WCAG AA, così da leggere la dashboard in modo affidabile.
56. Come Fantallenatore principale, voglio che focus, selezione, errore, successo e indisponibilità siano riconoscibili anche senza il solo colore, così da usare l'app con tastiera e tecnologie assistive.
57. Come Fantallenatore principale, voglio che i controlli principali abbiano un'area di attivazione adeguata anche su touch, così da evitare errori su schermi piccoli.
58. Come Fantallenatore principale, voglio che le transizioni siano brevi e legate a un cambio di stato, così da ricevere feedback senza distrazioni durante l'asta.
59. Come Fantallenatore principale, voglio che l'app rispetti la preferenza di riduzione del movimento, così da evitare animazioni non desiderate.
60. Come Fantallenatore principale, voglio ritrovare stile, caratteri e icone anche offline, così da avere la stessa esperienza nella PWA senza connessione.
61. Come Fantallenatore principale, voglio che il caricamento del carattere non produca spostamenti visibili del layout, così da mantenere stabile il command center all'apertura.
62. Come manutentore, voglio conservare lo stack browser-native esistente, così da aggiornare l'interfaccia senza introdurre un framework o una seconda architettura frontend.
63. Come manutentore, voglio usare token semantici per superfici, testo, bordo, accento e stati, così da mantenere coerenti tema chiaro e tema scuro.
64. Come manutentore, voglio distinguere il token verde per sfondi dal token verde per testo, così da poter rispettare il contrasto senza cambiare l'identità dell'app.
65. Come manutentore, voglio verificare il redesign attraverso il comportamento pubblico in un browser reale, così da evitare test fragili basati sui dettagli interni del CSS.
66. Come manutentore, voglio conservare i test di dominio e persistenza esistenti senza modificarne le aspettative, così da garantire che l'aggiornamento grafico non alteri le regole dell'app.

## Implementation Decisions

- Il lavoro sarà un redesign con preservazione. La struttura delle viste, le etichette della navigazione primaria, i flussi operativi e la terminologia definita dal dominio rimarranno invariati.
- La direzione stilistica sarà denominata `tabellino d'asta`: un linguaggio sportivo sobrio costruito con titoli brevi condensati, dati numerici tabulari, allineamenti netti, superfici neutre e divisori funzionali.
- I parametri guida saranno `DESIGN_VARIANCE: 4`, `MOTION_INTENSITY: 2` e `VISUAL_DENSITY: 7`. L'interfaccia privilegerà stabilità e densità rispetto a composizioni decorative o animazioni continue.
- Carbon Design System sarà usato come riferimento per anatomia delle tabelle, barre strumenti, ordinamento, righe espandibili e densità. Non verrà installato Carbon, perché l'app non usa React e il redesign deve conservare lo stack browser-native.
- Non verranno introdotti framework frontend, librerie di componenti o dipendenze runtime. I componenti continueranno a essere prodotti dal livello di rendering TypeScript e stilizzati con CSS nativo.
- Verrà introdotta una famiglia tipografica composta da Barlow Semi Condensed per nome del Calciatore chiamato, titoli di Ruolo Classic e intestazioni brevi, con la variante regolare della stessa famiglia per il testo dell'interfaccia. I file necessari saranno ospitati localmente, caricati in formato WOFF2 con `font-display: swap` e inclusi nell'app shell offline.
- I valori di crediti, percentuali, Slot e metriche useranno cifre tabulari. Il peso tipografico massimo sarà riservato ai valori decisionali e alle azioni, riducendo l'uso generalizzato del grassetto.
- Il verde attuale resterà l'unico accento cromatico. Verranno separati semanticamente almeno accento di superficie, testo su accento, accento testuale e bordo di focus, con valori distinti per tema chiaro e scuro.
- Il bagliore radiale dello sfondo verrà rimosso. Le superfici useranno una scala neutra coerente all'interno di ciascun tema, senza inversioni locali di tema.
- Il sistema delle forme userà raggi contenuti, indicativamente tra 6 e 8 px per pannelli e controlli. Le capsule saranno limitate a casi semanticamente giustificati e non saranno usate per la navigazione, le righe del Ranking o i valori di Scarsità per slot.
- Le ombre saranno limitate agli elementi realmente sovrapposti o sticky. La struttura ordinaria userà spazio, differenze di superficie e bordi sottili.
- La testata desktop verrà compressa in modo che navigazione e riepilogo operativo usino meno altezza. Il riepilogo della Squadra principale mostrerà nome, budget residuo, Massimo spendibile e posti occupati come valori allineati e scansionabili.
- La ricerca del Calciatore chiamato resterà nel command center superiore e conserverà l'attuale scorciatoia da tastiera. Il flusso di suggerimento, apertura e chiusura della Scheda d'asta non cambierà.
- La navigazione primaria manterrà tutte le etichette e destinazioni correnti. La vista corrente sarà indicata tramite peso, colore testuale e bordo o sottolineatura, senza usare una grande superficie piena.
- Su schermi stretti la navigazione resterà accessibile orizzontalmente e porterà in vista la destinazione corrente dopo un cambio di vista. I target interattivi principali avranno almeno 44 x 44 px.
- Il command center desktop manterrà Ranking a sinistra, Scheda d'asta al centro e Scarsità per slot a destra. La Scheda d'asta continuerà ad avere una larghezza maggiore delle colonne laterali.
- La prima porzione della Scheda d'asta conterrà identità del calciatore, PFC, stato del Prezzo adattato all'asta e azione di assegnazione. Questi elementi dovranno essere visibili senza scorrere in una finestra da 1280 x 720 con zoom 100%.
- PMA e Percezione storica di mercato saranno raggruppati come mercato storico. Fantamedia prevista e Titolarità prevista saranno raggruppate come Prestazioni attese. I due gruppi avranno enfasi inferiore rispetto a PFC e Prezzo adattato all'asta.
- Prima del raggiungimento della Soglia di adattamento, la Scheda d'asta mostrerà il progresso reale nel formato `N di S acquisti nel ruolo`, dove `N` è il numero di osservazioni disponibili e `S` è la soglia configurata. Non verranno inventati valori o raccomandazioni.
- La Fascia editoriale SOS Fanta sarà resa come testo breve ad alto contrasto accanto ai dati identificativi. Non verrà sovrapposta a immagini e non dipenderà dal solo colore.
- Il modulo di Acquisto sarà visualizzato al posto del comando `Assegna giocatore` dopo l'apertura. Squadra e prezzo finale conserveranno etichette visibili; l'errore sarà contestuale e il comando `Registra Acquisto` resterà l'unica azione primaria del modulo.
- Il Profilo editoriale SOS Fanta, la Shortlist e le Alternative immediate resteranno sotto la zona decisionale. La divulgazione del profilo conserverà il controllo nativo e le sue proprietà da tastiera.
- Il Ranking userà righe compatte con nome a sinistra e metrica ordinata a destra. La riga selezionata userà almeno due segnali tra indicatore strutturale, peso, contrasto e colore.
- I controlli di ordinamento e filtro del Ranking verranno compattati. L'opzione per mostrare gli acquistati nella Shortlist sarà nascosta finché non viene selezionata una Categoria della shortlist.
- Scarsità per slot userà una struttura a due colonne visive, con nome dello Slot e numero di disponibili. Gli Slot esauriti resteranno visibili e includeranno una descrizione testuale dello stato.
- Ranking e Scarsità per slot manterranno lo sticky positioning su desktop. Su tablet e mobile resteranno nel flusso del documento nell'ordine già definito: Scheda d'asta, Ranking, Scarsità per slot.
- Il Catalogo calciatori userà un'intestazione più compatta con titolo, conteggio e azioni. Ricerca, Ruolo Classic, Slot e stato saranno raccolti in una barra strumenti che lascia più spazio verticale alla tabella.
- La tabella del Catalogo conserverà tutte le colonne, gli ordinamenti e il comportamento sticky esistenti. Intestazioni e righe avranno la stessa altezza all'interno della variante scelta; il passaggio del puntatore evidenzierà la riga completa.
- La vista mobile del Catalogo continuerà a usare una presentazione dedicata a lista. La gerarchia dei dati seguirà nome, squadra reale, Ruolo Classic e Slot, metriche del provider, Shortlist e stato.
- La vista Squadre aprirà con un confronto compatto di tutte le Squadre. Ogni riga mostrerà nome, budget residuo, Massimo spendibile, posti totali occupati e occupazione per Ruolo Classic.
- La rosa dettagliata di una Squadra sarà mostrata tramite una riga espandibile o un pannello collegato alla riga selezionata. Una sola rosa dovrà essere aperta per impostazione predefinita; l'apertura non modificherà lo stato di dominio.
- Le Squadre senza Acquisti mostreranno uno stato vuoto compatto invece di riservare l'altezza di una rosa completa. La Squadra principale sarà identificata esplicitamente nel testo e attraverso un trattamento strutturale.
- La mia rosa manterrà quattro gruppi per POR, DIF, CEN e ATT su desktop. Ogni gruppo mostrerà spesa, percentuale del budget e posti occupati nello stesso ordine e includerà uno stato vuoto quando non contiene Acquisti.
- Stati vuoti, errori, avvisi e conferme useranno la stessa gerarchia tipografica e cromatica del resto dell'app. I messaggi persistenti resteranno contestuali; non verranno introdotte notifiche decorative.
- Le transizioni riguarderanno soltanto `transform` e `opacity`, dureranno pochi istanti e comunicheranno pressione, selezione, apertura o conferma. Non verranno introdotte animazioni allo scorrimento, effetti perpetui o movimento decorativo.
- `prefers-reduced-motion` continuerà a eliminare le transizioni non essenziali. I temi chiaro e scuro saranno verificati separatamente e conserveranno la stessa gerarchia.
- Testo normale, etichette, placeholder, link e badge dovranno raggiungere almeno 4.5:1 rispetto allo sfondo. Contorni di focus e confini essenziali dei controlli dovranno raggiungere almeno 3:1 rispetto ai colori adiacenti.
- Il caricamento dei caratteri dovrà evitare spostamenti del layout. Il redesign non dovrà peggiorare la capacità della PWA di funzionare offline o introdurre richieste runtime verso servizi di font esterni.
- Le chiavi di localStorage, lo schema dello stato, il formato del Backup locale, il formato CSV e tutte le regole del dominio rimarranno invariati.

## Testing Decisions

- I test verificheranno il comportamento osservabile dell'interfaccia e non nomi di classi, token CSS, valori esatti di padding o dettagli interni del rendering.
- Verrà usato un unico seam principale: una suite browser end-to-end che attraversa la dashboard completa a partire da un Catalogo calciatori rappresentativo.
- La suite esistente basata su Playwright costituisce il riferimento per importazione del Catalogo calciatori, configurazione, avvio dell'Asta attiva, selettori accessibili, apertura della Scheda d'asta, Shortlist e registrazione dell'Acquisto.
- I test del command center esistenti costituiscono il riferimento per verificare ordine e ampiezza relativa di Scheda d'asta, Ranking e Scarsità per slot, sticky positioning su desktop e ordine verticale su mobile.
- A 1280 x 720 e zoom 100%, un test aprirà una Scheda d'asta rappresentativa e verificherà che identità, PFC, stato del Prezzo adattato all'asta e comando `Assegna giocatore` siano interamente dentro la finestra iniziale.
- Dopo l'apertura del modulo, il test verificherà che `Assegna giocatore` non rimanga come azione concorrente, che Squadra e prezzo finale conservino etichette accessibili e che `Registra Acquisto` sia raggiungibile nel flusso della scheda.
- Il test verificherà che una registrazione valida aggiorni la UI esistente e che un errore conservi modulo, valori inseriti e messaggio contestuale. Le regole di validazione continueranno a essere coperte dai test di dominio esistenti.
- Prima della Soglia di adattamento, il test verificherà il conteggio osservabile `N di S acquisti nel ruolo`. Dopo il raggiungimento della soglia, verificherà la comparsa del Prezzo adattato all'asta senza cambiare le aspettative di calcolo esistenti.
- La suite verificherà la leggibilità programmatica dei testi critici nei temi chiaro e scuro calcolando il contrasto dei colori effettivi per Fascia editoriale SOS Fanta, link, testo dei pulsanti, placeholder e testo secondario.
- I valori minimi saranno 4.5:1 per testo normale e 3:1 per testo grande, focus indicator e confini essenziali dei controlli. Le verifiche non useranno confronti pixel-perfect.
- Un test da tastiera attraverserà navigazione, ricerca, Ruoli Classic, Ranking, Profilo editoriale SOS Fanta e modulo di Acquisto, verificando ordine del focus, visibilità del focus e attivazione tramite tastiera.
- Un test del Ranking verificherà che la riga selezionata esponga `aria-current`, che nome e metrica restino disponibili e che il filtro degli acquistati compaia soltanto dopo la selezione di una Categoria della shortlist.
- Un test della Scarsità per slot verificherà la presenza di tutti gli Slot originari, inclusi quelli esauriti, e la relativa descrizione accessibile.
- Un test del Catalogo calciatori verificherà ricerca, combinazione dei filtri, azzeramento, ordinamento e indicazione accessibile della direzione, riutilizzando le fixture e le aspettative della suite corrente.
- Un test della vista Squadre verificherà il riepilogo di tutte le Squadre, l'identificazione testuale della Squadra principale, l'espansione e chiusura di una rosa e lo stato vuoto delle Squadre senza Acquisti.
- Un test de La mia rosa verificherà la presenza dei quattro Ruoli Classic, la gerarchia accessibile di spesa e posti occupati e lo stato vuoto per i ruoli senza Acquisti.
- Le viste principali saranno verificate a 1440 x 900, 1280 x 720, 768 x 1024 e 390 x 844. A ogni dimensione non dovrà esserci overflow orizzontale del documento; eventuali aree dati con scorrimento proprio dovranno restare accessibili.
- Il test mobile verificherà l'ordine Scheda d'asta, Ranking e Scarsità per slot, la raggiungibilità della navigazione completa e target di almeno 44 x 44 px per le azioni principali.
- La modalità `prefers-reduced-motion` sarà emulata dal browser per verificare che nessuna transizione sia necessaria a comprendere selezione, apertura, conferma o errore.
- La build PWA esistente sarà verificata per assicurare che i file del carattere siano presenti nell'artefatto e raggiungibili offline insieme al resto dell'app shell.
- Typecheck, build e suite completa esistenti dovranno continuare a passare. I test unitari del dominio e della persistenza non richiederanno nuove aspettative perché il redesign non modifica quei contratti.
- Una revisione visiva manuale completerà i test automatici nei due temi e nelle quattro dimensioni concordate. La revisione controllerà gerarchia, densità, troncamenti, sovrapposizioni, stabilità del carattere e coerenza del linguaggio `tabellino d'asta`.

## Out of Scope

- Modifiche al Catalogo calciatori, al formato CSV o alle regole di importazione.
- Modifiche alla Configurazione d'asta, ai calcoli di PMA, PFC, Percezione storica di mercato, Scostamento d'asta per ruolo, Prezzo adattato all'asta o Massimo spendibile.
- Modifiche alle regole di registrazione, Correzione dell'acquisto o annullamento di un Acquisto.
- Nuove raccomandazioni automatiche, punteggi compositi, previsioni sugli avversari o segnali presentati come strategia certa.
- Modifiche allo schema dello stato, alle chiavi di localStorage, alla gestione della copia precedente o al formato del Backup locale.
- Modifiche alla struttura delle viste, alle destinazioni o alle etichette della navigazione primaria.
- Modifiche al logo, al wordmark, all'icona della PWA o allo sprite di icone esistente.
- Nuove immagini decorative, fotografie, stemmi delle squadre reali o loghi dei provider.
- Introduzione di Carbon, React, Tailwind, librerie di animazione o altri design system come dipendenze.
- Animazioni allo scorrimento, parallasse, glassmorphism, gradienti decorativi, bagliori neon o cursori personalizzati.
- Una modalità mobile con funzionalità differenti dal prodotto desktop. Il lavoro copre l'adattamento responsive degli stessi flussi.
- Temi aggiuntivi, personalizzazione libera dei colori o modifica automatica del tema in base all'ora.
- Modifiche al contenuto dei Profili editoriali SOS Fanta.
- Modifiche alla distribuzione GitHub Pages, all'installazione PWA o alla strategia generale del service worker, salvo l'inclusione dei caratteri locali nell'app shell.
- Analytics, telemetria, backend, account, sincronizzazione cloud o collaborazione in tempo reale.

## Further Notes

- L'aggiornamento deve essere valutato prima di tutto durante un'Asta live. Una schermata esteticamente riuscita ma più lenta da consultare non soddisfa la specifica.
- La misura di successo principale è operativa: in una finestra da 1280 x 720 il Fantallenatore principale vede il Calciatore chiamato, PFC, stato del Prezzo adattato all'asta, Massimo spendibile e azione di assegnazione senza scorrere.
- Il verde esistente è un elemento riconoscibile e verrà conservato. La riduzione dell'effetto generico deriva dal suo uso più selettivo, dalla tipografia, dalla densità e dagli allineamenti, non da un cambio arbitrario di palette.
- Il `tabellino d'asta` è un principio di composizione, non un tema decorativo. Non richiede texture di campo, palloni, stemmi o altri simboli calcistici aggiuntivi.
- I dati del provider, i fatti osservati nell'Asta attiva e i vincoli della Squadra principale devono continuare a essere distinguibili attraverso posizione, etichette e gerarchia, oltre che tramite il colore.
- La modifica già presente nel worktree relativa al command center dell'Asta non appartiene a questa specifica e non deve essere sovrascritta durante l'implementazione.
