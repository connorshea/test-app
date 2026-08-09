import { describe, expect, it } from "vite-plus/test";
import { noRecordStringUnknown } from "./no-record-string-unknown.js";
import {
  numberKeyword,
  runRule,
  stringKeyword,
  typeReference,
  unknownKeyword,
} from "./test-utils.js";

const run = (nodes) => runRule(noRecordStringUnknown, nodes);

describe("no-record-string-unknown", () => {
  it("reports Record<string, unknown>", () => {
    const reports = run([typeReference("Record", [stringKeyword, unknownKeyword])]);
    expect(reports).toHaveLength(1);
    expect(reports[0].messageId).toBe("noRecordStringUnknown");
  });

  it("allows other Record type arguments", () => {
    expect(
      run([
        typeReference("Record", [stringKeyword, stringKeyword]),
        typeReference("Record", [numberKeyword, unknownKeyword]),
      ]),
    ).toEqual([]);
  });

  it("allows other generics with the same arguments", () => {
    expect(run([typeReference("Map", [stringKeyword, unknownKeyword])])).toEqual([]);
  });

  it("ignores Record used without type arguments", () => {
    expect(run([typeReference("Record")])).toEqual([]);
  });

  it("ignores a Record with the wrong number of arguments", () => {
    expect(run([typeReference("Record", [stringKeyword])])).toEqual([]);
  });

  it("ignores a qualified name such as ns.Record", () => {
    const qualified = typeReference("Record", [stringKeyword, unknownKeyword]);
    qualified.typeName = { type: "TSQualifiedName" };
    expect(run([qualified])).toEqual([]);
  });
});
