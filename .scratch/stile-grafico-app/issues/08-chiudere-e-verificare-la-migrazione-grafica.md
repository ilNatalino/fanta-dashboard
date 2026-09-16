# 08 — Chiudere e verificare la migrazione grafica

**What to build:** Un redesign completamente migrato e verificato come un unico prodotto, senza residui della vecchia grammatica visiva e senza regressioni nei flussi, nel dominio, nella persistenza o nella PWA.

**Blocked by:** 02 — Compattare testata e navigazione operativa; 03 — Riorganizzare la Scheda d’asta attorno alla decisione e all’Acquisto; 04 — Rendere confrontabili Ranking e Scarsità per slot; 05 — Densificare il Catalogo calciatori; 06 — Confrontare ed espandere le Squadre; 07 — Rendere leggibile La mia rosa per Ruolo Classic.

**Status:** done

- [x] Le convenzioni grafiche temporaneamente conservate durante la migrazione vengono rimosse e tutte le viste condividono la stessa identità `tabellino d’asta` nei temi chiaro e scuro.
- [x] Una suite browser attraversa la dashboard completa con un Catalogo calciatori rappresentativo a 1440 × 900, 1280 × 720, 768 × 1024 e 390 × 844, senza overflow orizzontale del documento.
- [x] Il contrasto dei colori effettivi raggiunge almeno 4.5:1 per testo normale, etichette, placeholder, link e badge e almeno 3:1 per testo grande, focus e confini essenziali dei controlli.
- [x] Navigazione, ricerca, Ruoli Classic, Ranking, Profilo editoriale SOS Fanta e modulo di Acquisto sono percorribili da tastiera con ordine e focus visibile; selezione, errore, successo e indisponibilità non dipendono soltanto dal colore.
- [x] Le azioni principali raggiungono almeno 44 × 44 px su touch e la modalità `prefers-reduced-motion` non richiede alcuna transizione per comprendere selezione, apertura, conferma o errore.
- [x] La build PWA contiene caratteri e risorse del redesign, conserva l’esperienza offline e non mostra spostamenti percepibili del command center durante il caricamento dei caratteri.
- [x] Typecheck, build, suite browser completa e test di dominio e persistenza esistenti passano senza modificare le relative aspettative.
- [x] La revisione visiva manuale nei due temi e alle quattro dimensioni conferma gerarchia, densità, troncamenti, sovrapposizioni, stabilità tipografica e coerenza del linguaggio visivo.
- [x] Il risultato non introduce nuove dipendenze runtime e lascia invariati navigazione, schema dello stato, chiavi di localStorage, Backup locale, CSV e regole del dominio.

## Comments

- La suite dedicata è `npm run test:ticket08` e verifica overflow nelle quattro viewport, contrasto effettivo, focus, target touch, reduced motion e stati di errore.
- La verifica finale include typecheck, build, suite UI, dominio/persistenza, PWA offline e revisione visuale manuale nei temi chiaro e scuro.
