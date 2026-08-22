# 11 — Importare e ritrovare il Catalogo calciatori

**What to build:** Un primo percorso completo e utilizzabile che porta il Fantallenatore principale dalla selezione del CSV alla consultazione di un Catalogo calciatori valido, salvato localmente e ripristinato dopo un refresh.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Senza un Catalogo calciatori, l'app presenta l'importazione come prerequisito iniziale e non permette di avviare un'Asta.
- [ ] L'importazione richiede esattamente una colonna `name`, `team`, `role`, `slot`, `pma`, `pfc`, `expectedFantamedia` ed `expectedTitolarita` e ignora le colonne aggiuntive.
- [ ] I valori vengono validati secondo il contratto della specifica, compresi Ruoli Classic, PFC positivo, PMA non negativo, Slot positivo, Titolarità prevista tra 0 e 100, virgola decimale e spazi esterni.
- [ ] I nomi dei calciatori sono obbligatori e univoci dopo la normalizzazione di maiuscole, minuscole e spazi esterni; la squadra reale è obbligatoria.
- [ ] Un file invalido viene rifiutato interamente, mostra per ogni errore almeno riga, campo e motivo e non sostituisce l'eventuale Catalogo calciatori valido.
- [ ] Il Catalogo rappresentativo importa 32 calciatori mantenendo soltanto i dati necessari all'MVP.
- [ ] Dopo un'importazione valida e un refresh, il medesimo Catalogo calciatori torna consultabile automaticamente.
- [ ] I controlli automatici pilotano il percorso completo dell'applicazione e verificano soltanto risultati osservabili.
