# Specifica MVP — Assistente d'asta Fantacalcio

Status: `ready-for-agent`

## Problem Statement

Durante un'Asta live di Fantacalcio Classic, il Fantallenatore principale deve prendere decisioni rapide mentre segue chiamate, rilanci e acquisti di più Squadre. Il CSV del provider offre dati utili, ma non racconta da solo come il mercato della singola Asta attiva si stia discostando dalle valutazioni iniziali. Tenere separatamente catalogo, prezzi, disponibilità, budget, posti, Shortlist e rose aumenta il lavoro manuale proprio quando il tempo è scarso e rende facili errori di registrazione o calcolo.

Il Fantallenatore principale ha bisogno di un supporto personale che distingua chiaramente:

- i riferimenti storici del provider;
- i fatti osservati nell'Asta attiva;
- i vincoli della propria Squadra principale.

Deve inoltre poter correggere gli errori senza lasciare dati derivati incoerenti e ritrovare lo stato confermato dopo un refresh o una riapertura, senza dipendere da account o servizi cloud.

## Solution

Realizzare una web app desktop personale per una singola Asta attiva di Fantacalcio Classic. L'app importa atomicamente il Catalogo calciatori da CSV, permette di configurare Squadre, budget e Posti di ruolo, conserva una Shortlist a categorie personali e registra ogni Acquisto con Squadra e prezzo finale.

Durante l'asta, un command center a tre colonne mostra il Ranking dei calciatori disponibili e la Scarsità per slot, la Scheda d'asta del Calciatore chiamato e la rosa della Squadra principale. PMA e PFC restano riferimenti del provider; il Prezzo adattato all'asta usa lo Scostamento d'asta per ruolo osservato; budget residuo e Massimo spendibile rimangono vincoli personali distinti.

Tutte le operazioni valide vengono salvate localmente come un unico stato versionato e ripristinabile. Correzioni, annullamenti, importazioni e ripristini sono atomici. Un backup manuale permette di esportare e reimportare l'intero stato.

## User Stories

