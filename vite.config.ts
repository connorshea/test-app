import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
  fmt: {},
  lint: {
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "test-app", specifier: "./oxlint-plugin.js" },
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "test-app/no-console-log": "error",
    },
    options: { typeAware: true, typeCheck: true },
  },
});
