# 20 — Sostituire in sicurezza il Catalogo calciatori

**What to build:** Il percorso controllato per aggiornare il Catalogo calciatori senza perdere configurazione e organizzazione personale, riconciliando le associazioni della Shortlist prima della conferma.

**Blocked by:** 13 — Organizzare la Shortlist personale; 19 — Completare e resettare l'Asta attiva.

**Status:** ready-for-agent

- [ ] Un Catalogo calciatori esistente può essere sostituito soltanto nello stato pre-asta.
- [ ] Con un'Asta iniziata, la sostituzione è bloccata e richiede prima il Reset dell'asta.
- [ ] Il nuovo CSV viene validato interamente secondo il medesimo contratto dell'importazione iniziale prima di proporre la sostituzione.
- [ ] Prima della sostituzione viene richiesta conferma esplicita e viene mostrato quante associazioni della Shortlist andrebbero perse.
- [ ] Una conferma valida sostituisce atomicamente l'intero Catalogo calciatori e non produce uno stato parziale.
- [ ] Configurazione d'asta, nomi delle Squadre e categorie della Shortlist vengono conservati.
- [ ] Le associazioni della Shortlist vengono mantenute per i calciatori con lo stesso nome normalizzato e rimosse per i nomi assenti dal nuovo Catalogo calciatori.
- [ ] Un file invalido o una conferma annullata lascia invariato l'intero stato corrente.
- [ ] I controlli automatici verificano blocco durante l'asta, riepilogo delle perdite, riconciliazione e atomicità tramite il comportamento visibile dell'app.
