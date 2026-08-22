# 21 — Esportare e ripristinare il Backup locale

**What to build:** Il percorso manuale con cui il Fantallenatore principale esporta l'intero stato in un unico Backup locale e lo reimporta in modo validato e atomico.

**Blocked by:** 20 — Sostituire in sicurezza il Catalogo calciatori.

**Status:** ready-for-agent

- [ ] L'esportazione produce un unico file contenente Catalogo calciatori, Configurazione d'asta, Squadre, Shortlist e Asta attiva con tutti gli Acquisti.
- [ ] Il Backup locale contiene le informazioni necessarie a riconoscere e validare la versione dello stato.
- [ ] L'importazione valida l'intero file prima di proporre qualsiasi modifica allo stato corrente.
- [ ] Un Backup locale valido richiede conferma esplicita prima di sostituire lo stato corrente.
- [ ] Dopo la conferma, l'intero stato viene sostituito atomicamente e tutte le viste mostrano immediatamente i dati ripristinati.
- [ ] Un file invalido, incompatibile o una conferma annullata non modifica alcuna parte dello stato corrente.
- [ ] Un backup esportato con Catalogo calciatori, categorie sovrapposte, Squadre rinominate e Acquisti ripristina tutti questi dati.
- [ ] Il percorso non promette sincronizzazione automatica: il file è il mezzo manuale di trasferimento e recupero.
- [ ] I controlli automatici verificano il round trip completo e l'atomicità del rifiuto attraverso gli output pubblici dell'applicazione.
