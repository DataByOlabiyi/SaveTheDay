# /feature — Full Feature Workflow

Runs the PM → Planner → Designer → Engineer → Tester → Reviewer pipeline for a new feature or non-trivial change.

**This workflow runs automatically for any non-trivial change.** You only need to invoke `/feature` explicitly if the system didn't start it automatically, or if you want to restart from a specific stage.

---

## Usage

```
/feature <description of what you want to build>
```

Or just describe the feature and the workflow starts on its own.

---

## Pipeline

### Stage 1 — PM
The PM reads the request and produces a spec: user story, acceptance criteria, constraints, open questions, and out-of-scope boundaries.

**Gate**: If there are open questions, they must be answered before proceeding. Post them to the user and wait.

---

### Stage 2 — Planner
The Planner reads CLAUDE.md and every affected file, then produces an implementation plan: affected files, ordered steps, migration changes (if any), new API routes (if any), and testing plan.

**Gate**: The plan must be reviewed by the user before implementation starts. If the plan has ambiguities or the user wants changes, revise before proceeding.

---

### Stage 3 — Designer *(skip if the change has no new UI)*
The Designer specifies visual and interaction design using the existing design system: layout, states, motion, responsive behaviour, accessibility, edge cases.

**Gate**: Design is reviewed by the user. If approved, proceed; if changes requested, revise.

---

### Stage 4 — Engineer
The Engineer implements the approved plan exactly. No scope changes, no extra refactors. Reports the exact files changed when done.

---

### Stage 5 — Tester
The Tester runs `npm run test`, `npm run type-check`, and `npm run lint`. Writes new Vitest tests for any new pure functions. Produces a pass/fail report against each acceptance criterion and a security spot-check.

**Gate**: Any failing criterion or failing test blocks progression. Report issues back to the Engineer for fixes, then re-test.

---

### Stage 6 — Reviewer
The Reviewer checks the implementation against CLAUDE.md hard rules and the PM spec. Flags blockers and warnings. Issues a READY or BLOCKED verdict.

**Gate**: BLOCKED means the Engineer must fix the flagged issues and the Reviewer must re-check. READY means the workflow is complete.

---

## Completing the workflow

When the Reviewer issues READY:
- State the files changed and a one-sentence summary of what was built
- Ask the user if they want to commit