1. Come Fantallenatore principale, voglio importare il CSV completo del provider, così da iniziare dal Catalogo calciatori che già utilizzo.
2. Come Fantallenatore principale, voglio che l'app legga soltanto i campi necessari, così da non dover convertire manualmente il file del provider.
3. Come Fantallenatore principale, voglio che le colonne aggiuntive del CSV vengano ignorate, così da poter importare il foglio originale senza ripulirlo.
4. Come Fantallenatore principale, voglio che l'intero CSV venga validato prima dell'importazione, così da non ottenere un Catalogo calciatori parziale.
5. Come Fantallenatore principale, voglio vedere riga, campo e motivo di ogni errore d'importazione, così da poter correggere il CSV all'esterno dell'app.
6. Come Fantallenatore principale, voglio che un'importazione invalida conservi il Catalogo calciatori precedente, così da non perdere uno stato funzionante.
7. Come Fantallenatore principale, voglio poter sostituire il Catalogo calciatori prima dell'inizio dell'asta, così da caricare un aggiornamento del provider.
8. Come Fantallenatore principale, voglio vedere quante associazioni della Shortlist andrebbero perse prima di sostituire il Catalogo calciatori, così da confermare la sostituzione consapevolmente.
9. Come Fantallenatore principale, voglio conservare le associazioni della Shortlist per i calciatori ancora riconoscibili dopo la sostituzione, così da non ricostruire inutilmente la mia preparazione.
10. Come Fantallenatore principale, voglio configurare il numero di Squadre, così da adattare l'app alla mia lega.
11. Come Fantallenatore principale, voglio configurare il budget iniziale comune, così da usare le regole economiche della mia lega.
12. Come Fantallenatore principale, voglio configurare i Posti di ruolo POR, DIF, CEN e ATT, così da rappresentare la composizione richiesta delle rose Classic.
13. Come Fantallenatore principale, voglio assegnare un nome obbligatorio alla Squadra principale, così da riconoscerla chiaramente durante l'asta.
14. Come Fantallenatore principale, voglio ottenere nomi numerati per le Squadre avversarie e poterli rinominare, così da iniziare rapidamente e aggiungere dettaglio solo quando serve.
15. Come Fantallenatore principale, voglio che le regole strutturali siano bloccate dopo l'avvio, così da evitare che un cambio di configurazione renda incoerenti gli Acquisti.
16. Come Fantallenatore principale, voglio creare categorie personali della Shortlist, così da organizzare i calciatori secondo la mia strategia.
17. Come Fantallenatore principale, voglio assegnare lo stesso calciatore a più categorie della Shortlist, così da rappresentare interessi sovrapposti.
18. Come Fantallenatore principale, voglio che i nomi delle categorie siano univoci ignorando maiuscole e spazi esterni, così da evitare duplicati ambigui.
19. Come Fantallenatore principale, voglio creare, rinominare ed eliminare categorie prima o durante l'asta, così da adattare l'organizzazione mentre emergono nuove informazioni.
20. Come Fantallenatore principale, voglio una conferma prima di eliminare una categoria popolata, così da non rimuovere associazioni per errore.
21. Come Fantallenatore principale, voglio gestire le categorie dal Catalogo calciatori e dalla Scheda d'asta, così da non interrompere il flusso corrente.
22. Come Fantallenatore principale, voglio che un calciatore acquistato conservi le proprie categorie, così da mantenere il contesto della preparazione.
23. Come Fantallenatore principale, voglio nascondere per impostazione predefinita i calciatori acquistati dalla vista dei disponibili nella Shortlist, così da concentrarmi sulle opzioni ancora acquistabili.
24. Come Fantallenatore principale, voglio poter mostrare anche gli acquistati nella Shortlist, così da consultare l'organizzazione originale.
25. Come Fantallenatore principale, voglio cercare testualmente il Calciatore chiamato, così da aprire rapidamente la sua Scheda d'asta.
26. Come Fantallenatore principale, voglio chiudere la Scheda d'asta senza cambiare alcuno stato, così da poter esplorare il Catalogo calciatori senza effetti collaterali.
27. Come Fantallenatore principale, voglio vedere identità, Ruolo, squadra reale e Slot del Calciatore chiamato, così da riconoscerne immediatamente il profilo.
28. Come Fantallenatore principale, voglio vedere PMA e PFC originali, così da conservare i riferimenti del provider.
29. Come Fantallenatore principale, voglio vedere se il calciatore è In hype, Sottovalutato o In linea, così da comprendere la Percezione storica di mercato senza confonderla con l'Asta attiva.
30. Come Fantallenatore principale, voglio vedere fantamedia e Titolarità prevista, così da avere a disposizione i principali indicatori del provider.
31. Come Fantallenatore principale, voglio vedere `Dati insufficienti` prima che un Ruolo raggiunga la Soglia di adattamento, così da non attribuire significato a un campione troppo piccolo.
32. Come Fantallenatore principale, voglio vedere il Prezzo adattato all'asta dopo il raggiungimento della soglia, così da confrontare il PFC con il mercato corrente del medesimo Ruolo.
33. Come Fantallenatore principale, voglio vedere lo Scostamento d'asta per ruolo e il numero di osservazioni, così da capire l'origine del Prezzo adattato all'asta.
34. Come Fantallenatore principale, voglio che un valore anomalo non domini automaticamente l'adattamento, così da ottenere un segnale robusto con campioni piccoli.
35. Come Fantallenatore principale, voglio che ogni Correzione dell'acquisto o annullamento ricalcoli lo Scostamento d'asta per ruolo, così da basare il segnale soltanto sugli Acquisti attivi.
36. Come Fantallenatore principale, voglio che il Prezzo adattato all'asta torni a `Dati insufficienti` quando il campione scende sotto soglia, così da non visualizzare un segnale non più supportato.
37. Come Fantallenatore principale, voglio vedere tutti i prezzi e le percentuali come interi, così da leggere i riferimenti rapidamente durante l'asta.
38. Come Fantallenatore principale, voglio vedere separatamente il Massimo spendibile, così da non confondere un vincolo della Squadra principale con un prezzo di mercato.
39. Come Fantallenatore principale, voglio sapere quando un Ruolo è già completo nella Squadra principale, così da riconoscere il Calciatore chiamato come Non acquistabile pur continuando a vederne i riferimenti.
40. Come Fantallenatore principale, voglio selezionare un Ruolo Classic e vedere il relativo Ranking dei calciatori disponibili, così da confrontare soltanto calciatori omogenei.
41. Come Fantallenatore principale, voglio che il ranking predefinito usi PFC decrescente e nome alfabetico, così da avere un ordinamento trasparente e deterministico.
42. Come Fantallenatore principale, voglio usare Slot, PMA, fantamedia e Titolarità prevista come filtri o ordinamenti alternativi, così da esplorare il Catalogo calciatori senza un punteggio composito opaco.
43. Come Fantallenatore principale, voglio filtrare o evidenziare il ranking tramite le categorie della Shortlist, così da ritrovare i miei interessi senza alterare l'ordine analitico.
44. Come Fantallenatore principale, voglio vedere il conteggio dei disponibili per ogni Slot del Ruolo, così da osservare la Scarsità per slot.
45. Come Fantallenatore principale, voglio vedere anche gli Slot esauriti con conteggio zero, così da non perdere informazione sull'inventario iniziale.
46. Come Fantallenatore principale, voglio vedere fino a tre Alternative immediate dello stesso Ruolo e Slot del Calciatore chiamato, così da confrontare opzioni realmente affini.
47. Come Fantallenatore principale, voglio che le Alternative immediate siano ordinate per PFC e nome, così da ottenere risultati deterministici senza raccomandazioni nascoste.
48. Come Fantallenatore principale, voglio registrare un Acquisto indicando obbligatoriamente Squadra e prezzo finale, così da aggiornare lo stato dell'asta con i soli fatti conclusivi.
49. Come Fantallenatore principale, voglio che la Squadra principale sia evidenziata ma non preselezionata nel modulo di assegnazione, così da ridurre errori senza introdurre un valore implicito pericoloso.
50. Come Fantallenatore principale, voglio che un Acquisto valido aggiorni insieme disponibilità, rosa, budget e indicatori derivati, così da mantenere uno stato coerente.
51. Come Fantallenatore principale, voglio che l'app blocchi l'assegnazione di un calciatore già acquistato, così da non creare duplicati.
52. Come Fantallenatore principale, voglio che l'app blocchi un Acquisto oltre il budget della Squadra, così da rispettare la configurazione d'asta.
53. Come Fantallenatore principale, voglio che l'app blocchi un Acquisto in un Ruolo completo, così da rispettare i Posti di ruolo.
54. Come Fantallenatore principale, voglio che un errore di assegnazione mantenga aperto il modulo e conservi i dati inseriti, così da poter correggere rapidamente il valore sbagliato.
55. Come Fantallenatore principale, voglio correggere Squadra o prezzo finale di qualsiasi Acquisto, così da rettificare gli errori di registrazione.
56. Come Fantallenatore principale, voglio che il modulo di correzione sia precompilato, così da modificare soltanto ciò che è sbagliato.
57. Come Fantallenatore principale, voglio che una correzione invalida lasci intatto l'Acquisto originale, così da non perdere un dato valido.
58. Come Fantallenatore principale, voglio annullare un Acquisto dopo una conferma esplicita, così da restituire il calciatore ai disponibili senza cancellazioni accidentali.
59. Come Fantallenatore principale, voglio che la pagina Asta mantenga visibile la rosa della Squadra principale, così da controllare costantemente Acquisti, budget e posti.
60. Come Fantallenatore principale, voglio vedere budget residuo e Massimo spendibile in una zona fissa, così da consultarli senza confonderli con la Scheda d'asta.
61. Come Fantallenatore principale, voglio navigare tra `Asta`, `La mia rosa` e `Squadre`, così da separare operatività live e consultazione dettagliata.
62. Come Fantallenatore principale, voglio vedere la mia rosa in colonne per Ruolo con spesa, percentuale del budget e Posti di ruolo, così da valutarne la composizione.
63. Come Fantallenatore principale, voglio confrontare nella mia rosa la distribuzione degli Slot acquistati e la Scarsità per slot residua, così da distinguere composizione personale e inventario del Catalogo calciatori.
64. Come Fantallenatore principale, voglio consultare la rosa di ogni Squadra avversaria, così da vedere budget, spesa, posti e Acquisti registrati.
65. Come Fantallenatore principale, voglio che la pagina Squadre mostri soltanto fatti osservati, così da non ricevere previsioni o punteggi strategici presentati come certezze.
66. Come Fantallenatore principale, voglio che ogni operazione valida venga salvata automaticamente, così da non dover ricordare un comando di salvataggio.
67. Come Fantallenatore principale, voglio che un'operazione risulti completata soltanto dopo il salvataggio, così da sapere quale stato è realmente persistente.
68. Come Fantallenatore principale, voglio che un salvataggio fallito conservi lo stato precedente e mostri un errore, così da evitare una conferma ingannevole.
69. Come Fantallenatore principale, voglio riprendere automaticamente l'ultima operazione confermata dopo un refresh o una riapertura, così da continuare l'Asta attiva.
70. Come Fantallenatore principale, voglio che lo stato salvato sia versionato e validato, così da riconoscere dati illeggibili o incompatibili.
71. Come Fantallenatore principale, voglio recuperare la copia valida precedente quando lo stato più recente è danneggiato, così da limitare la perdita all'ultima operazione.
72. Come Fantallenatore principale, voglio ricevere un avviso dopo il recupero della copia precedente, così da sapere che l'ultima operazione potrebbe essere stata persa.
73. Come Fantallenatore principale, voglio che l'app non esegua un reset silenzioso se nessuna copia è valida, così da non perdere dati senza consenso.
74. Come Fantallenatore principale, voglio esportare il dato problematico o confermare un reset esplicito quando il recupero non è possibile, così da conservare una possibilità di diagnosi.
75. Come Fantallenatore principale, voglio esportare un unico Backup locale dell'intero stato, così da poterlo conservare o trasferire manualmente.
76. Come Fantallenatore principale, voglio reimportare un Backup locale soltanto dopo validazione e conferma, così da non sostituire lo stato corrente con dati invalidi per errore.
77. Come Fantallenatore principale, voglio che l'Asta sia considerata completa quando tutte le Squadre occupano i posti configurati, così da non dover gestire uno stato di chiusura separato.
78. Come Fantallenatore principale, voglio continuare a consultare le rose dopo il completamento naturale dell'asta, così da vedere il risultato finale.
79. Come Fantallenatore principale, voglio resettare l'Asta attiva dopo una conferma esplicita, così da eliminare Acquisti e progressi senza azioni accidentali.
80. Come Fantallenatore principale, voglio che il Reset dell'asta conservi Catalogo calciatori, Configurazione d'asta, Squadre e Shortlist, così da riutilizzare lo stesso setup.

