# 22 — Recuperare salvataggi falliti o corrotti

**What to build:** La protezione finale dello stato locale: ogni operazione viene confermata soltanto dopo una scrittura riuscita, mentre copie corrotte o incompatibili vengono recuperate senza reset silenziosi.

**Blocked by:** 21 — Esportare e ripristinare il Backup locale.

**Status:** done

- [x] Catalogo calciatori, Configurazione d'asta, Squadre, Shortlist e Acquisti vengono salvati automaticamente come un unico stato dopo ogni operazione valida.
- [x] Un'operazione viene mostrata come completata soltanto dopo il buon esito della scrittura locale.
- [x] Se la scrittura fallisce, l'app conserva lo stato confermato precedente, mantiene coerente l'interfaccia e comunica l'errore.
- [x] Lo stato salvato è versionato e validato prima dell'uso; l'app conserva la copia corrente e l'ultima copia valida precedente.
- [x] Se la copia corrente è illeggibile o incompatibile, l'app ripristina la copia valida precedente e avvisa che l'ultima operazione potrebbe essere stata persa.
- [x] Se nessuna copia è valida, l'accesso alla sessione viene bloccato senza reset silenzioso.
- [x] Nello stato bloccato il Fantallenatore principale può esportare il dato problematico oppure confermare un reset esplicito.
- [x] Dopo un normale refresh viene sempre ripristinata l'ultima operazione realmente confermata.
- [x] L'adapter deterministico dei test simula scrittura fallita, copia corrente corrotta e doppia copia invalida attraverso l'unico seam di persistenza.
- [x] La promessa di persistenza resta limitata allo stesso dispositivo, browser e profilo in navigazione normale.
