# Asta Fantacalcio

Contesto del supporto decisionale personale durante un'asta di fantacalcio.

## Language

**Fantallenatore principale**:
Il partecipante all'asta che usa la dashboard per pianificare e registrare i propri acquisti.
_Avoid_: Utente, manager

**Fantacalcio Classic**:
La modalità di fantacalcio basata sui quattro ruoli POR, DIF, CEN e ATT.
_Avoid_: Mantra

**Asta live**:
Una sessione con un numero configurabile di partecipanti, nella quale viene chiamato un calciatore alla volta e si effettuano rilanci aperti.
_Avoid_: Asta a buste chiuse, draft

**Asta attiva**:
L'unica sessione d'asta corrente, avviata a partire dal catalogo calciatori e azzerabile senza eliminare il catalogo.
_Avoid_: Storico aste, archivio aste

**Asta completa**:
La condizione in cui tutte le squadre hanno occupato i posti previsti dalla configurazione; non è uno stato di chiusura separato.
_Avoid_: Asta chiusa, archiviazione

**Catalogo calciatori**:
L'insieme dei calciatori e dei relativi dati importati dal CSV prima di avviare un'asta; è il prerequisito persistente delle sessioni d'asta.
_Avoid_: Rosa, asta, shortlist

**Importazione del catalogo**:
La sostituzione atomica dell'intero catalogo calciatori con i dati validati di un CSV; non produce cataloghi parziali.
_Avoid_: Aggiunta incrementale, correzione in-app del CSV

**Backup locale**:
Un file esportabile che rappresenta catalogo, configurazione, squadre, shortlist e asta attiva come un unico stato ripristinabile.
_Avoid_: Trasferimento manuale, sincronizzazione cloud, esportazione del solo catalogo

**Shortlist**:
L'insieme dei calciatori d'interesse personale, organizzati in una o più categorie dal fantallenatore principale.
_Avoid_: Catalogo calciatori, ranking, raccomandazione automatica

**Categoria della shortlist**:
Un raggruppamento nominato liberamente dal fantallenatore principale; un calciatore può appartenere a più categorie contemporaneamente.
_Avoid_: Ruolo, slot, priorità fissa

**Ranking dei calciatori disponibili**:
L'ordinamento dei calciatori non ancora acquistati all'interno di un singolo ruolo Classic, definito prima dal PFC decrescente e poi dal nome alfabetico.
_Avoid_: Classifica globale tra ruoli, Auction Score, ordine della shortlist

**Scarsità per slot**:
Il conteggio dei calciatori ancora disponibili in ciascuno slot di un ruolo Classic, inclusi gli slot che hanno raggiunto zero.
_Avoid_: Punteggio di scarsità, previsione della domanda, urgenza d'acquisto

**Alternativa immediata**:
Uno dei primi tre calciatori ancora disponibili nello stesso ruolo e nello stesso slot del calciatore chiamato, ordinati per PFC decrescente e poi per nome alfabetico.
_Avoid_: Piano B automatico, slot adiacente, raccomandazione d'acquisto

**Reset dell'asta**:
Il ritorno allo stato pre-asta dello stesso setup, eliminando acquisti e progressi ma conservando catalogo, configurazione, squadre e shortlist.
_Avoid_: Eliminazione del catalogo, nuova configurazione

**Squadra**:
La rosa controllata da un partecipante all'asta, alla quale vengono assegnati i calciatori acquistati.
_Avoid_: Account, utente

**Squadra principale**:
La squadra del fantallenatore principale, identificata da un nome esplicito durante la configurazione.
_Avoid_: Squadra 1, squadra utente

**Squadra avversaria**:
Una squadra diversa dalla squadra principale, inizialmente identificabile con un nome numerato generato automaticamente.
_Avoid_: Avversario generico, squadra principale

**Acquisto**:
L'assegnazione definitiva di un calciatore a una squadra per il prezzo finale dell'asta.
_Avoid_: Offerta, rilancio

**Correzione dell'acquisto**:
La rettifica della squadra o del prezzo di un acquisto già registrato, oppure il suo annullamento con ritorno del calciatore tra i disponibili.
_Avoid_: Nuovo acquisto, modifica del calciatore

**Configurazione d'asta**:
L'insieme modificabile di numero di squadre, budget iniziale comune e posti richiesti per ciascun ruolo Classic, definito prima dell'inizio dell'asta.
_Avoid_: Regole fisse, impostazioni globali

**Prezzo medio d'asta (PMA)**:
Il prezzo medio pagato per un calciatore nelle aste osservate dal dataset di riferimento.
_Avoid_: Prezzo consigliato, valore del calciatore

**Valutazione del provider (PFC)**:
La stima, prodotta da un provider esterno, dei crediti che sarebbe opportuno spendere per un calciatore.
_Avoid_: PMA, prezzo ufficiale Fantacalcio.it

**Percezione storica di mercato**:
La classificazione del calciatore come `In hype`, `Sottovalutato` o `In linea` confrontando PMA e PFC con una tolleranza percentuale configurabile, predefinita al `5%`.
_Avoid_: Scostamento d'asta per ruolo, prezzo adattato all'asta

**Slot**:
La fascia qualitativa ordinale di un calciatore all'interno del suo ruolo: `1` indica la fascia più forte e valori interi crescenti indicano fasce progressivamente inferiori; il valore massimo può variare tra i ruoli.
_Avoid_: A1, fascia alfabetica

**Posto di ruolo**:
Una posizione della rosa da occupare con un calciatore di uno specifico ruolo Classic, secondo la configurazione d'asta.
_Avoid_: Slot, fascia qualitativa

**Titolarità prevista (EXP_TIT)**:
La probabilità, espressa da `0` a `100`, che un calciatore sia titolare.
_Avoid_: Presenze previste, titolarità certa

**Calciatore chiamato**:
Il calciatore sul quale è aperta l'asta in un dato momento.
_Avoid_: Target, acquisto

**Scostamento d'asta per ruolo**:
La variazione percentuale data dalla mediana dei rapporti tra prezzo finale e PFC degli acquisti attivi nello stesso ruolo; comprende gli acquisti della squadra principale e viene ridefinita da ogni correzione o annullamento.
_Avoid_: Inflazione generale, PMA

**Soglia di adattamento**:
Il numero minimo configurabile di acquisti osservati nello stesso ruolo necessario per mostrare il prezzo adattato all'asta; il valore predefinito è `3`.
_Avoid_: Numero di posti, dimensione del ruolo

**Prezzo adattato all'asta**:
Il PFC di un calciatore moltiplicato per la mediana dei rapporti tra prezzo finale e PFC osservati nel suo ruolo durante l'asta attiva.
_Avoid_: PFC, PMA, prezzo finale

**Massimo spendibile**:
Il budget residuo della squadra principale al netto di un credito riservato per ciascun altro posto ancora da riempire.
_Avoid_: PFC, prezzo adattato all'asta, tetto consigliato

**Scheda d'asta**:
La vista temporanea del calciatore chiamato, con valutazioni, indicatori, PFC e prezzo adattato all'asta; chiuderla non cambia lo stato del calciatore.
_Avoid_: Cronologia delle offerte, prezzo corrente
