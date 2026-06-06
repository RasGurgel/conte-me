import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "vercel",
    serveStatic: true,
    output: {
      dir: ".vercel/output",
      serverDir: "functions/__server.func",
      publicDir: "static",
    },
  },
});