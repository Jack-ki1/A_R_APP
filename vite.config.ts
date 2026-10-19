import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackStart({ server: { entry: "server" } }),
    nitro({ preset: "node-server" }),
    tailwindcss(),
    viteReact(),
  ],
  resolve: { tsconfigPaths: true },
  server: { host: "0.0.0.0", port: 3000 },
});
