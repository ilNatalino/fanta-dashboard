# 06 — Confrontare ed espandere le Squadre

**What to build:** Una vista Squadre che permetta prima il confronto sintetico di tutti i partecipanti e poi l’apertura mirata della rosa interessata, evitando grandi pannelli vuoti all’inizio dell’asta.

**Blocked by:** 01 — Introdurre le fondamenta del “tabellino d’asta”.

**Status:** done

- [x] La vista apre con un riepilogo compatto di tutte le Squadre che mostra nome, budget residuo, Massimo spendibile, posti totali occupati e occupazione per Ruolo Classic.
- [x] La Squadra principale è identificata esplicitamente nel testo e con un trattamento strutturale, senza dipendere soltanto da un bordo verde.
- [x] La rosa dettagliata può essere aperta e chiusa dalla relativa riga e una sola rosa è aperta per impostazione predefinita.
- [x] L’espansione mostra gli Acquisti raggruppati per Ruolo Classic e non modifica alcuno stato del dominio.
- [x] Una Squadra senza Acquisti occupa poco spazio e mostra uno stato vuoto esplicito invece dell’altezza riservata a una rosa completa.
- [x] Riepilogo, controlli di espansione, stati vuoti e dettagli restano leggibili nei due temi e alle dimensioni desktop, tablet e mobile senza overflow del documento.
- [x] I test browser verificano il confronto di tutte le Squadre, l’identificazione della Squadra principale, apertura e chiusura della rosa, Acquisti registrati e stato vuoto.
