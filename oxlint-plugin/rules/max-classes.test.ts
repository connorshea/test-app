import { RuleTester } from "oxlint/plugins-dev";
import { maxClasses } from "./max-classes.ts";
import "./rule-tester-setup.ts";

const ruleTester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

ruleTester.run("max-classes", maxClasses, {
  valid: [
    "class A {}",
    // Exactly at the limit.
    "class A {} class B {} class C {} class D {} class E {}",
    // Expressions are not declarations, so they never count.
    "const a = class {}; const b = class {}; const c = class {}; const d = class {}; const e = class {}; const f = class {};",
  ],
  invalid: [
    {
      name: "the sixth declaration",
      code: "class A {} class B {} class C {} class D {} class E {} class F {}",
      // Columns are 0-indexed; the span covers the whole class declaration.
      errors: [{ messageId: "maxClasses", line: 1, column: 55, endColumn: 65 }],
    },
    {
      name: "only once, however far past the limit",
      code: "class A {} class B {} class C {} class D {} class E {} class F {} class G {}",
      errors: [{ messageId: "maxClasses", column: 55 }],
    },
    {
      name: "the limit interpolated into the message",
      code: "class A {} class B {} class C {} class D {} class E {} class F {} class G {} class H {}",
      errors: [{ message: "Too many classes in this file; at most 5 are allowed." }],
    },
    {
      name: "exported and nested declarations, which still count",
      code: "export class A {} export class B {} class C {} function f() { class D {} } class E {}\nclass F {}",
      errors: [{ messageId: "maxClasses", line: 2 }],
    },
  ],
});