## Implementation Decisions

### Forma dell'applicazione

- L'MVP è una web app desktop, personale e locale. Non richiede account, server applicativo o sincronizzazione cloud.
- Esistono un solo Catalogo calciatori persistente e una sola Asta attiva alla volta. L'Asta completa è una condizione derivata, non uno stato di chiusura separato.
- Il modulo applicativo espone una sola interfaccia di alto livello alle viste e ai test: riceve le azioni del Fantallenatore principale e restituisce lo stato osservabile dell'applicazione e l'esito dell'operazione. Importazione, Configurazione d'asta, Shortlist, Acquisti, correzioni, annullamenti, reset e backup restano dietro questa interfaccia.
- La persistenza locale è l'unico seam sostituibile. Un adapter browser conserva lo stato reale; un adapter deterministico, capace anche di simulare errori, rende verificabili salvataggi falliti e recupero. Non vengono introdotti repository, gateway, factory o seam distinti per prezzi, ranking, scarsità o Shortlist senza una seconda implementazione reale.
- Le operazioni che modificano lo stato sono transazioni applicative: producono e validano il nuovo stato, lo salvano e soltanto dopo espongono il successo. Un errore conserva lo stato confermato precedente.

### Catalogo calciatori e importazione

- L'importazione legge `name`, `team`, `role`, `slot`, `pma`, `pfc`, `expectedFantamedia` ed `expectedTitolarita`; ogni colonna deve comparire esattamente una volta. Le colonne aggiuntive vengono ignorate.
- `name` è obbligatorio e univoco dopo la normalizzazione di maiuscole, minuscole e spazi esterni. `team` è obbligatorio.
- `role` ammette `P`, `D`, `C` e `A`, presentati come POR, DIF, CEN e ATT. `slot` è un intero positivo e conserva la scala ordinale del provider, il cui massimo può variare per Ruolo.
- `pma` è numerico e non negativo; `pfc` è numerico e strettamente positivo; `expectedFantamedia` è numerica; `expectedTitolarita` è numerica e compresa tra 0 e 100 inclusi.
- I numeri accettano il separatore decimale italiano con virgola e ignorano gli spazi esterni. L'eventuale accettazione aggiuntiva del punto non cambia il significato dei dati.
- L'importazione valida l'intero file e sostituisce il Catalogo calciatori atomicamente. Ogni errore riporta almeno riga, campo e motivo. La correzione del CSV avviene fuori dall'app.
- Un Catalogo calciatori può essere sostituito soltanto prima dell'avvio dell'asta. Se esiste un'Asta iniziata, occorre prima il Reset dell'asta. La sostituzione richiede conferma esplicita.
- Configurazione d'asta, nomi delle Squadre e categorie della Shortlist sopravvivono alla sostituzione. Le associazioni della Shortlist vengono conservate per i `name` normalizzati presenti nel nuovo Catalogo calciatori; prima della conferma viene mostrato il numero di associazioni che andrebbero perse.

