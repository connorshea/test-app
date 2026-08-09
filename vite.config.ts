import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
  fmt: {},
  lint: {
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "test-app", specifier: "./oxlint-plugin/index.js" },
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "test-app/no-record-string-unknown": "error",
      "test-app/require-type-argument": ["error", { types: ["Foo"] }],
    },
    options: { typeAware: true, typeCheck: true },
  },
});
