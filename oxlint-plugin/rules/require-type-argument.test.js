import { describe, expect, it } from "vite-plus/test";
import { requireTypeArgument } from "./require-type-argument.js";
import {
  classImplements,
  interfaceHeritage,
  runRule,
  stringKeyword,
  typeReference,
} from "./test-utils.js";

const OPTIONS = [{ types: ["Foo"] }];
const run = (nodes, options = OPTIONS) => runRule(requireTypeArgument, nodes, options);

describe("require-type-argument", () => {
  it("reports a configured type used without a type argument", () => {
    const reports = run([typeReference("Foo")]);
    expect(reports).toHaveLength(1);
    expect(reports[0].messageId).toBe("requireTypeArgument");
    expect(reports[0].data).toEqual({ name: "Foo" });
  });

  it("allows a configured type used with a type argument", () => {
    expect(run([typeReference("Foo", [stringKeyword])])).toEqual([]);
  });

  it("ignores types that are not configured", () => {
    expect(run([typeReference("Bar")])).toEqual([]);
  });

  it("checks implements clauses", () => {
    expect(run([classImplements("Foo")])).toHaveLength(1);
    expect(run([classImplements("Foo", [stringKeyword])])).toEqual([]);
  });

  it("checks interface extends clauses", () => {
    expect(run([interfaceHeritage("Foo")])).toHaveLength(1);
    expect(run([interfaceHeritage("Foo", [stringKeyword])])).toEqual([]);
  });

  it("supports configuring several types at once", () => {
    const reports = run([typeReference("Foo"), typeReference("Baz")], [{ types: ["Foo", "Baz"] }]);
    expect(reports.map((report) => report.data.name)).toEqual(["Foo", "Baz"]);
  });

  it("registers no visitors when no types are configured", () => {
    expect(requireTypeArgument.create({ options: [] })).toEqual({});
    expect(run([typeReference("Foo")], [])).toEqual([]);
  });
});
