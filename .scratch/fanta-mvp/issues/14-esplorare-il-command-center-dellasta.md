# 14 — Esplorare il command center dell'Asta

**What to build:** La pagina operativa dell'Asta attiva, dove il Fantallenatore principale cerca il Calciatore chiamato e confronta ranking, scarsità, alternative, riferimenti storici e Shortlist in un command center a tre colonne.

**Blocked by:** 12 — Configurare e avviare l'Asta attiva; 13 — Organizzare la Shortlist personale.

**Status:** done

- [x] La pagina `Asta` presenta Ranking e Scarsità per slot a sinistra, Scheda d'asta al centro e rosa della Squadra principale a destra.
- [x] La ricerca testuale seleziona il Calciatore chiamato; chiudere la Scheda d'asta non modifica alcuno stato e non crea una cronologia delle chiamate.
- [x] La Scheda d'asta mostra identità, Ruolo, squadra reale, Slot, PMA, PFC, Percezione storica di mercato, fantamedia e Titolarità prevista.
- [x] La Percezione storica di mercato produce `In hype`, `Sottovalutato` o `In linea` usando la tolleranza configurata e presenta prezzi e percentuali come interi.
- [x] Il Ranking è separato per Ruolo e usa PFC decrescente e nome alfabetico; Slot, PMA, fantamedia, Titolarità prevista e categorie della Shortlist sono filtri o ordinamenti trasparenti.
- [x] La Scarsità per slot mostra il conteggio di tutti gli Slot del Ruolo selezionato, compresi quelli a zero, senza livelli o colori d'urgenza.
- [x] Le Alternative immediate sono al massimo tre altri disponibili dello stesso Ruolo e Slot, ordinate per PFC e nome e mai completate con Slot diversi.
- [x] Le categorie della Shortlist sono gestibili dalla Scheda d'asta e possono evidenziare o filtrare senza cambiare ranking o Alternative immediate.
- [x] Il layout viene verificato per struttura e responsabilità informative, senza asserzioni pixel-perfect o su colori decorativi.
