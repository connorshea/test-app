import { RuleTester } from "oxlint/plugins-dev";
import { noJsonClone } from "./no-json-clone.ts";
import "./rule-tester-setup.ts";

/**
 * `globals` matters here. The real linter runs with the standard globals seeded
 * into the global scope, but RuleTester seeds none by default — so a rule that
 * resolves `JSON` through scope analysis takes a different branch under test
 * than in production. Declaring it keeps the two honest.
 */
const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" }, globals: { JSON: "readonly" } },
});

ruleTester.run("no-json-clone", noJsonClone, {
  valid: [
    "structuredClone(x);",
    "JSON.stringify(x);",
    "JSON.parse(text);",
    // Half a round trip is not a clone.
    "JSON.stringify(JSON.parse(text));",
    // A reviver, replacer, or `space` makes this a transformation.
    "JSON.parse(JSON.stringify(x), reviver);",
    "JSON.parse(JSON.stringify(x, replacer));",
    "JSON.parse(JSON.stringify(x, null, 2));",
    // Some other object that happens to have the same two methods.
    "JSON.parse(codec.stringify(x));",
    "codec.parse(JSON.stringify(x));",
    // A shadowed `JSON` is not the global one.
    "function f(JSON) { return JSON.parse(JSON.stringify(x)); }",
    "const JSON = codec; JSON.parse(JSON.stringify(x));",
    // Computed access is left alone rather than resolved.
    "JSON['parse'](JSON.stringify(x));",
    // Spreading arguments means there is no single value being cloned.
    "JSON.parse(JSON.stringify(...args));",
  ],
  invalid: [
    {
      name: "the bare round trip",
      code: "JSON.parse(JSON.stringify(x));",
      // Columns are 0-indexed; the span covers the whole outer call.
      errors: [
        {
          messageId: "noJsonClone",
          line: 1,
          column: 0,
          endColumn: 29,
          suggestions: [{ messageId: "useStructuredClone", output: "structuredClone(x);" }],
        },
      ],
    },
    {
      name: "a member expression argument, with the full message text",
      code: "const copy = JSON.parse(JSON.stringify(state.user));",
      errors: [
        {
          message:
            "Avoid deep-cloning with JSON.parse(JSON.stringify(x)). Use structuredClone(x), which keeps Date, Map, Set, and cycles intact.",
          suggestions: [
            {
              desc: "Replace with structuredClone().",
              output: "const copy = structuredClone(state.user);",
            },
          ],
        },
      ],
    },
    {
      name: "an object literal argument",
      code: "const copy = JSON.parse(JSON.stringify({ a: 1, b: [2] }));",
      errors: [
        {
          messageId: "noJsonClone",
          suggestions: [
            {
              messageId: "useStructuredClone",
              output: "const copy = structuredClone({ a: 1, b: [2] });",
            },
          ],
        },
      ],
    },
    {
      name: "a call expression argument",
      code: "JSON.parse(JSON.stringify(getState()));",
      errors: [
        {
          messageId: "noJsonClone",
          suggestions: [
            { messageId: "useStructuredClone", output: "structuredClone(getState());" },
          ],
        },
      ],
    },
    {
      name: "each occurrence separately",
      code: "const a = JSON.parse(JSON.stringify(x));\nconst b = JSON.parse(JSON.stringify(y));",
      errors: [
        { messageId: "noJsonClone", line: 1 },
        { messageId: "noJsonClone", line: 2 },
      ],
    },
    {
      name: "a round trip nested inside another",
      code: "JSON.parse(JSON.stringify(JSON.parse(JSON.stringify(x))));",
      errors: [
        { messageId: "noJsonClone", column: 0 },
        { messageId: "noJsonClone", column: 26 },
      ],
    },
  ],
});
