import { RuleTester } from "oxlint/plugins-dev";
import { noRecordStringUnknown } from "./no-record-string-unknown.ts";
import "./rule-tester-setup.ts";

const ruleTester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

ruleTester.run("no-record-string-unknown", noRecordStringUnknown, {
  valid: [
    "type A = Record<string, string>;",
    "type A = Record<number, unknown>;",
    "type A = Record<string, any>;",
    // Arguments in the wrong order are a different type.
    "type A = Record<unknown, string>;",
    // Another generic that happens to take the same arguments.
    "type A = Map<string, unknown>;",
    // `Record` needs exactly two arguments to be the banned type.
    "type A = Record;",
    "type A = Record<string>;",
    // A qualified name is some other namespace's `Record`.
    "type A = ns.Record<string, unknown>;",
  ],
  invalid: [
    {
      name: "a type alias",
      code: "type A = Record<string, unknown>;",
      // Columns are 0-indexed; the span covers the type reference itself.
      errors: [{ messageId: "noRecordStringUnknown", line: 1, column: 9, endColumn: 32 }],
    },
    {
      name: "an annotation on a function parameter, with the full message text",
      code: "function f(x: Record<string, unknown>) {}",
      errors: [
        {
          message:
            "Avoid Record<string, unknown>. Declare an interface or type alias with the properties you actually expect.",
        },
      ],
    },
    {
      name: "an interface property",
      code: "interface A { x: Record<string, unknown> }",
      errors: [{ messageId: "noRecordStringUnknown" }],
    },
    {
      name: "each occurrence separately",
      code: "type A = Record<string, unknown>;\ntype B = Record<string, unknown>;",
      errors: [
        { messageId: "noRecordStringUnknown", line: 1 },
        { messageId: "noRecordStringUnknown", line: 2 },
      ],
    },
    {
      name: "only the inner type when nested",
      code: "type A = Record<string, Record<string, unknown>>;",
      errors: [{ messageId: "noRecordStringUnknown", column: 24, endColumn: 47 }],
    },
  ],
});
