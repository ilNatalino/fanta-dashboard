# Rilascio della dashboard come PWA installabile

Status: ready-for-agent

## Problem Statement

La dashboard viene eseguita localmente tramite una compilazione TypeScript e un server Node.js. Questo flusso è adeguato allo sviluppo, ma richiede a ogni fantallenatore principale di installare strumenti tecnici, usare il terminale e conoscere i comandi del progetto.

La dashboard deve poter essere condivisa con amici non tecnici senza introdurre account, login, backend o sincronizzazione cloud. Ogni persona deve poter aprire un collegamento, installare la dashboard sul proprio computer e avviarla successivamente come un'applicazione autonoma. Dopo la prima apertura completa, la dashboard deve continuare a funzionare senza connessione e deve conservare localmente Catalogo calciatori, configurazione d'asta, squadre, shortlist e asta attiva.

Il rilascio deve inoltre essere ripetibile e sicuro: gli aggiornamenti non devono interrompere un'asta attiva, cancellare lo stato salvato o pubblicare accidentalmente sorgenti e strumenti di sviluppo.

## Solution

La dashboard verrà distribuita come Progressive Web App statica tramite GitHub Pages. Il fantallenatore principale aprirà una URL HTTPS senza autenticarsi e potrà installare la dashboard attraverso le funzionalità del browser. L'installazione creerà un'icona nel sistema operativo e aprirà la dashboard in una finestra autonoma.

Una build dedicata produrrà un artefatto statico contenente soltanto HTML, CSS, JavaScript compilato, manifest, icone e dati editoriali necessari. Tutti i riferimenti alle risorse saranno relativi, così l'artefatto funzionerà anche quando pubblicato sotto il percorso del progetto GitHub Pages.

Un service worker conserverà localmente l'app shell completa. La prima apertura richiederà una connessione; dopo che la cache sarà stata popolata, la dashboard potrà essere riaperta offline. Il service worker gestirà esclusivamente le risorse statiche e non accederà allo stato applicativo. Il meccanismo esistente basato su localStorage continuerà a essere l'unica persistenza di Catalogo calciatori, configurazione d'asta, squadre, shortlist e asta attiva.

Una pipeline automatica eseguirà controlli, test, build e pubblicazione a ogni rilascio dal branch principale. Una nuova versione sarà resa attiva solo dopo essere stata scaricata completamente e senza forzare il ricaricamento di una sessione aperta.

## User Stories

