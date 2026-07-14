import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  preview: { allowedHosts: ["oxk.tail8d4074.ts.net"] },
});