### Configurazione, Squadre e ciclo dell'asta

- La Configurazione d'asta comprende numero di Squadre, budget iniziale comune, Posti di ruolo POR/DIF/CEN/ATT, Soglia di adattamento e tolleranza della Percezione storica di mercato. I valori rappresentativi sono otto Squadre, 1.000 crediti, posti `3/8/8/6`, soglia `3` e tolleranza `5%`.
- Il nome della Squadra principale è obbligatorio. Le Squadre avversarie ricevono nomi numerati generati automaticamente, modificabili facoltativamente.
- Avviare l'asta blocca numero di Squadre, budget e Posti di ruolo. I nomi delle Squadre restano modificabili. Per cambiare le regole strutturali occorre il Reset dell'asta.
- La ricerca testuale seleziona il Calciatore chiamato e apre una Scheda d'asta temporanea. Chiuderla non modifica lo stato e non viene conservata una cronologia delle chiamate.
- Un Acquisto assegna un calciatore a una Squadra e registra il prezzo finale; non vengono registrati i singoli rilanci.
- L'azione `Assegna giocatore` richiede Squadra e prezzo finale. La Squadra principale può essere evidenziata, ma non è preselezionata.
- Sono invalidi almeno: l'Acquisto di un calciatore già assegnato, l'Acquisto oltre il budget della Squadra e l'Acquisto in un Ruolo che ha esaurito i Posti di ruolo della Squadra. L'errore è contestuale e conserva il modulo con i dati inseriti.
- Una Correzione dell'acquisto può cambiare soltanto Squadra o prezzo finale. Il modulo è precompilato e la validazione considera lo stato risultante senza contare due volte l'Acquisto originale.
- L'annullamento richiede conferma e restituisce il calciatore ai disponibili. Correzioni e annullamenti aggiornano atomicamente rosa, budget, disponibilità e ogni indicatore derivato.
- Non esiste un'azione `Termina asta`. L'Asta è completa quando tutte le Squadre occupano i Posti di ruolo configurati e le rose restano consultabili.
- Il Reset dell'asta richiede conferma, elimina Acquisti, assegnazioni, prezzi finali e indicatori live e conserva Catalogo calciatori, Configurazione d'asta, Squadre e Shortlist.

