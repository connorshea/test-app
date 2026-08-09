import { defineRule, type ESTree, type Scope } from "@oxlint/plugins";

/** Every identifier flavour the parser produces shares `type: "Identifier"`. */
type Identifier = Extract<ESTree.Node, { type: "Identifier" }>;

/** Loop constructs, whose bodies run more than once. */
const LOOPS = new Set([
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "WhileStatement",
]);

const FUNCTIONS = new Set(["ArrowFunctionExpression", "FunctionDeclaration", "FunctionExpression"]);

const isLoop = (node: ESTree.Node) => LOOPS.has(node.type);
const isFunction = (node: ESTree.Node) => FUNCTIONS.has(node.type);

/**
 * Whether `child` sits in the part of `loop` that re-runs. A `for` initialiser
 * and the subject of `for…of`/`for…in` are each evaluated exactly once, so a
 * pattern built there is already hoisted.
 */
function runsEachIteration(loop: ESTree.Node, child: ESTree.Node) {
  switch (loop.type) {
    case "ForStatement":
      return child !== loop.init;
    case "ForInStatement":
    case "ForOfStatement":
      return child === loop.body;
    default:
      return true;
  }
}

/**
 * Disallow building a `RegExp` from a string on every iteration of a loop.
 *
 * Compiling a pattern is the expensive part, and `new RegExp(p)` redoes it each
 * time round — hoisting the construction above the loop does the work once.
 *
 * The rule also follows one step further out: a construction in a function
 * that is called from a loop is just as hot, so calls are resolved through
 * scope analysis and chased transitively. Inline callbacks and IIFEs are
 * treated as running where they are written, so `xs.forEach(() => …)` inside a
 * loop counts as being inside that loop.
 *
 * Regex *literals* are left alone: engines cache the compiled form per source
 * position, so `/a/` in a loop costs nothing to compile.
 */
export const noRegexInLoop = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow constructing a RegExp inside a loop, or in a function called by one.",
    },
    messages: {
      noRegexInLoop:
        "Avoid constructing a RegExp inside a loop; the pattern is recompiled every iteration. Hoist it above the loop.",
      noRegexInCalledFunction:
        "Avoid constructing a RegExp in a function called from a loop; the pattern is recompiled on every call. Hoist it out of the function.",
    },
  },
  create(context) {
    const { sourceCode } = context;

    /** Constructions already known to be inside a loop. */
    const direct = new Set<ESTree.Node>();
    /** Constructions awaiting the call graph, keyed by the function holding them. */
    const deferred = new Map<ESTree.Node, ESTree.Node[]>();
    /** The functions each function calls, wherever in its body the call sits. */
    const callees = new Map<ESTree.Node, Set<ESTree.Node>>();
    /** Functions invoked from a loop; everything they reach runs per iteration. */
    const seeds = new Set<ESTree.Node>();

    /**
     * The binding an identifier resolves to, or null when it refers to a
     * predefined global.
     *
     * Oxlint seeds the global scope with a variable for each standard global,
     * so finding a binding is not enough — a predefined global carries no
     * definition, while anything the file declares does.
     */
    function lookup(id: Identifier) {
      for (let scope: Scope | null = sourceCode.getScope(id); scope; scope = scope.upper) {
        const variable = scope.set.get(id.name);
        if (variable) return variable.defs.length === 0 ? null : variable;
      }
      return null;
    }

    /** `new RegExp(…)` or `RegExp(…)`, both of which compile a fresh pattern. */
    function isRegExpConstruction(node: ESTree.CallExpression | ESTree.NewExpression) {
      const { callee } = node;
      return callee.type === "Identifier" && callee.name === "RegExp" && lookup(callee) === null;
    }

    /** The function a callee names, when the binding provably holds just that one. */
    function resolveFunction(callee: ESTree.Node): ESTree.Node | null {
      if (callee.type !== "Identifier") return null;

      const variable = lookup(callee);
      if (!variable || variable.defs.length !== 1) return null;
      // A binding written after its declaration could hold anything by call time.
      if (variable.references.some((reference) => reference.isWrite() && !reference.init)) {
        return null;
      }

      const [definition] = variable.defs;
      if (definition.type === "FunctionName") return definition.node;
      if (definition.type !== "Variable" || definition.node.type !== "VariableDeclarator") {
        return null;
      }

      const { init } = definition.node;
      return init && isFunction(init) ? init : null;
    }

    /**
     * Walk outward to find whether `node` re-runs, and failing that, which
     * function body holds it. A function that is an argument to a call — a
     * callback — or an IIFE runs where it is written, so the walk passes
     * through it rather than stopping.
     */
    function locate(node: ESTree.Node): { inLoop: boolean; fn: ESTree.Node | null } {
      // `getAncestors` is typed as returning the positional base node, which has
      // no `type` discriminant; at runtime these are ordinary AST nodes.
      const ancestors = sourceCode.getAncestors(node) as ESTree.Node[];
      let child: ESTree.Node = node;

      for (let i = ancestors.length - 1; i >= 0; i--) {
        const ancestor = ancestors[i];
        if (isLoop(ancestor) && runsEachIteration(ancestor, child)) {
          return { inLoop: true, fn: null };
        }
        if (isFunction(ancestor) && ancestors[i - 1]?.type !== "CallExpression") {
          return { inLoop: false, fn: ancestor };
        }
        child = ancestor;
      }
      return { inLoop: false, fn: null };
    }

    function recordConstruction(node: ESTree.Node) {
      const { inLoop, fn } = locate(node);
      if (inLoop) {
        direct.add(node);
        return;
      }
      // At the top level it is already built only once.
      if (!fn) return;

      const held = deferred.get(fn);
      if (held) held.push(node);
      else deferred.set(fn, [node]);
    }

    function recordCall(node: ESTree.CallExpression) {
      const target = resolveFunction(node.callee);
      if (target === null) return;

      const { inLoop, fn } = locate(node);
      if (inLoop) {
        seeds.add(target);
        return;
      }
      if (!fn) return;

      const called = callees.get(fn);
      if (called) called.add(target);
      else callees.set(fn, new Set([target]));
    }

    return {
      NewExpression(node) {
        if (isRegExpConstruction(node)) recordConstruction(node);
      },
      CallExpression(node) {
        if (isRegExpConstruction(node)) recordConstruction(node);
        recordCall(node);
      },
      "Program:exit"() {
        const flagged = new Set(direct);

        // Anything a hot function reaches is hot too; `queue` grows as we walk.
        const hot = new Set(seeds);
        const queue = [...seeds];
        for (let i = 0; i < queue.length; i++) {
          for (const node of deferred.get(queue[i]) ?? []) flagged.add(node);
          for (const next of callees.get(queue[i]) ?? []) {
            if (hot.has(next)) continue;
            hot.add(next);
            queue.push(next);
          }
        }

        // Constructions are collected out of order, so restore source order.
        const ordered = [...flagged].sort(
          (a, b) => sourceCode.getRange(a)[0] - sourceCode.getRange(b)[0],
        );
        for (const node of ordered) {
          context.report({
            node,
            messageId: direct.has(node) ? "noRegexInLoop" : "noRegexInCalledFunction",
          });
        }
      },
    };
  },
});
