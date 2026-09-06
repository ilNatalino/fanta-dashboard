import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "_site");
const releaseId = (process.env.PWA_RELEASE_ID ?? process.env.GITHUB_SHA ?? "local")
  .replace(/[^a-zA-Z0-9._-]/g, "-");
const appShellFiles = [
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "assets/app-icon-192.png",
  "assets/app-icon-512.png",
  "assets/tabler-icons.svg",
  "sos-fanta-profiles.json",
  "dist/browser-storage.js",
  "dist/catalog-application.js",
  "dist/catalog-view.js",
  "dist/main.js",
];

if (!releaseId) throw new Error("Identificatore del rilascio PWA non valido");

await rm(output, { recursive: true, force: true });
for (const file of appShellFiles) {
  const destination = resolve(output, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(root, file), destination);
}

const serviceWorkerTemplate = await readFile(resolve(root, "pwa", "service-worker.js"), "utf8");
const appShellPlaceholder = "/* __PWA_APP_SHELL__ */ []";
if (!serviceWorkerTemplate.includes(appShellPlaceholder)) {
  throw new Error("Elenco dell'app shell non inseribile nel service worker");
}
await writeFile(
  resolve(output, "service-worker.js"),
  serviceWorkerTemplate
    .replaceAll("__PWA_RELEASE_ID__", releaseId)
    .replace(appShellPlaceholder, JSON.stringify(appShellFiles, null, 2)),
);

console.log(`PWA pronta in ${output} (${releaseId})`);
