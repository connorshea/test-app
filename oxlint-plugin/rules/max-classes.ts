import { defineRule } from "@oxlint/plugins";

/** Class declarations allowed per file, past which the rule reports. */
const LIMIT = 5;

/**
 * The worked example from the oxlint docs, kept as a reference for how a
 * stateful rule is written:
 * https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.html
 *
 * `classCount` lives in the `create` closure, so it only resets between files
 * because oxlint calls `create` once per file. The docs also show a
 * `createOnce` form, which is called a single time for the whole run and so has
 * to reset the counter itself in a `before` hook — that form needs the plugin
 * wrapped in `eslintCompatPlugin`, which this one is not.
 *
 * Only declarations count, so `const A = class {}` is ignored, and the report
 * fires once on the class that crosses the limit rather than on every one after
 * it.
 */
export const maxClasses = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: `Disallow more than ${LIMIT} class declarations in a single file.`,
    },
    messages: {
      maxClasses: "Too many classes in this file; at most {{limit}} are allowed.",
    },
  },
  create(context) {
    let classCount = 0;

    return {
      ClassDeclaration(node) {
        classCount++;
        if (classCount === LIMIT + 1) {
          context.report({ node, messageId: "maxClasses", data: { limit: LIMIT } });
        }
      },
    };
  },
});