### Shortlist

- Le categorie della Shortlist sono personali, create e nominate liberamente. Non esistono categorie predefinite né un concetto separato di Preferito.
- Il nome della categoria è obbligatorio e univoco ignorando maiuscole, minuscole e spazi esterni. Un calciatore può appartenere a più categorie.
- Un calciatore appartiene alla Shortlist finché è associato ad almeno una categoria. Rimuoverlo dall'ultima categoria lo rimuove dalla Shortlist.
- Le categorie possono essere create, rinominate ed eliminate prima o durante l'asta. Eliminare una categoria popolata richiede conferma e non modifica Catalogo calciatori o Acquisti.
- Le associazioni sono gestibili dalla lista del Catalogo calciatori e dalla Scheda d'asta. Non è richiesta una schermata separata per operazioni massive.
- Un calciatore acquistato conserva le associazioni, viene nascosto dalla vista predefinita dei disponibili e può essere mostrato tramite filtro. Dopo l'annullamento torna automaticamente tra i disponibili.
- La Shortlist organizza, filtra ed evidenzia. Non modifica prezzi, ranking o Alternative immediate.

### Prezzi e vincoli personali

- PMA e PFC originali sono sempre visibili e non vengono modificati.
- La Percezione storica di mercato confronta PMA e PFC con una tolleranza configurabile, predefinita al 5%. Oltre la tolleranza: PMA maggiore significa `In hype`, PMA minore significa `Sottovalutato`; entro la tolleranza significa `In linea`.
- Per ogni Acquisto attivo di un Ruolo si calcola `prezzo finale / PFC`. Il moltiplicatore del Ruolo è la mediana dei rapporti e lo Scostamento d'asta per ruolo è `mediana − 1`.
- Il Prezzo adattato all'asta è `PFC × mediana`, arrotondato al credito intero più vicino. Tutti gli Acquisti attivi partecipano, inclusi quelli della Squadra principale; non si applicano esclusioni, tagli o massimali arbitrari.
- Prima della Soglia di adattamento la Scheda d'asta mostra `Dati insufficienti`. Dalla soglia mostra Prezzo adattato all'asta, Scostamento d'asta per ruolo e numero di osservazioni. Se il campione scende sotto soglia, torna immediatamente a `Dati insufficienti`.
- Il calcolo viene ricostruito dagli Acquisti attivi dopo ogni Acquisto, Correzione dell'acquisto o annullamento. Il Reset dell'asta azzera il campione.
- Tutti i prezzi e tutte le percentuali sono presentati come interi.
- Il Massimo spendibile è il budget residuo della Squadra principale meno un credito per ciascun altro Posto di ruolo ancora da riempire. È un vincolo personale separato dai segnali di mercato.
- Quando il Ruolo del Calciatore chiamato è completo nella Squadra principale, la Scheda d'asta mostra `Non acquistabile` ma continua a presentare i riferimenti di mercato.

