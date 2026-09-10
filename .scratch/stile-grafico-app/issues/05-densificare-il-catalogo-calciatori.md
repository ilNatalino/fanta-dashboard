# 05 — Densificare il Catalogo calciatori

**What to build:** Un Catalogo calciatori che porti tabella e confronto dei dati più in alto, mantenendo ricerca, filtri, ordinamenti e stato comprensibili tanto su desktop quanto su mobile.

**Blocked by:** 01 — Introdurre le fondamenta del “tabellino d’asta”.

**Status:** ready-for-agent

- [ ] Titolo, conteggio e azioni del Catalogo condividono una testata compatta che lascia più righe visibili nella prima finestra.
- [ ] Ricerca, Ruolo Classic, Slot e stato sono raccolti in una barra filtri coerente; l’azzeramento dei filtri ha peso secondario e non compete con le azioni principali.
- [ ] La tabella conserva colonne, combinazione dei filtri, ordinamenti e comportamento sticky esistenti, con intestazioni e righe di altezza coerente nella variante scelta.
- [ ] La colonna e la direzione di ordinamento correnti sono indicate visivamente e tramite semantica accessibile.
- [ ] PMA, PFC, Fantamedia prevista, Titolarità prevista e gli altri valori numerici usano cifre tabulari e un allineamento coerente; il passaggio del puntatore evidenzia la riga completa.
- [ ] Su mobile il Catalogo resta una lista dedicata e segue la gerarchia nome, squadra reale, Ruolo Classic e Slot, metriche del provider, Shortlist e stato, senza simulare una tabella compressa.
- [ ] Ricerca, filtri, ordinamento, azzeramento e Correzione dell’acquisto continuano a funzionare con tastiera e touch senza alterare Catalogo calciatori, CSV o regole di importazione.
- [ ] I test browser coprono comportamento desktop e mobile, indicazione dell’ordinamento, densità della prima finestra, assenza di overflow e regressioni dei flussi pubblici esistenti.
