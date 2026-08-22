# Definire gli scenari di accettazione dell'MVP

Type: `grilling`
Status: `resolved`
Parent: [Mappa — Specifica MVP dell'assistente d'asta Fantacalcio](../map.md)
Blocked by: 05, 08, 09

## Question

Quali scenari osservabili devono essere soddisfatti perché la specifica dell'MVP possa considerarsi completa e pronta per essere consegnata all'implementazione?

## Answer

Gli scenari formano un contratto essenziale ma completo: un percorso nominale end-to-end e i casi critici di rifiuto atomico, correzione, annullamento e recupero. Non costituiscono una matrice esaustiva di ogni campo o variante, che appartiene ai test d'implementazione.

Gli esempi quantitativi usano il [catalogo rappresentativo](../assets/04-catalogo-rappresentativo.csv), la [configurazione d'asta](../assets/04-configurazione-asta.csv) e gli [eventi d'asta sintetici](../assets/04-eventi-asta.csv). Gli stessi comportamenti valgono per qualsiasi CSV conforme. Gli aspetti dell'interfaccia verificano struttura, responsabilità e informazioni osservabili, non pixel, colori o dettagli estetici.

### 1. Importazione valida

**Dato** il catalogo rappresentativo, **quando** viene importato, **allora** tutti i 32 calciatori sono disponibili, vengono letti gli otto campi previsti e le colonne aggiuntive sono ignorate.

### 2. Importazione invalida atomica

**Dato** un catalogo già valido, **quando** un CSV contiene colonne mancanti, nomi duplicati normalizzati o valori non ammessi, **allora** l'intero file è rifiutato, gli errori indicano riga, campo e motivo e il catalogo precedente resta invariato.

### 3. Configurazione e avvio

**Data** la configurazione `8 squadre · 1.000 crediti · 3/8/8/6 posti`, **quando** viene avviata l'asta, **allora** le regole strutturali sono bloccate, i nomi restano modificabili e un refresh ripristina automaticamente l'asta.

### 4. Dashboard live

**Durante** l'asta, **quando** si apre la pagina `Asta`, **allora** ranking e scarsità, Scheda d'asta e rosa principale occupano le tre aree stabilite; PMA, PFC e prezzo adattato restano segnali di mercato, mentre budget residuo e Massimo spendibile restano vincoli personali separati.

### 5. Acquisto valido

**Dato** `GIOCATORE_D_01` ancora disponibile, **quando** viene assegnato a `Squadra 2` per 157 crediti, **allora** il calciatore scompare dai disponibili, compare nella rosa, il budget diventa 843, la scarsità dello slot diminuisce e la Scheda d'asta si chiude solo dopo il salvataggio.

### 6. Acquisto impossibile

**Quando** si tenta di assegnare un calciatore già acquistato, superare il budget o superare i Posti di ruolo disponibili, **allora** l'acquisto è bloccato, lo stato non cambia e il modulo conserva i dati inseriti con un errore contestuale.

### 7. Riferimenti di prezzo

**Dati** esempi rappresentativi sopra, sotto ed entro la tolleranza del 5%, **quando** si apre la Scheda d'asta, **allora** la percezione storica è rispettivamente `In hype`, `Sottovalutato` o `In linea` e PMA e PFC originali sono mostrati come interi.

### 8. Adattamento alla soglia

**Dati** gli eventi DIF della fixture, **quando** sono stati registrati soltanto i primi due acquisti, **allora** compare `Dati insufficienti`; **quando** `GIOCATORE_D_03` viene acquistato a 76 crediti, **allora** la mediana produce uno scostamento DIF del `+16%` e il prezzo adattato di `GIOCATORE_D_04` è 24 crediti, nonostante il valore anomalo.

### 9. Ranking, scarsità e alternative

**Dati** i calciatori disponibili, **quando** si seleziona un ruolo, **allora** il ranking usa PFC decrescente e nome alfabetico e la scarsità include gli slot a zero. **Dato** un calciatore chiamato con almeno quattro altri disponibili nel medesimo ruolo e Slot, **allora** vengono mostrate soltanto le prime tre Alternative immediate secondo lo stesso ordinamento.

### 10. Shortlist sovrapponibile

**Dato** un calciatore associato a due categorie della shortlist, **quando** viene acquistato, **allora** conserva entrambe le categorie ma viene nascosto dalla vista predefinita dei disponibili; **quando** l'acquisto viene annullato, **allora** ricompare automaticamente. Un nome di categoria equivalente dopo la normalizzazione viene rifiutato.

### 11. Correzione e annullamento atomici

**Dato** un acquisto esistente, **quando** una correzione è valida, **allora** squadra, prezzo e tutti i dati derivati vengono aggiornati insieme; **quando** la correzione è invalida, **allora** l'acquisto originale resta intatto. **Quando** `GIOCATORE_C_03` viene annullato, **allora** il campione CEN scende da tre a due e il prezzo adattato torna immediatamente a `Dati insufficienti`.

### 12. Persistenza e recupero

**Dopo** un'operazione confermata, **quando** l'app viene ricaricata, **allora** ripristina l'ultimo stato salvato. **Quando** lo stato più recente è illeggibile o incompatibile, **allora** ripristina la copia valida precedente con un avviso; se nessuna copia è valida, non esegue un reset silenzioso e offre esportazione del dato problematico o reset esplicito.

### 13. Backup completo

**Dato** un backup esportato, **quando** viene importato e confermato, **allora** ripristina insieme catalogo, configurazione, squadre, shortlist e asta attiva. **Quando** il backup è invalido, **allora** lo stato corrente non cambia.

### 14. Rose e squadre

**Quando** si apre `La mia rosa`, **allora** sono visibili spesa, Posti di ruolo e distribuzione degli Slot per ruolo. **Quando** si apre `Squadre`, **allora** sono mostrati soltanto i dati osservati degli avversari, senza punteggi o previsioni strategiche.

### 15. Completamento e reset

**Quando** tutte le squadre occupano i posti configurati, **allora** l'Asta è completa senza un comando di chiusura. **Quando** il Reset dell'asta viene confermato, **allora** acquisti e indicatori live vengono eliminati, mentre catalogo, configurazione, squadre e shortlist restano disponibili.
