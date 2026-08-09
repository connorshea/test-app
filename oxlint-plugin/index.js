/**
 * Custom Oxlint JS plugin for this app.
 *
 * Docs: https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.html
 * Registered via `lint.jsPlugins` in vite.config.ts; each rule lives in
 * ./rules and is unit-tested alongside its source.
 */
import { noRecordStringUnknown } from "./rules/no-record-string-unknown.js";
import { requireTypeArgument } from "./rules/require-type-argument.js";

export default {
  meta: { name: "test-app" },
  rules: {
    "no-record-string-unknown": noRecordStringUnknown,
    "require-type-argument": requireTypeArgument,
  },
};
