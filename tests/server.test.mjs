import assert from "node:assert/strict";
import { createServer } from "node:http";
import { setTimeout } from "node:timers/promises";
import { test } from "node:test";
import { startServer } from "../scripts/serve.mjs";

test("startServer rifiuta subito una porta non disponibile", async () => {
  const blocker = createServer();
  await new Promise((resolve) => blocker.listen(0, "127.0.0.1", resolve));
  const { port } = blocker.address();

  try {
    await assert.rejects(
      Promise.race([
        startServer(process.cwd(), port),
        setTimeout(500).then(() => {
          throw new Error("startServer è rimasto in attesa");
        }),
      ]),
      (error) => error.code === "EADDRINUSE",
    );
  } finally {
    await new Promise((resolve) => blocker.close(resolve));
  }
});
