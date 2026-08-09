/**
 * Wire `RuleTester` up to the test runner.
 *
 * `RuleTester` binds `describe`/`it` off `globalThis` when its module is first
 * evaluated, falling back to a bare runner that swallows the test structure.
 * This project doesn't enable Vitest globals, so hand it the real functions —
 * assigning the statics is the supported path for exactly this case.
 *
 * Imported for side effects by each rule's test file. Static imports are
 * evaluated in order, so this runs before any `ruleTester.run(...)` call.
 */
import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vite-plus/test";

RuleTester.describe = describe;
RuleTester.it = it;
