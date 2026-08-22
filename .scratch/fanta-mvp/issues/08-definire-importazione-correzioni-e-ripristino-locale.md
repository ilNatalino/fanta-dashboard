# Definire importazione, correzioni e ripristino locale

Type: `grilling`
Status: `resolved`
Parent: [Mappa — Specifica MVP dell'assistente d'asta Fantacalcio](../map.md)
Blocked by: 01, 04

## Question

Quali comportamenti sono necessari per validare e correggere il CSV, annullare o rettificare un acquisto e recuperare in sicurezza una sessione salvata localmente?

## Answer

### Importazione e validazione del catalogo

L'importazione del catalogo è atomica: l'app valida l'intero CSV prima di modificare lo stato. Se una riga è invalida, rifiuta tutto il file, conserva il catalogo precedente e mostra per ogni errore almeno riga, campo e motivo. Il CSV viene corretto all'esterno dell'app e poi reimportato; l'MVP non offre un editor tabellare interno.

Il contratto minimo richiede che:

- le colonne `name`, `team`, `role`, `slot`, `pma`, `pfc`, `expectedFantamedia` ed `expectedTitolarita` siano presenti esattamente una volta; le colonne aggiuntive vengono ignorate;
- `name` sia non vuoto e univoco dopo aver ignorato maiuscole, minuscole e spazi iniziali o finali;
- `team` sia non vuoto;
- `role` sia uno tra `P`, `D`, `C` e `A`, corrispondenti a POR, DIF, CEN e ATT;
- `slot` sia un intero positivo;
- `pma` sia numerico e maggiore o uguale a zero e `pfc` sia numerico e strettamente positivo;
- `expectedFantamedia` sia numerica;
- `expectedTitolarita` sia numerica e compresa tra 0 e 100 inclusi.

I campi numerici accettano il separatore decimale italiano con virgola usato dal CSV del provider; gli spazi esterni vengono ignorati. L'eventuale supporto aggiuntivo al punto decimale non cambia il significato dei dati.

Un catalogo esistente può essere sostituito soltanto prima dell'inizio dell'asta. Se l'asta è iniziata, il fantallenatore principale deve prima eseguire il Reset dell'asta; la sostituzione successiva richiede comunque una conferma esplicita. Configurazione d'asta, nomi delle squadre e categorie della shortlist vengono conservati. Le associazioni della shortlist vengono mantenute per i calciatori con lo stesso `name` normalizzato e rimosse per i nomi assenti dal nuovo catalogo; prima della conferma l'app riepiloga quante associazioni andrebbero perse.

### Correzioni degli acquisti

La correzione apre un modulo precompilato e permette di modificare soltanto squadra e prezzo finale; il calciatore dell'acquisto non cambia. La versione corretta viene validata come un acquisto normale, calcolando disponibilità di budget e posti sullo stato risultante e senza contare due volte l'acquisto originale. Se la correzione è invalida, l'acquisto originale resta intatto e il modulo conserva i valori inseriti insieme all'errore contestuale.

L'annullamento richiede conferma esplicita. Una correzione valida o un annullamento aggiorna atomicamente acquisto, disponibilità del calciatore, rosa, budget, conteggi di scarsità, campioni dello scostamento d'asta e ogni altro indicatore derivato. Non serve una cronologia separata delle revisioni: un acquisto può essere corretto di nuovo.

### Persistenza e recupero locale

Catalogo, configurazione, squadre, shortlist e acquisti vengono salvati automaticamente dopo ogni operazione valida. Un'operazione viene mostrata come completata soltanto dopo il buon esito del salvataggio; se questo fallisce, lo stato precedente resta valido e l'app comunica l'errore. Al refresh o alla riapertura, l'app ripristina automaticamente l'ultima operazione confermata.

Lo stato salvato è versionato e validato prima dell'uso. L'app conserva anche l'ultima copia valida precedente: se lo stato più recente è illeggibile o incompatibile, ripristina quella copia e avvisa che l'ultima operazione potrebbe essere stata persa. Se nessuna copia è valida, non esegue un reset silenzioso: blocca l'accesso alla sessione e permette di esportare il dato problematico oppure di confermare un reset esplicito.

L'MVP permette inoltre di esportare manualmente un unico file di backup contenente l'intero stato e di reimportarlo. Il ripristino da backup valida il file per intero e richiede conferma prima di sostituire lo stato corrente; un file invalido non modifica nulla.

La persistenza è garantita sullo stesso dispositivo, browser e profilo in navigazione normale. Modalità privata, cancellazione dei dati del browser, cambio dispositivo e sincronizzazione automatica non fanno parte della promessa dell'MVP; il backup manuale è il mezzo previsto per trasferire o recuperare i dati in questi casi.
