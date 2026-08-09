import { RuleTester } from "oxlint/plugins-dev";
import { noRegexInLoop } from "./no-regex-in-loop.ts";
import "./rule-tester-setup.ts";

/**
 * `globals` matters here. The real linter runs with the standard globals seeded
 * into the global scope, but RuleTester seeds none by default — so a rule that
 * resolves `RegExp` through scope analysis takes a different branch under test
 * than in production. Declaring it keeps the two honest.
 */
const ruleTester = new RuleTester({
  languageOptions: { parserOptions: { lang: "ts" }, globals: { RegExp: "readonly" } },
});

ruleTester.run("no-regex-in-loop", noRegexInLoop, {
  valid: [
    "const re = new RegExp(p); for (const x of xs) re.test(x);",
    // Built once, outside any loop.
    "new RegExp(p);",
    "function make() { return new RegExp(p); } make();",
    // A `for` initialiser and the subject of `for…of` are evaluated once.
    "for (let i = 0, re = new RegExp(p); i < 2; i++) { re.test(xs[i]); }",
    "for (const x of [new RegExp(p)]) { x.test(s); }",
    // Literals are compiled once per source position by the engine.
    "for (const x of xs) { /a/.test(x); }",
    // Declared inside a loop but never called.
    "for (const x of xs) { function make() { return new RegExp(p); } }",
    // Called, but not from a loop.
    "function make() { return new RegExp(p); } make(); for (const x of xs) noop(x);",
    // A shadowed `RegExp` is not the global constructor.
    "function f(RegExp) { for (const x of xs) { new RegExp(p); } }",
    // Reassigned, so the call target cannot be pinned down.
    "let make = () => new RegExp(p); make = other; for (const x of xs) make();",
  ],
  invalid: [
    {
      name: "a for…of body",
      code: "for (const x of xs) { new RegExp(p).test(x); }",
      // Columns are 0-indexed; the span covers the construction itself.
      errors: [{ messageId: "noRegexInLoop", line: 1, column: 22, endColumn: 35 }],
    },
    {
      name: "a classic for body",
      code: "for (let i = 0; i < n; i++) { new RegExp(p); }",
      errors: [{ messageId: "noRegexInLoop" }],
    },
    {
      name: "a while body",
      code: "while (more) { new RegExp(p); }",
      errors: [{ messageId: "noRegexInLoop" }],
    },
    {
      name: "a do-while body",
      code: "do { new RegExp(p); } while (more);",
      errors: [{ messageId: "noRegexInLoop" }],
    },
    {
      name: "a for…in body",
      code: "for (const k in obj) { new RegExp(k); }",
      errors: [{ messageId: "noRegexInLoop" }],
    },
    {
      name: "a for condition, which is re-evaluated each iteration",
      code: "for (; new RegExp(p).test(s); ) { step(); }",
      errors: [{ messageId: "noRegexInLoop" }],
    },
    {
      name: "the call form without new",
      code: "for (const x of xs) { RegExp(p).test(x); }",
      errors: [{ messageId: "noRegexInLoop" }],
    },
    {
      name: "an inline callback, which runs where it is written",
      code: "for (const x of xs) { ys.forEach(() => new RegExp(p)); }",
      errors: [{ messageId: "noRegexInLoop" }],
    },
    {
      name: "a nested loop",
      code: "for (const x of xs) { for (const y of ys) { new RegExp(p); } }",
      errors: [{ messageId: "noRegexInLoop" }],
    },
    {
      name: "a function declaration called from a loop",
      code: "function make() { return new RegExp(p); }\nfor (const x of xs) { make(); }",
      errors: [{ messageId: "noRegexInCalledFunction", line: 1, column: 25 }],
    },
    {
      name: "an arrow bound to a const and called from a loop",
      code: "const make = () => new RegExp(p);\nfor (const x of xs) { make(); }",
      errors: [{ messageId: "noRegexInCalledFunction", line: 1 }],
    },
    {
      name: "a function reached transitively from a loop",
      code: "function inner() { return new RegExp(p); }\nfunction outer() { return inner(); }\nfor (const x of xs) { outer(); }",
      errors: [{ messageId: "noRegexInCalledFunction", line: 1 }],
    },
    {
      name: "the offending construction reported once per site, in source order",
      code: "function make() { return new RegExp(a); }\nfor (const x of xs) { make(); new RegExp(b); }",
      errors: [
        { messageId: "noRegexInCalledFunction", line: 1 },
        { messageId: "noRegexInLoop", line: 2 },
      ],
    },
    {
      name: "the full message text for a construction in a loop",
      code: "while (true) { new RegExp(pattern); }",
      errors: [
        {
          message:
            "Avoid constructing a RegExp inside a loop; the pattern is recompiled every iteration. Hoist it above the loop.",
        },
      ],
    },
    {
      name: "the full message text for a construction in a called function",
      code: "const build = () => new RegExp(pattern);\nwhile (true) { build(); }",
      errors: [
        {
          message:
            "Avoid constructing a RegExp in a function called from a loop; the pattern is recompiled on every call. Hoist it out of the function.",
        },
      ],
    },
  ],
});
