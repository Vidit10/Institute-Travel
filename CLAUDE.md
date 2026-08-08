# CoRide — agent orientation

Campus travel app for IIT Dharwad students (Next.js App Router + MongoDB/Mongoose).

**Read these first, in order:**
1. [docs/SPEC.md](docs/SPEC.md) — what the product does, and why. Living doc, updated in the
   same PR as any feature change.
2. [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — architecture, conventions, how to run
   locally/test.
3. `memory/` (if present — it's gitignored, local to this machine, not always there) — session
   continuity notes: past decisions with their reasoning, and deferred/roadmap ideas. Check it
   before re-deriving context a previous session already worked out. See
   `memory/README.md` for how it's organized. If you make a non-obvious decision or defer
   something, add a note there — don't leave it to be re-litigated from scratch next session.

Keep SPEC.md and CONTRIBUTING.md accurate as you change things — they're the actual source of
truth for anyone (human or agent) picking this codebase up next, `memory/` is just a local
accelerator on top of that.
