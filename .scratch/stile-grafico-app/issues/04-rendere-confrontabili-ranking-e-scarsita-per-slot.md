# 04 — Rendere confrontabili Ranking e Scarsità per slot

**What to build:** Due prospettive coordinate e dense sul Ruolo Classic corrente, una per confrontare il Ranking dei calciatori disponibili e una per riconoscere la Scarsità per slot durante lo scorrimento dell’Asta live.

**Blocked by:** 01 — Introdurre le fondamenta del “tabellino d’asta”.

**Status:** done

- [x] Il Ranking usa righe compatte con nome a sinistra e metrica ordinata a destra in colonne visive stabili, senza capsule decorative.
- [x] La riga del Calciatore chiamato espone `aria-current` ed è riconoscibile tramite almeno due segnali fra indicatore strutturale, peso, contrasto e colore.
- [x] Selezionare un calciatore dal Ranking conserva la posizione di scorrimento e collega chiaramente la riga alla Scheda d’asta aperta.
- [x] Ruolo Classic, ordinamento e filtri del Ranking usano controlli compatti ma con target adeguati; il filtro degli acquistati compare soltanto dopo la selezione di una Categoria della shortlist.
- [x] Scarsità per slot allinea Slot e numero di disponibili, mantiene visibili tutti gli Slot originari e descrive testualmente quelli con zero disponibili.
- [x] Ranking e Scarsità per slot restano distinti, condividono il Ruolo Classic selezionato e si aggiornano dopo Acquisto, Correzione dell’acquisto o annullamento.
- [x] Entrambi restano sticky su desktop; su tablet e mobile rientrano nel flusso mantenendo l’ordine Scheda d’asta, Ranking e Scarsità per slot senza overflow orizzontale del documento.
- [x] I test browser verificano ordinamento e filtri, selezione accessibile, persistenza dello scroll, Slot esauriti, sincronizzazione dopo un Acquisto e comportamento responsive.
