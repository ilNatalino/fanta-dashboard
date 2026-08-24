# 13 — Organizzare la Shortlist personale

**What to build:** Il percorso completo per creare categorie personali, associarvi i calciatori anche in modo sovrapposto e ritrovare l'organizzazione dopo un refresh.

**Blocked by:** 11 — Importare e ritrovare il Catalogo calciatori.

**Status:** done

- [x] Il Fantallenatore principale può creare categorie con nome obbligatorio e univoco dopo la normalizzazione di maiuscole, minuscole e spazi esterni.
- [x] Lo stesso calciatore può appartenere contemporaneamente a più categorie.
- [x] Un calciatore entra nella Shortlist con la prima associazione e ne esce quando viene rimosso dall'ultima categoria.
- [x] Le categorie possono essere rinominate; la nuova denominazione rispetta la medesima regola di unicità.
- [x] Eliminare una categoria popolata richiede conferma e rimuove soltanto la categoria e le sue associazioni.
- [x] Le associazioni possono essere gestite dalla consultazione del Catalogo calciatori senza una schermata per operazioni massive.
- [x] Categorie e associazioni sopravvivono al refresh e non modificano l'ordine PFC dei calciatori.
- [x] I controlli automatici verificano creazione, sovrapposizione, rinomina, eliminazione e persistenza attraverso il comportamento visibile dell'app.