1. Come fantallenatore principale, voglio aprire la dashboard tramite un collegamento HTTPS, così da non dover installare strumenti di sviluppo.
2. Come fantallenatore principale, voglio usare la dashboard senza creare un account, così da iniziare rapidamente e senza fornire credenziali.
3. Come fantallenatore principale, voglio installare la dashboard dal browser, così da trovarla tra le applicazioni del mio computer.
4. Come fantallenatore principale, voglio vedere un nome e un'icona riconoscibili durante l'installazione, così da identificare facilmente la dashboard.
5. Come fantallenatore principale, voglio avviare la dashboard in una finestra autonoma, così da usarla come una normale applicazione durante l'Asta live.
6. Come fantallenatore principale, voglio completare una sola prima apertura online, così da poter riaprire successivamente la dashboard senza connessione.
7. Come fantallenatore principale, voglio consultare offline il Catalogo calciatori, così da preparare l'asta anche quando la rete non è disponibile.
8. Come fantallenatore principale, voglio consultare offline i Profili editoriali SOS Fanta disponibili, così da non dipendere dalla rete durante l'Asta live.
9. Come fantallenatore principale, voglio che icone, stili e interazioni siano disponibili offline, così da avere la stessa interfaccia della versione online.
10. Come fantallenatore principale, voglio importare il Catalogo calciatori nella PWA con lo stesso flusso attuale, così da non imparare una procedura differente.
11. Come fantallenatore principale, voglio configurare e avviare un'Asta attiva nella PWA, così da mantenere invariato il flusso operativo esistente.
12. Come fantallenatore principale, voglio registrare e correggere un Acquisto nella PWA, così da poter gestire normalmente l'Asta live.
13. Come fantallenatore principale, voglio ritrovare Catalogo calciatori, configurazione d'asta, squadre, shortlist e Asta attiva dopo aver chiuso la PWA, così da non perdere il lavoro svolto.
14. Come fantallenatore principale, voglio ritrovare lo stato salvato anche dopo un aggiornamento della PWA, così da poter ricevere correzioni senza ricominciare l'asta.
15. Come fantallenatore principale, voglio che un aggiornamento non ricarichi automaticamente una sessione aperta, così da non essere interrotto durante l'Asta live.
16. Come fantallenatore principale, voglio continuare a usare la precedente versione valida se il download di un aggiornamento fallisce, così da non rimanere senza dashboard.
17. Come fantallenatore principale, voglio esportare e ripristinare il Backup locale con il flusso esistente, così da poter proteggere o trasferire manualmente i miei dati.
18. Come fantallenatore principale, voglio che i dati dell'asta restino sul mio dispositivo e nel mio profilo browser, così da non inviarli a un servizio applicativo remoto.
19. Come fantallenatore principale, voglio usare la dashboard nel browser anche se non installo la PWA, così da poterla provare prima dell'installazione.
20. Come fantallenatore principale, voglio ricevere una pagina funzionante quando apro l'indirizzo pubblico del progetto, così da non incontrare errori dovuti al percorso di pubblicazione.
21. Come fantallenatore principale, voglio che ogni risorsa necessaria sia scaricata durante l'installazione offline, così da non scoprire funzionalità mancanti solo quando la rete non è disponibile.
22. Come manutentore, voglio generare l'intero artefatto PWA con un unico comando, così da avere un rilascio ripetibile.
23. Come manutentore, voglio che la build PWA riutilizzi la compilazione TypeScript esistente, così da non introdurre una seconda toolchain frontend.
24. Come manutentore, voglio pubblicare soltanto i file necessari all'esecuzione, così da non esporre test, sorgenti o materiali di lavoro.
25. Come manutentore, voglio che l'artefatto usi riferimenti relativi, così da poterlo servire dalla sottodirectory assegnata da GitHub Pages.
26. Come manutentore, voglio che manifest, icone e punto di avvio siano validi, così che i browser compatibili possano proporre l'installazione.
27. Come manutentore, voglio che ogni versione usi una cache distinguibile dalle precedenti, così da distribuire aggiornamenti senza mescolare risorse incompatibili.
28. Come manutentore, voglio che una nuova cache diventi valida solo dopo il download completo delle risorse essenziali, così da preservare l'ultima versione funzionante in caso di errore.
29. Come manutentore, voglio eliminare le cache obsolete dopo l'attivazione della nuova versione, così da non accumulare risorse non più utilizzate.
30. Come manutentore, voglio che un push destinato al rilascio esegua typecheck e test prima della pubblicazione, così da non distribuire una versione non verificata.
31. Come manutentore, voglio che una build o un test fallito impedisca la pubblicazione, così che l'ultima versione valida rimanga disponibile.
32. Come manutentore, voglio che la pubblicazione su GitHub Pages sia automatica dal branch principale, così da non copiare manualmente i file di ogni rilascio.
33. Come manutentore, voglio poter costruire e provare localmente lo stesso artefatto pubblicato, così da diagnosticare problemi prima del rilascio.
34. Come manutentore, voglio verificare l'artefatto da un percorso non-root, così da intercettare riferimenti assoluti incompatibili con GitHub Pages.
35. Come manutentore, voglio verificare la riapertura offline tramite un browser reale, così da testare il comportamento osservabile e non soltanto la configurazione del service worker.
36. Come manutentore, voglio verificare che lo stato dell'Asta attiva sopravviva a riapertura offline e aggiornamento, così da proteggere il dato più importante per il fantallenatore principale.
37. Come manutentore, voglio documentare browser consigliati, prima apertura online e Backup locale, così da poter condividere istruzioni brevi e corrette con gli amici.
38. Come manutentore, voglio mantenere stabile l'origine pubblica della PWA, così che gli aggiornamenti continuino a vedere lo stesso localStorage.

## Implementation Decisions

