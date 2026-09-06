import { mountCatalogApp, type SosFantaProfiles } from "./catalog-view.js";

function profilesFrom(value: unknown): SosFantaProfiles {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([name, profile]) => {
      if (!profile || typeof profile !== "object" || Array.isArray(profile)) return [];
      const { tier, text } = profile as Record<string, unknown>;
      return typeof tier === "string" && tier.trim() && typeof text === "string"
        ? [[name, { tier, text }]]
        : [];
    }),
  );
}

async function loadSosFantaProfiles(): Promise<SosFantaProfiles> {
  try {
    const response = await fetch("/sos-fanta-profiles.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return profilesFrom(await response.json());
  } catch (error) {
    console.warn("Profili SOS Fanta non disponibili; la dashboard continua senza consigli editoriali.", error);
    return {};
  }
}

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Contenitore dell'applicazione non trovato");
mountCatalogApp(root, await loadSosFantaProfiles());
