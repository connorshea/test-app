import { RuleTester } from "oxlint/plugins-dev";
import { requireTypeArgument } from "./require-type-argument.ts";
import "./rule-tester-setup.ts";

const ruleTester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

/** Every test case configures the rule; unconfigured is covered separately below. */
const options = [{ types: ["Foo", "Bar"] }];

ruleTester.run("require-type-argument", requireTypeArgument, {
  valid: [
    { code: "type A = Foo<string>;", options },
    { code: "type A = Foo<string, number>;", options },
    { code: "class A implements Foo<string> {}", options },
    { code: "interface A extends Foo<string> {}", options },
    // Types that aren't configured are left alone.
    { code: "type A = Baz;", options },
    { code: "class A implements Baz {}", options },
    // A qualified name is some other namespace's `Foo`.
    { code: "type A = ns.Foo;", options },
    // Same identifier, but a value rather than a type.
    { code: "const Foo = 1;", options },
    // With nothing configured the rule reports nothing at all.
    { code: "type A = Foo;", options: [] },
    { code: "type A = Foo;", options: [{}] },
    { code: "type A = Foo;", options: [{ types: [] }] },
  ],
  invalid: [
    {
      name: "a bare type reference",
      code: "type A = Foo;",
      options,
      // Columns are 0-indexed; the span covers the type reference itself.
      errors: [{ messageId: "requireTypeArgument", line: 1, column: 9, endColumn: 12 }],
    },
    {
      name: "an implements clause",
      code: "class A implements Foo {}",
      options,
      errors: [{ messageId: "requireTypeArgument" }],
    },
    {
      name: "an interface heritage clause",
      code: "interface A extends Foo {}",
      options,
      errors: [{ messageId: "requireTypeArgument" }],
    },
    {
      name: "an annotation on a function parameter",
      code: "function f(x: Foo) {}",
      options,
      errors: [{ messageId: "requireTypeArgument" }],
    },
    {
      name: "every configured type",
      code: "type A = Foo;\ntype B = Bar;",
      options,
      errors: [
        { messageId: "requireTypeArgument", line: 1 },
        { messageId: "requireTypeArgument", line: 2 },
      ],
    },
    {
      name: "the offending name interpolated into the message",
      code: "type A = Bar;",
      options,
      errors: [{ message: "'Bar' must be used with a type argument, e.g. Bar<T>." }],
    },
    {
      name: "a bare reference nested inside a generic",
      code: "type A = Array<Foo>;",
      options,
      errors: [{ messageId: "requireTypeArgument", column: 15, endColumn: 18 }],
    },
  ],
});