- La dashboard sarà una PWA statica distribuita tramite GitHub Pages. Non verranno aggiunti backend, API applicative, account o login.
- GitHub Pages pubblicherà l'artefatto generato dalla repository esistente. I visitatori non dovranno autenticarsi per usare la dashboard.
- Verrà aggiunto un singolo comando di build per la distribuzione. Il comando compilerà TypeScript con la toolchain esistente e assemblerà una directory di produzione pulita usando soltanto funzionalità native di Node.js.
- Non verranno introdotti bundler, framework frontend o dipendenze di produzione per realizzare il pacchetto PWA.
- L'artefatto conterrà esclusivamente il punto di ingresso HTML, gli stili, i moduli JavaScript compilati, il manifest, il service worker, le icone applicative, lo sprite di icone e i Profili editoriali SOS Fanta.
- Tutti i riferimenti runtime alle risorse statiche saranno relativi al documento o allo scope della PWA. L'artefatto dovrà funzionare sia alla radice sia sotto una sottodirectory.
- Il manifest dichiarerà nome completo, nome breve, punto di avvio e scope relativi, modalità standalone, colori applicativi e icone da 192 e 512 pixel.
- L'installazione userà l'interfaccia nativa del browser. Non verrà aggiunto un pulsante di installazione personalizzato nell'interfaccia applicativa.
- Il service worker verrà registrato in modo non bloccante dopo l'avvio della pagina. Un errore di registrazione non impedirà l'uso online della dashboard.
- Il service worker precacherà l'intera app shell necessaria all'uso offline. L'installazione della nuova versione fallirà nel suo complesso se manca una risorsa essenziale, lasciando attiva la versione precedente.
- Le navigazioni useranno il punto di ingresso conservato come fallback offline. Le risorse statiche note saranno servite dalla cache attiva e la rete sarà usata quando una risorsa non è disponibile in cache.
- Ogni rilascio avrà un identificatore di cache distinto. Dopo l'attivazione riuscita, il service worker eliminerà soltanto le precedenti cache appartenenti alla dashboard.
- Una nuova versione scaricata non forzerà il ricaricamento delle finestre già aperte. Diventerà effettiva dopo la chiusura della sessione corrente e una successiva apertura.
- Il service worker intercetterà soltanto richieste GET pertinenti allo scope applicativo. Non accederà a localStorage e non introdurrà persistenza alternativa per lo stato di dominio.
- Le chiavi e il formato della persistenza applicativa esistente non cambieranno. Catalogo calciatori, configurazione d'asta, squadre, shortlist e Asta attiva continueranno a essere salvati come un unico stato versionato con copia precedente e Backup locale.
- La URL pubblica verrà considerata stabile. Un futuro cambio di dominio o origine richiederà esportazione e ripristino manuale del Backup locale, non una migrazione automatica.
- Una pipeline GitHub Actions verrà eseguita per i rilasci dal branch principale. Installerà dipendenze in modo riproducibile, predisporrà il browser richiesto dai test, eseguirà typecheck e suite completa, produrrà l'artefatto e lo pubblicherà tramite il meccanismo ufficiale di GitHub Pages.
- La pubblicazione avverrà soltanto dopo il completamento riuscito di tutti i controlli. Un'esecuzione fallita non sostituirà la versione precedentemente pubblicata.
- La documentazione operativa distinguerà chiaramente sviluppo locale e uso della PWA. Indicherà browser desktop consigliati, necessità della prima apertura online, procedura di installazione, comportamento offline e importanza del Backup locale.

## Testing Decisions