### Ranking, Scarsità per slot e Alternative immediate

- Il Ranking dei calciatori disponibili è distinto per Ruolo Classic. L'ordine predefinito è PFC decrescente, poi nome alfabetico.
- Slot, PMA, fantamedia prevista e Titolarità prevista possono essere filtri o ordinamenti alternativi. Non vengono combinati in un Auction Score o in un'altra formula composita.
- Le categorie della Shortlist possono filtrare o evidenziare i calciatori, senza modificarne l'ordine.
- La Scarsità per slot è il conteggio dei calciatori ancora disponibili per ogni Slot del Ruolo selezionato. Mostra tutti gli Slot presenti nel Catalogo calciatori, compresi quelli a zero, senza percentuali, livelli d'urgenza o colori d'allarme.
- Le Alternative immediate sono al massimo i primi tre altri calciatori disponibili nello stesso Ruolo e Slot del Calciatore chiamato, ordinati per PFC decrescente e nome alfabetico. Non vengono completate usando Slot diversi.
- Ogni Alternativa immediata mostra almeno nome, squadra reale e PFC; mostra anche il Prezzo adattato all'asta quando disponibile. La Shortlist può essere evidenziata senza cambiare l'ordine.

### Interfaccia desktop

- La navigazione primaria è `Asta · La mia rosa · Squadre`. La ricerca del Calciatore chiamato e il riepilogo compatto della Squadra principale restano nella testata.
- La pagina `Asta` è un command center a tre colonne: Ranking e Scarsità per slot a sinistra, Scheda d'asta al centro, rosa della Squadra principale a destra.
- La Scheda d'asta mostra al primo livello identità, Ruolo, squadra reale, Slot, Percezione storica di mercato, PMA, PFC e Prezzo adattato all'asta. Fantamedia, Titolarità prevista, Alternative immediate e categorie della Shortlist restano secondarie ma visibili.
- Budget residuo e Massimo spendibile sono affiancati in una zona fissa della colonna della Squadra principale. La rosa completa è raggruppata per Ruolo e scorre autonomamente.
- `La mia rosa` usa colonne per Ruolo, non un campo da gioco. Per ogni Ruolo mostra crediti spesi, percentuale del budget iniziale comune, Posti di ruolo occupati e totali, calciatori acquistati e posti liberi.
- `La mia rosa` separa la distribuzione degli Slot acquisiti dalla Squadra principale dalla Scarsità per slot ancora osservabile nel Catalogo calciatori.
- `Squadre` elenca le Squadre avversarie e permette di aprirne la rosa. Mostra soltanto budget residuo, crediti spesi, Posti di ruolo e Acquisti registrati.
- I vincoli di accettazione dell'interfaccia riguardano struttura, responsabilità e informazioni osservabili. Pixel, colori e dettagli estetici non sono contratti della specifica.

