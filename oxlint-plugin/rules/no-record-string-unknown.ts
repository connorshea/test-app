import { defineRule } from "@oxlint/plugins";

/** Disallow `Record<string, unknown>` — declare an explicit shape instead. */
export const noRecordStringUnknown = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow the Record<string, unknown> type.",
    },
    messages: {
      noRecordStringUnknown:
        "Avoid Record<string, unknown>. Declare an interface or type alias with the properties you actually expect.",
    },
  },
  create(context) {
    return {
      TSTypeReference(node) {
        if (node.typeName.type !== "Identifier" || node.typeName.name !== "Record") return;

        const params = node.typeArguments?.params;
        if (params?.length !== 2) return;
        if (params[0].type === "TSStringKeyword" && params[1].type === "TSUnknownKeyword") {
          context.report({ node, messageId: "noRecordStringUnknown" });
        }
      },
    };
  },
});