- I test verificheranno esclusivamente comportamento osservabile dall'esterno: artefatto HTTP, interazione tramite browser, persistenza applicativa e disponibilità offline. Non verranno testati dettagli interni delle callback del service worker.
- Verrà usato un unico seam principale: una suite browser end-to-end che apre l'artefatto di produzione servito da una sottodirectory, equivalente al percorso non-root di GitHub Pages.
- La suite verificherà che il documento, il foglio di stile, tutti i moduli JavaScript, lo sprite di icone, i Profili editoriali SOS Fanta, il manifest, le icone applicative e il service worker siano raggiungibili senza errori.
- La suite verificherà dal browser i metadati essenziali del manifest, inclusi nome, modalità standalone, punto di avvio relativo e icone richieste.
- La suite attenderà che il service worker sia pronto prima di simulare la perdita della rete, evitando risultati intermittenti dovuti alla prima installazione non ancora conclusa.
- La suite importerà un Catalogo calciatori rappresentativo, configurerà e avvierà un'Asta attiva e registrerà almeno un Acquisto prima della verifica offline.
- La suite chiuderà e riaprirà la dashboard senza rete e verificherà sia il caricamento completo dell'interfaccia sia la conservazione del Catalogo calciatori e dell'Asta attiva.
- Il percorso di aggiornamento verrà verificato rendendo disponibile una seconda versione dell'app shell con un diverso identificatore di cache. La suite controllerà che la sessione aperta non venga ricaricata, che la nuova versione diventi attiva dopo la chiusura e che lo stato di dominio rimanga invariato.
- Il fallimento dell'installazione di una nuova cache verrà verificato rendendo indisponibile una risorsa essenziale e controllando che la precedente versione continui a essere riapribile.
- Il contenuto della directory di produzione verrà verificato attraverso il suo comportamento HTTP: le risorse richieste devono esistere, mentre sorgenti, test e materiali di lavoro non devono essere pubblicati.
- I test browser esistenti del Catalogo calciatori e dell'Asta live costituiscono il riferimento per selettori accessibili, fixture CSV e verifica del localStorage attraverso il comportamento pubblico.
- I test esistenti del server locale costituiscono il riferimento per avvio e chiusura affidabili del server usato dalla suite.
- La UI nativa con cui Chrome, Edge o il sistema operativo installano la PWA non verrà automatizzata. L'installabilità sarà verificata tramite manifest valido, contesto sicuro e service worker pronto.
- La configurazione di GitHub Pages non verrà collaudata con test end-to-end contro il servizio remoto. La pipeline verificherà e pubblicherà esattamente lo stesso artefatto già coperto localmente.

## Out of Scope

- Account, login, autorizzazioni applicative o gestione di identità.
- Backend, database remoto, API applicative o sincronizzazione cloud.
- Condivisione in tempo reale della stessa Asta attiva tra più dispositivi.
- Trasferimento automatico dello stato tra browser, profili, computer o origini differenti.
- Installazione utilizzabile offline prima che sia stata completata almeno una prima apertura online.
- Pacchetti desktop nativi tramite Tauri, Electron o tecnologie equivalenti.
- Pubblicazione su Microsoft Store, Mac App Store o altri store applicativi.
- Firma del codice, notarizzazione o produzione di installer Windows, macOS o Linux.
- Pulsante di installazione personalizzato, tutorial interattivo o schermata di onboarding dedicata.
- Aggiornamenti forzati durante una sessione, banner di aggiornamento o scelta manuale della versione.
- Push notification, background sync, aggiornamento periodico di dati remoti o funzionalità offline dinamiche.
- Telemetria, analytics o raccolta di dati sull'uso della dashboard.
- Backup automatici, backup cloud o recupero dei dati dopo la cancellazione dello storage del browser.
- Migrazione automatica del localStorage in caso di cambio del dominio pubblico.
- Modifiche al formato CSV, alle regole del Catalogo calciatori o alle regole dell'Asta live.
- Nuovi formati di Fantacalcio, funzionalità mobile specifiche o modifiche responsive non necessarie alla PWA.
- Supporto uniforme all'installazione su browser desktop che non espongono l'installazione PWA.
- Automazione della UI di installazione fornita dal browser o dal sistema operativo.
- Hosting statici alternativi o dominio personalizzato nel primo rilascio.

## Further Notes

- La dashboard è particolarmente adatta a un precache completo perché usa file statici, non ha dipendenze runtime esterne e l'artefatto corrente è contenuto.
- L'uso senza login significa che chiunque abbia accesso allo stesso profilo del computer può aprire la dashboard. Non rappresenta un confine di sicurezza tra persone che condividono il dispositivo.
- localStorage è legato a schema, host e porta dell'origine. Mantenere stabile la URL pubblica è quindi un requisito operativo per conservare lo stato attraverso i rilasci.
- La cancellazione dei dati del sito, l'uso della navigazione privata o la rimozione del profilo browser può eliminare lo stato locale. Il Backup locale resta la protezione prevista dal prodotto.
- GitHub Pages serve le risorse applicative e può registrare informazioni tecniche delle richieste, come l'indirizzo IP. Catalogo calciatori e Asta attiva non saranno inviati dall'applicazione al servizio di hosting.
- Chrome ed Edge desktop costituiscono il percorso consigliato per l'installazione. Safari moderno può aggiungere il sito al Dock; i browser privi di installazione PWA potranno comunque usare la dashboard come normale sito quando supportano le API necessarie.
- La specifica adotta il seam di test concordato: artefatto di produzione, percorso non-root, browser reale, riapertura offline e conservazione dello stato.