### Persistenza, recupero e backup

- Catalogo calciatori, Configurazione d'asta, Squadre, Shortlist e Acquisti formano un unico stato locale salvato automaticamente dopo ogni operazione valida.
- Un'operazione è mostrata come completata soltanto dopo il salvataggio. Un errore di persistenza conserva lo stato confermato precedente e viene comunicato al Fantallenatore principale.
- All'apertura o al refresh viene ripristinata automaticamente l'ultima operazione confermata.
- Lo stato è versionato e validato prima dell'uso. L'app conserva lo stato corrente e l'ultima copia valida precedente.
- Se lo stato corrente è illeggibile o incompatibile, viene ripristinata la copia valida precedente e viene comunicato che l'ultima operazione potrebbe essere stata persa.
- Se nessuna copia è valida, l'accesso alla sessione viene bloccato senza reset silenzioso. Il Fantallenatore principale può esportare il dato problematico o confermare un reset esplicito.
- Il Backup locale è un unico file contenente l'intero stato. L'importazione del backup valida tutto il file e richiede conferma prima della sostituzione; un file invalido non modifica lo stato corrente.
- La persistenza è promessa soltanto sullo stesso dispositivo, browser e profilo in navigazione normale. Il Backup locale è il mezzo previsto per trasferire o recuperare manualmente i dati.

## Testing Decisions

- I test verificano esclusivamente comportamento osservabile: azioni del Fantallenatore principale, contenuto delle viste, esiti, stato ripristinato e file di backup. Non verificano funzioni interne, forma dei moduli, dettagli del framework o struttura della persistenza.
- Il seam principale è l'interfaccia dell'applicazione completa. I test la pilotano come farebbe il Fantallenatore principale e osservano il risultato attraverso le viste e gli output pubblici.
- La persistenza locale è l'unico seam interno sostituibile. L'adapter deterministico permette di preparare stati validi, incompatibili o corrotti e di simulare un errore di scrittura senza introdurre seam separati per le regole di dominio.
- Prezzi, ranking, Scarsità per slot, Alternative immediate, Shortlist e regole degli Acquisti vengono verificati attraverso l'interfaccia dell'applicazione. Test più bassi sono giustificati soltanto se una regressione non può essere resa chiara al seam principale.
- I test dell'interfaccia verificano presenza, raggruppamento, navigazione e separazione semantica delle informazioni. Non usano confronti pixel-perfect né asserzioni su colori decorativi.
- Il repository non contiene ancora codice di produzione o una suite di test, quindi non esiste prior art implementativa da imitare. Le fixture Wayfinder e i prototipi di prezzo e dashboard costituiscono il prior art funzionale per input, risultati deterministici e struttura osservabile.

### Scenari di accettazione

