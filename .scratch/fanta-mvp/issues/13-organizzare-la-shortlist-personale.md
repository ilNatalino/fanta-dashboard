# 13 — Organizzare la Shortlist personale

**What to build:** Il percorso completo per creare categorie personali, associarvi i calciatori anche in modo sovrapposto e ritrovare l'organizzazione dopo un refresh.

**Blocked by:** 11 — Importare e ritrovare il Catalogo calciatori.

**Status:** ready-for-agent

- [ ] Il Fantallenatore principale può creare categorie con nome obbligatorio e univoco dopo la normalizzazione di maiuscole, minuscole e spazi esterni.
- [ ] Lo stesso calciatore può appartenere contemporaneamente a più categorie.
- [ ] Un calciatore entra nella Shortlist con la prima associazione e ne esce quando viene rimosso dall'ultima categoria.
- [ ] Le categorie possono essere rinominate; la nuova denominazione rispetta la medesima regola di unicità.
- [ ] Eliminare una categoria popolata richiede conferma e rimuove soltanto la categoria e le sue associazioni.
- [ ] Le associazioni possono essere gestite dalla consultazione del Catalogo calciatori senza una schermata per operazioni massive.
- [ ] Categorie e associazioni sopravvivono al refresh e non modificano l'ordine PFC dei calciatori.
- [ ] I controlli automatici verificano creazione, sovrapposizione, rinomina, eliminazione e persistenza attraverso il comportamento visibile dell'app.
