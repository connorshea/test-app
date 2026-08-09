/**
 * Custom Oxlint JS plugin for this app.
 *
 * Docs: https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.html
 * Registered via `lint.jsPlugins` in vite.config.ts.
 */

/** Disallow `console.log` — use `console.warn`/`console.error` if you must log. */
const noConsoleLog = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow console.log calls.",
    },
    messages: {
      noConsoleLog: "Unexpected console.log. Remove it, or use console.warn/console.error.",
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === "Identifier" &&
          node.object.name === "console" &&
          !node.computed &&
          node.property.type === "Identifier" &&
          node.property.name === "log"
        ) {
          context.report({ node, messageId: "noConsoleLog" });
        }
      },
    };
  },
};

export default {
  meta: { name: "test-app" },
  rules: { "no-console-log": noConsoleLog },
};
