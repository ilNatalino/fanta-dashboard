import type { AppState, StateStorage } from "./catalog-application.js";

export class BrowserStateStorage implements StateStorage {
  readonly #key = "fanta-dashboard.state";

  load(): AppState | null {
    const saved = localStorage.getItem(this.#key);
    return saved ? JSON.parse(saved) as AppState : null;
  }

  save(state: AppState): void {
    localStorage.setItem(this.#key, JSON.stringify(state));
  }
}
