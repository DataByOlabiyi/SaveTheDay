# /bug-hunt — Bug Scanning Workflow

Invokes the Bug Hunter to scan the codebase (or a specific area) for real bugs, security gaps, and fragile patterns, then propose fixes one at a time.

---

## Usage

```
/bug-hunt                        # scan the full codebase
/bug-hunt app/api/               # scan a specific directory
/bug-hunt security               # focus on security gaps only
/bug-hunt auth                   # focus on auth and middleware
```

---

## How it works

1. **Bug Hunter scans** the specified scope (or full codebase if no scope given).
2. Bug Hunter presents **one finding at a time** with a proposed fix.
3. **You respond**: `yes` (apply the fix), `no` (reject it), or `skip` (move on without fixing).
4. After your response, Bug Hunter either applies the fix or moves to the next finding.
5. At the end, Bug Hunter summarizes what was fixed, skipped, and anything that needs follow-up.

---

## Focus areas (what Bug Hunter looks for)

- User input reaching the DB without `sanitizeText()` or Zod validation
- API routes missing rate limiting
- Privacy password hash leaking in responses
- Guest PII accessible via the anon client
- Missing ownership checks before writes
- Missing route guards in middleware
- Unprotected admin operations
- Non-null assertions on values that could be null in production
- Timer/subscription cleanup missing in `useEffect`
- Silent mutation failures (errors swallowed where they matter)
- Duplicated logic that has diverged

---

## Rules

- Bug Hunter proposes, you approve. No fix is applied without your explicit "yes".
- One bug per step. No batching.
- Bug Hunter does not refactor beyond the minimum change needed to fix the specific issue.
- Style issues and nice-to-haves are not reported.
