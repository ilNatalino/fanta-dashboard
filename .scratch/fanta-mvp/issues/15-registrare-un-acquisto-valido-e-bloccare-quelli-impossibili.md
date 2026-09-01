# 15 — Registrare un Acquisto valido e bloccare quelli impossibili

**What to build:** Il percorso live con cui il Fantallenatore principale assegna il Calciatore chiamato a una Squadra per il prezzo finale e vede aggiornarsi atomicamente disponibilità, rosa, budget e inventario.

**Blocked by:** 14 — Esplorare il command center dell'Asta.

**Status:** done

- [x] `Assegna giocatore` apre un modulo compatto nel quale Squadra e prezzo finale sono obbligatori.
- [x] La Squadra principale può essere evidenziata ma non viene preselezionata.
- [x] Un Acquisto valido rende il calciatore non disponibile, lo inserisce nella rosa scelta, riduce il budget e aggiorna ranking e Scarsità per slot in un'unica operazione.
- [x] Assegnando `GIOCATORE_D_01` a `Squadra 2` per 157 crediti, il budget della Squadra diventa 843 e la Scheda d'asta si chiude soltanto dopo il salvataggio.
- [x] L'app blocca l'Acquisto di un calciatore già acquistato, oltre il budget disponibile o in un Ruolo senza Posti di ruolo liberi.
- [x] Un Acquisto invalido non modifica lo stato, mantiene aperto il modulo, conserva i valori inseriti e mostra un errore contestuale.
- [x] Il riepilogo fisso della Squadra principale mostra budget residuo, posti occupati e rosa aggiornata senza duplicare analisi dettagliate.
- [x] Un refresh dopo un Acquisto confermato ripristina disponibilità, rosa e budget aggiornati.
- [x] I controlli automatici verificano sia il percorso valido sia i tre confini di invalidità attraverso l'interfaccia dell'applicazione.
