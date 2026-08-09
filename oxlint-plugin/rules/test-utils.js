/**
 * Minimal harness for exercising a rule's visitors directly.
 *
 * The node shapes below mirror the AST oxlint actually produces — they were
 * confirmed by running each rule against fixture TypeScript files via
 * `vp lint` before these tests were written.
 */

/** Run `rule` over `nodes`, returning everything it reported. */
export function runRule(rule, nodes, options = []) {
  const reports = [];
  const context = {
    options,
    report: (descriptor) => reports.push(descriptor),
  };
  const visitors = rule.create(context);
  for (const node of nodes) {
    visitors[node.type]?.(node);
  }
  return reports;
}

export const identifier = (name) => ({ type: "Identifier", name });

/** `Name<...args>`, or `Name` when `args` is null. */
export const typeReference = (name, args = null) => ({
  type: "TSTypeReference",
  typeName: identifier(name),
  typeArguments: args && { type: "TSTypeParameterInstantiation", params: args },
});

/** `class X implements Name<...args>` */
export const classImplements = (name, args = null) => ({
  type: "TSClassImplements",
  expression: identifier(name),
  typeArguments: args && { type: "TSTypeParameterInstantiation", params: args },
});

/** `interface X extends Name<...args>` */
export const interfaceHeritage = (name, args = null) => ({
  type: "TSInterfaceHeritage",
  expression: identifier(name),
  typeArguments: args && { type: "TSTypeParameterInstantiation", params: args },
});

export const stringKeyword = { type: "TSStringKeyword" };
export const numberKeyword = { type: "TSNumberKeyword" };
export const unknownKeyword = { type: "TSUnknownKeyword" };
