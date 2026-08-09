import { defineRule, type ESTree, type Scope } from "@oxlint/plugins";

/** Every identifier flavour the parser produces shares `type: "Identifier"`. */
type Identifier = Extract<ESTree.Node, { type: "Identifier" }>;

/**
 * Disallow `JSON.parse(JSON.stringify(x))` as a deep clone, in favour of
 * `structuredClone(x)`.
 *
 * The round trip serialises the whole value just to throw the string away, and
 * quietly mangles anything JSON has no syntax for: `Date` becomes a string,
 * `Map`/`Set`/`BigInt` are lost or throw, `undefined` members disappear.
 *
 * The replacement is offered as a suggestion rather than a fix because the two
 * aren't equivalent — `structuredClone` preserves `Date`, `Map`, `Set` and
 * cycles, but throws on functions, symbols, and DOM nodes, where the round trip
 * silently dropped them.
 */
export const noJsonClone = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow JSON.parse(JSON.stringify(x)); prefer structuredClone.",
    },
    hasSuggestions: true,
    messages: {
      noJsonClone:
        "Avoid deep-cloning with JSON.parse(JSON.stringify(x)). Use structuredClone(x), which keeps Date, Map, Set, and cycles intact.",
      useStructuredClone: "Replace with structuredClone().",
    },
  },
  create(context) {
    const { sourceCode } = context;

    /**
     * Whether `JSON` here is the global rather than some local binding.
     *
     * Oxlint seeds the global scope with a variable for each standard global,
     * so finding a binding is not enough — a predefined global carries no
     * definition, while anything the file declares does.
     */
    function isGlobalJson(node: Identifier) {
      for (let scope: Scope | null = sourceCode.getScope(node); scope; scope = scope.upper) {
        const variable = scope.set.get(node.name);
        if (variable) return variable.defs.length === 0;
      }
      return true;
    }

    /**
     * The sole argument of a `JSON.<name>(arg)` call, or null if this is
     * anything else. A second argument — a reviver, replacer, or `space` — makes
     * the call a transformation rather than half of a round trip.
     */
    function jsonCallArgument(node: ESTree.Node, name: string) {
      if (node.type !== "CallExpression" || node.optional) return null;

      const { callee } = node;
      if (callee.type !== "MemberExpression" || callee.computed || callee.optional) return null;
      if (callee.object.type !== "Identifier" || callee.object.name !== "JSON") return null;
      if (callee.property.type !== "Identifier" || callee.property.name !== name) return null;
      if (!isGlobalJson(callee.object)) return null;

      if (node.arguments.length !== 1) return null;
      const [argument] = node.arguments;
      // `JSON.stringify(...values)` isn't cloning a single value.
      return argument.type === "SpreadElement" ? null : argument;
    }

    return {
      CallExpression(node) {
        const parsed = jsonCallArgument(node, "parse");
        if (parsed === null) return;

        const cloned = jsonCallArgument(parsed, "stringify");
        if (cloned === null) return;

        context.report({
          node,
          messageId: "noJsonClone",
          suggest: [
            {
              messageId: "useStructuredClone",
              fix: (fixer) =>
                fixer.replaceText(node, `structuredClone(${sourceCode.getText(cloned)})`),
            },
          ],
        });
      },
    };
  },
});
