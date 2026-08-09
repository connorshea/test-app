/**
 * Custom Oxlint JS plugin for this app.
 *
 * Docs: https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.html
 * Registered via `lint.jsPlugins` in vite.config.ts; each rule lives in
 * ./rules and is unit-tested alongside its source.
 */
import { definePlugin } from "@oxlint/plugins";
import { noJsonClone } from "./rules/no-json-clone.ts";
import { noRecordStringUnknown } from "./rules/no-record-string-unknown.ts";
import { noRegexInLoop } from "./rules/no-regex-in-loop.ts";
import { requireTypeArgument } from "./rules/require-type-argument.ts";

export default definePlugin({
  meta: { name: "test-app" },
  rules: {
    "no-json-clone": noJsonClone,
    "no-record-string-unknown": noRecordStringUnknown,
    "no-regex-in-loop": noRegexInLoop,
    "require-type-argument": requireTypeArgument,
  },
});
