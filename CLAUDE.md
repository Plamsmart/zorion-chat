# CLAUDE.md

This repository uses **ShapingTheAxe (STA)** as its operational kernel.

Do not improvise your own workflow.
Route every material task through STA.

---

# 0. Project context

**Zorion Chat** — WhatsApp/web assistant for local SMEs. First client: **Ekin**
(CrossFit box, Irun), integrated with the AimHarder booking platform.

Stack: Next.js 16 (App Router) · TypeScript · Supabase (Postgres + RLS) ·
OpenAI · Twilio (WhatsApp). No test framework is installed yet — do not claim
tests were run.

Language: this document and the STA kernel are in English. **Code comments,
commit messages, documentation under `docs/`, and all user-facing strings are
in Spanish.** Keep it that way.

## Non-negotiable product rules

- **The LLM proposes, the code confirms.** No model output may trigger a
  booking, a cancellation, or any other side effect without code-side
  validation of the resolved entity first.
- **The assistant always identifies itself as an assistant.** It never
  pretends to be a human.
- **Multi-tenant by design.** No per-client value may be hardcoded, and no
  per-client state (tokens, credentials, config) may live in module-level
  variables. Server modules are shared across tenants at runtime.
- **Never state as fact what was not retrieved.** A failed upstream call is
  not an empty result. Degrade explicitly ("no he podido consultar el
  calendario"), never silently.
- **Never commit secrets.** `.env*` is gitignored; keep it that way.

## Definition of Done for any code change

`npm run lint` and `npm run build` must both pass. If you did not run them,
say so explicitly (see §9).

---
# 1. ShapingTheAxe — framework (governs how all material work is done)
Before material work, read and follow `STA/ShapingTheAxe.md`.
`STA/SHAPING_THE_AXE_BRAIN_SPEC.md` is the semantic authority.
Use `STA/prompts/activate.md` for the activation receipt and fallback behavior.
Use the minimum preparation justified by risk; do not add universal approval gates.
If a required file is unavailable, say so instead of claiming activation.


# 2. Capability routing

Before planning or implementing work:

1. Discover the capabilities available in this repository.
2. Reuse existing capabilities whenever possible.
3. Compose multiple capabilities when beneficial.
4. Only synthesize new capabilities if reuse is insufficient.

Follow the STA capability lifecycle:

DISCOVER → REUSE → COMPOSE → SYNTHESIZE

Never ignore an obviously applicable capability.

Examples:

- Brainstorming → exploration and design
- Backend patterns → backend implementation
- Testing strategy → verification
- Documentation → documentation tasks
- Release → packaging
- Review → evaluation
- Architecture → planning

Load only the capabilities that improve the current task.
Do not load unnecessary capabilities.

---

# 3. Skills

Available skills are **candidate capabilities, not defaults**. They are subject
to ShapingTheAxe's capability-selection rules (kernel §8): activate a skill only
when its need, suitability, permissions, cost, and expected value justify it.
Availability and prior use are not reasons by themselves.

During the task, consider whether an available skill materially fits the work,
and load only those the current task actually requires — no more. Several may
apply; that is fine, but each must earn its place. Adding an unnecessary skill
is a proportionality defect, exactly like adding an unnecessary gate.

Examples of a justified fit:
- `nodejs-backend-patterns` — when the task is a Node backend change.
- `brainstorming` — when opening up or reframing a new feature.

If no available skill materially improves the result, use none. Silence is a
valid outcome of capability selection.

---

# 4. Agents

If the repository provides agents:

- Discover them before creating new ones.
- Delegate only well-defined work.
- Keep orchestration proportional to task complexity.
- Do not create unnecessary subagents.

---

# 5. MCPs

If MCP integrations are available:

- Discover them before using external tools.
- Prefer existing integrations over manual work.
- Do not assume an MCP exists.
- Report unavailable integrations instead of inventing them.

---

# 6. Permissions

Apply the minimum preparation justified by:

- risk
- authority
- Definition of Done

Do not introduce universal approval gates.

Do not perform destructive operations without explicit authorization.

Do not load anything under `incubator/`
unless the user explicitly authorizes a controlled evaluation.

---

# 7. Repository behaviour

Respect the repository architecture.

Do not silently:

- rewrite history;
- change normative documents;
- replace existing conventions;
- invent architecture;
- bypass documented processes.

If documentation conflicts,
identify the conflict before continuing.

---

# 8. Git

When creating commits:

- create focused commits;
- use professional commit messages;
- never include:

Co-Authored-By: Claude

or any automatic attribution footer.

---

# 9. Truthfulness

Never claim:

- activation;
- execution;
- verification;
- testing;
- review;
- evidence;

unless they actually occurred.

State limitations explicitly.

Never invent files,
results,
or capabilities.

---

# 10. Handoff

Leave work in a state another engineer can continue.

Document:

- decisions;
- assumptions;
- limitations;
- evidence;
- next steps.

---

@AGENTS.md