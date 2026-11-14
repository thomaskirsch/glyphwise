import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  // Relative paths so the same build works on GitHub Pages, in Capacitor and offline.
  base: "./",
  server: { port: 5180 },
  test: { include: ["src/**/*.test.ts"] },
});
