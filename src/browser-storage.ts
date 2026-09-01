import type { AppState, StateStorage, StoredStateCopies } from "./catalog-application.js";

export class BrowserStateStorage implements StateStorage {
  readonly #key = "fanta-dashboard.state";
  readonly #previousKey = "fanta-dashboard.state.previous";

  load(): StoredStateCopies {
    return {
      current: localStorage.getItem(this.#key),
      previous: localStorage.getItem(this.#previousKey),
    };
  }

  save(state: AppState): void {
    const current = localStorage.getItem(this.#key);
    if (current !== null) localStorage.setItem(this.#previousKey, current);
    localStorage.setItem(this.#key, JSON.stringify(state));
  }

  restorePrevious(): void {
    const previous = localStorage.getItem(this.#previousKey);
    if (previous === null) throw new Error("Copia precedente non disponibile");
    localStorage.setItem(this.#key, previous);
  }

  clear(): void {
    localStorage.removeItem(this.#key);
    localStorage.removeItem(this.#previousKey);
  }
}
