import { defineRule, type ESTree, type Node } from "@oxlint/plugins";

/** `["error", { types: ["Foo"] }]` — only the options object reaches the rule. */
type Options = [{ types?: string[] }?];

/**
 * Require a type argument on the configured types, so `Foo` is banned but
 * `Foo<T>` is allowed. Configure with:
 *
 *   "test-app/require-type-argument": ["error", { "types": ["Foo"] }]
 */
export const requireTypeArgument = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Require configured types to be used with a type argument.",
    },
    schema: [
      {
        type: "object",
        properties: {
          types: {
            type: "array",
            items: { type: "string" },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      requireTypeArgument: "'{{name}}' must be used with a type argument, e.g. {{name}}<T>.",
    },
  },
  create(context) {
    const [options] = context.options as Options;
    const types = new Set(options?.types ?? []);
    if (types.size === 0) return {};

    /** `type X = Foo`, `class X implements Foo`, and `interface X extends Foo`. */
    function check(node: Node & { typeArguments?: unknown }, typeName: ESTree.Node) {
      if (typeName.type !== "Identifier") return;

      const { name } = typeName;
      if (!types.has(name)) return;
      // A present-but-empty `Foo<>` is a syntax error, so existence is enough.
      if (node.typeArguments) return;

      context.report({ node, messageId: "requireTypeArgument", data: { name } });
    }

    return {
      TSTypeReference(node) {
        check(node, node.typeName);
      },
      TSClassImplements(node) {
        check(node, node.expression);
      },
      TSInterfaceHeritage(node) {
        check(node, node.expression);
      },
    };
  },
});
