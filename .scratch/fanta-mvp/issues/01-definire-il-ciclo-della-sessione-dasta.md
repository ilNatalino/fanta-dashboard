# Definire il ciclo della sessione d'asta

Type: `grilling`
Status: `resolved`
Parent: [Mappa — Specifica MVP dell'assistente d'asta Fantacalcio](../map.md)
Blocked by: none

## Question

Qual è il flusso completo e minimo di una sessione, dalla configurazione e importazione del CSV fino a ricerca del calciatore, registrazione o correzione dell'acquisto, ripresa dopo un refresh e chiusura dell'asta?

## Answer

L'MVP gestisce un solo catalogo calciatori persistente e una sola asta attiva alla volta.

### Preparazione

1. Se non esiste un catalogo calciatori, l'importazione del CSV è il prerequisito iniziale e precede qualsiasi asta.
2. Con il catalogo disponibile, il fantallenatore configura numero di partecipanti, budget iniziale comune e posti per POR, DIF, CEN e ATT.
3. Il nome della squadra principale è obbligatorio. Le squadre avversarie ricevono nomi numerati automatici, modificabili facoltativamente.
4. L'avvio dell'asta blocca numero di squadre, budget e posti per ruolo. I nomi delle squadre restano modificabili; per cambiare le regole strutturali occorre prima resettare l'asta.

### Uso durante l'asta

1. All'apertura dell'app, un'asta già iniziata viene ripresa automaticamente dal suo ultimo stato salvato; non esiste un comando di salvataggio manuale.
2. La ricerca testuale seleziona il calciatore chiamato e apre una scheda d'asta temporanea con dati e prezzi di riferimento.
3. Chiudere la scheda non modifica disponibilità o altri dati. Non viene conservata una cronologia delle chiamate.
4. Il comando “Assegna” apre un modulo compatto nel quale squadra acquirente e prezzo finale sono entrambi obbligatori. La squadra principale può essere evidenziata ma non è preselezionata.
5. Un acquisto oggettivamente impossibile, come l'assegnazione di un calciatore già acquistato, a un ruolo già completo o oltre il budget disponibile della squadra, viene bloccato con un errore contestuale senza chiudere il modulo o perdere i dati inseriti.
6. Una registrazione valida crea l'acquisto, aggiorna disponibilità, rosa, budget e indicatori derivati, quindi chiude la scheda.

### Correzioni, reset e completamento

1. Qualsiasi acquisto precedente può essere corretto cambiando squadra o prezzo, oppure annullato. L'annullamento restituisce il calciatore ai disponibili; ogni correzione ricalcola gli stati derivati.
2. “Resetta asta”, protetto da conferma esplicita, elimina acquisti, assegnazioni, prezzi finali e progressi. Conserva catalogo, configurazione, squadre e shortlist e riporta lo stesso setup allo stato pre-asta.
3. Non esiste un'azione “Termina asta”. Quando tutte le squadre occupano i posti configurati, l'asta è completa per condizione naturale e le rose restano consultabili.