1. Importando il Catalogo rappresentativo, tutti i 32 calciatori diventano disponibili, gli otto campi previsti vengono letti e le colonne aggiuntive vengono ignorate.
2. Importando un CSV con colonne mancanti, nomi duplicati normalizzati o valori non ammessi, l'intero file viene rifiutato, gli errori indicano riga, campo e motivo e il Catalogo calciatori precedente resta invariato.
3. Avviando l'asta con `8 squadre · 1.000 crediti · 3/8/8/6 posti`, le regole strutturali vengono bloccate, i nomi restano modificabili e un refresh ripristina automaticamente l'Asta attiva.
4. La pagina `Asta` presenta Ranking e Scarsità per slot, Scheda d'asta e rosa della Squadra principale nelle tre aree stabilite; segnali di mercato e vincoli personali restano separati.
5. Assegnando `GIOCATORE_D_01` a `Squadra 2` per 157 crediti, il calciatore scompare dai disponibili, compare nella rosa, il budget diventa 843, la Scarsità per slot diminuisce e la Scheda d'asta si chiude soltanto dopo il salvataggio.
6. Tentando di assegnare un calciatore già acquistato, superare il budget o superare i Posti di ruolo, l'Acquisto viene bloccato, lo stato non cambia e il modulo conserva i dati con un errore contestuale.
7. Esempi sopra, sotto ed entro la tolleranza del 5% vengono classificati come `In hype`, `Sottovalutato` e `In linea`; PMA e PFC originali sono presentati come interi.
8. Dopo i primi due Acquisti DIF compare `Dati insufficienti`. Con `GIOCATORE_D_03` acquistato a 76 crediti, la mediana produce uno Scostamento d'asta per ruolo del `+16%` e il Prezzo adattato all'asta di `GIOCATORE_D_04` è 24 crediti nonostante il valore anomalo.
9. Il Ranking usa PFC decrescente e nome; la Scarsità per slot include gli Slot a zero. Se esistono almeno quattro altri disponibili nello stesso Ruolo e Slot del Calciatore chiamato, vengono mostrate soltanto le prime tre Alternative immediate.
10. Un calciatore può appartenere a due categorie della Shortlist; dopo l'Acquisto conserva le categorie ma viene nascosto dai disponibili e dopo l'annullamento ricompare. Un nome di categoria equivalente dopo normalizzazione viene rifiutato.
11. Una Correzione dell'acquisto valida aggiorna Squadra, prezzo e dati derivati insieme; una correzione invalida lascia intatto l'Acquisto originale. Annullando `GIOCATORE_C_03`, il campione CEN scende da tre a due e torna a `Dati insufficienti`.
12. Un refresh ripristina l'ultima operazione confermata. Uno stato corrente danneggiato fa recuperare la copia valida precedente con avviso; se entrambe le copie sono invalide non avviene alcun reset silenzioso.
13. Esportando e reimportando un Backup locale vengono ripristinati Catalogo calciatori, Configurazione d'asta, Squadre, Shortlist e Asta attiva; un backup invalido non modifica lo stato corrente.
14. `La mia rosa` mostra spesa, Posti di ruolo e distribuzione degli Slot per Ruolo; `Squadre` mostra soltanto dati osservati delle Squadre avversarie, senza punteggi o previsioni strategiche.
15. Quando tutte le Squadre occupano i posti configurati, l'Asta è completa senza comando di chiusura. Il Reset dell'asta confermato elimina Acquisti e indicatori live e conserva Catalogo calciatori, Configurazione d'asta, Squadre e Shortlist.

## Out of Scope

- Modalità Mantra o Ruoli diversi da POR, DIF, CEN e ATT.
- Account, multiutente, collaborazione in tempo reale, sincronizzazione cloud e interfaccia mobile.
- Inserimento del prezzo corrente, cronologia dei rilanci e guida semaforica durante ogni offerta.
- Cronologia delle chiamate, storico di più aste e uno stato manuale di chiusura dell'asta.
- Editor tabellare interno per correggere il CSV.
- Inflazione generale dell'asta, market temperature e ricalibrazione basata su budget, rose o intenzioni delle Squadre avversarie.
- Monitoraggio strategico, competitor analysis e previsione delle intenzioni delle Squadre avversarie.
- Probability/risk engine, opportunity cost, simulazioni what-if ed endgame optimizer.
- Generazione automatica dei piani A/B/C, nomination advisor e Auction Score.
- Garanzia di persistenza in navigazione privata, dopo la cancellazione dei dati del browser o su dispositivi e profili diversi senza Backup locale.
- Vincoli pixel-perfect, colori specifici o rifinitura estetica oltre la struttura e la gerarchia informative validate.

## Further Notes

- Il lessico canonico vive in [Asta Fantacalcio](../../CONTEXT.md) e deve essere usato in interfaccia, codice, test e documentazione.
- La [Mappa — Specifica MVP dell'assistente d'asta Fantacalcio](map.md) conserva i puntatori alle decisioni Wayfinder e ai relativi prototipi.
- Il [Catalogo rappresentativo](assets/04-catalogo-rappresentativo.csv), la [Configurazione d'asta](assets/04-configurazione-asta.csv) e gli [Eventi d'asta sintetici](assets/04-eventi-asta.csv) sono le fixture canoniche iniziali.
- Il [prototipo del modello di prezzo](prototypes/05-price-model/README.md) documenta il confronto statistico che ha portato alla mediana dei rapporti.
- Il [prototipo della dashboard](prototypes/09-dashboard/README.md) documenta le varianti confrontate e la struttura del command center scelta.
- I prototipi sono fonti decisionali usa-e-getta, non codice di produzione da estendere.
- Il repository non contiene ancora metadati Git né codice applicativo. La fase successiva deve suddividere questa specifica in ticket verticali, ciascuno verificabile al seam dell'applicazione.
