import { createServer } from "node:http";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

export async function startServer(root, port = 0) {
  const absoluteRoot = resolve(root);
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    const filePath = resolve(absoluteRoot, `.${pathname === "/" ? "/index.html" : pathname}`);

    if (filePath !== absoluteRoot && !filePath.startsWith(`${absoluteRoot}${sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      response.setHeader("Content-Type", contentTypes[extname(filePath)] ?? "application/octet-stream");
      response.end(await readFile(filePath));
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  server.listen(port, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Impossibile avviare il server");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose, rejectClose) =>
      server.close((error) => error ? rejectClose(error) : resolveClose()),
    ),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await startServer(process.cwd(), 4173);
  console.log(`Local: ${server.url}`);
}
