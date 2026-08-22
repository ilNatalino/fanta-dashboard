import { mountCatalogApp } from "./catalog-view.js";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Contenitore dell'applicazione non trovato");
mountCatalogApp(root);
