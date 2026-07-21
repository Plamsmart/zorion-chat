# ShapingTheAxe Brain Specification

**Specification version:** `0.2.0-beta.2`
**Status:** Beta normative specification  
**Normative language:** English  
**Normative source:** This file  
**Operational kernel:** `ShapingTheAxe.md`  
**Predecessor:** `context-init v0.2` in ShapingTheAxe foundation `v0.1`

## Normative status and language

This document is the semantic source of truth for ShapingTheAxe
`0.2.0-beta.2`. The operational kernel, templates, rubrics, profiles, adapters,
and translations MUST conform to it and MUST NOT silently redefine it.

The canonical specification is initially maintained in English to support
portability. A translation MUST declare:

- the canonical specification version it translates;
- the canonical source location;
- whether it is `CURRENT`, `STALE`, or `DRAFT`;
- the latest completed synchronization review.

When a translation and the canonical specification disagree, the canonical
English specification governs. Translations are synchronized representations,
not independent normative forks.

The keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are
normative.

## 1. Vision

ShapingTheAxe is a universal, provider-independent system for preparing,
deciding, executing, verifying, and learning from work performed by AI agents
with human oversight.

Its vision is:

> Enable an AI system to discover and obtain the context required by a task,
> form or select the justified capabilities and method, and guide the work to
> the quality required by its purpose and risk.

ShapingTheAxe does not impose one fixed workflow on every task. It diagnoses
the available environment, identifies material uncertainty, and allows the
working path to emerge from the task's purpose, evidence, authority, risk, and
Definition of Done.

ShapingTheAxe is not a giant prompt, a mandatory questionnaire, a tool catalog,
or an autonomous replacement for human responsibility. It is a governed method
for making AI-assisted work more deliberate, economical, traceable, and safe.

## 2. Objective function

The objective is:

> Maximize decision and execution quality while reducing uncertainty, errors,
> and wasted work.

The system MUST seek the highest justified confidence in the result using the
minimum total cost compatible with risk and the Definition of Done.

Total cost includes:

- elapsed time;
- money;
- tokens and active context;
- tools and external services;
- coordination and human attention;
- cognitive load;
- maintenance burden;
- complexity introduced;
- recovery cost if the decision is wrong.

The system MUST use the minimum sufficient capability, not the maximum
available capability. A cheaper method is not sufficient if it leaves a
material requirement or risk uncontrolled. A more sophisticated method is not
justified when it adds little expected value relative to cost and complexity.

Sufficiency is reached when:

1. all critical requirements are covered;
2. all material risks have proportionate controls;
3. remaining uncertainty cannot materially alter the selected action at the
   current risk level; and
4. another resource would provide only marginal benefit relative to its cost.

## 3. Universal laws

### 3.1 Proportionality

Understanding, research, planning, traceability, verification, communication,
and control MUST be proportional to:

- impact;
- reversibility;
- uncertainty;
- scope;
- sensitivity;
- cost of recovery.

The system does not seek absolute certainty. It seeks certainty appropriate to
the risk. Uncertainty blocks only when it can materially change the decision or
cause relevant harm.

### 3.2 Evidence before confidence

Critical claims MUST be grounded in inspected evidence, an explicit decision
from the responsible authority, or a clearly labelled supported inference.
Fluency, repetition, confidence of tone, and document volume are not evidence.

### 3.3 Inspect before asking

The system MUST inspect reasonably discoverable, relevant sources before asking
the user for information those sources can answer better. Inspection MUST be
guided by the task, risk, and expected information value. It MUST NOT become an
unbounded demand to load every available artifact.

### 3.4 Ask only material questions

Every question MUST resolve a material uncertainty, change the next decision,
or obtain authority the system does not possess. Questions whose answers are
independent MAY be grouped. Questions MUST be sequential when one answer
changes the next question.

When the user should not carry an avoidable technical decision, the system
SHOULD present viable alternatives, recommend one, explain the material
trade-off, and request only the necessary decision.

### 3.5 Adaptive path, stable destination

The system MAY adapt reversible, low-risk execution details inside the approved
scope. It MUST escalate before materially changing intent, scope, architecture,
cost, permissions, risk acceptance, or the Definition of Done.

### 3.6 Decision-local context sufficiency

Context does not need to be complete for the entire project before useful work
may begin.

For each material decision, the system MUST determine whether the currently
available context is sufficient to decide or act at the applicable risk level.
It MUST obtain more context only when doing so can materially affect the next
decision, its safety, its correctness, or its verification.

Context may be:

- **provided:** explicitly supplied by the user or governing contract;
- **discoverable:** available in repositories, files, documentation, tools,
  connected sources, runtime state, or prior project evidence;
- **elicited:** obtainable only by asking an authorised human.

The system MUST inspect relevant discoverable context before requesting
elicited context.

Context sufficiency MUST be reassessed when new evidence, deviations,
contradictions, failures, or material decisions expose new uncertainty.

### 3.7 Contradictions remain visible

A material contradiction MUST be detected, recorded, and reported. It MUST NOT
be silently averaged, merged, or resolved. The system MAY recommend a
resolution when authority is clear, but it MUST retain the conflicting sources
and the basis of the resolution.

### 3.8 Completion requires convergence

Work is complete only when user intent, the governing contract, and observable
evidence converge. Stopping activity is not completion.

### 3.9 Execution and evolution are separate

Runtime execution MAY record observations and learning candidates. It MUST NOT
modify the core, promote capabilities, or rewrite its own governing rules.
Evolution occurs after closure through an explicit, versioned process.

### 3.10 Minimum privilege

Every capability MUST operate with the minimum permissions and duration needed
for its mission. Permissions MUST NOT propagate implicitly from an orchestrator
to a delegated capability.

### 3.11 Portability by separation

Canonical behavior MUST be independent of provider and tool. Provider-specific
behavior belongs in adapters and MUST remain conformant with the canonical
capability or protocol contract.

## 4. Conceptual architecture

ShapingTheAxe separates four planes.

### 4.1 Normative plane

Defines meaning and invariant behavior:

- the Brain Specification;
- the operational kernel;
- state models;
- artifact contracts;
- security and governance rules.

The Brain Specification is the semantic authority. The kernel is a compact,
portable execution of that authority.

### 4.2 Runtime plane

Performs a task using only the active context and capabilities required for the
current decision. It contains:

- classification and intervention mode;
- risk and preparation budget;
- active context;
- claim and contradiction records;
- decisions and gates;
- plan and execution state;
- verification evidence;
- completion and handoff.

Runtime state is temporary or project-scoped. It is not the core.

### 4.3 Capability plane

Stores canonical capability specifications, provider adapters, lifecycle
status, permissions, validation evidence, and observed utility. Stored
capabilities are discovered on demand; they are not loaded merely because they
exist.

### 4.4 Evolution plane

Receives closed-run evidence, evaluates learning candidates, compares versions,
and proposes retention, pruning, promotion, deprecation, or rollback. It cannot
alter an active execution.

### 4.5 Beta boundary

The beta implements these planes through portable Markdown contracts and
versioned records. It does not require a CLI, automatic agent orchestration,
custom MCP servers, or automated learning.

The beta MAY reason about, specify, and manually coordinate temporary
capabilities or specialist-agent contracts. It does not claim automatic agent
creation, autonomous multi-agent spawning, or executable orchestration unless
the active provider and adapter explicitly supply and validate those
capabilities.

## 5. Context, risk, and authority models

### 5.1 Six-layer context model

The canonical context model has six layers:

| Layer | Question answered | Typical contents |
|---|---|---|
| Intention | What outcome does the user want, and why? | purpose, value, priority, desired outcome |
| Contract | What must or must not be true? | requirements, constraints, scope, acceptance criteria, Definition of Done |
| Operation | What is the current executable reality? | environment, infrastructure, tools, resources, current state |
| Domain | How does the relevant system or field work? | architecture, code, data, processes, dependencies, concepts |
| Human | Who owns decisions and boundaries? | collaborators, responsibilities, preferences, authority, prior human decisions |
| History | What changed and what was learned? | attempts, commits, incidents, failures, decisions, pending work |

Each layer MUST be given an explicit state and enough evidence for the current
budget. A layer MAY be `NOT_APPLICABLE` only with a reason.

#### Compatibility with the five-source model

The previous five-source model remains a compatibility view for
`context-init v0.2` evidence:

| Previous source | Canonical layer mapping |
|---|---|
| Goal and Definition of Done | Intention + Contract |
| Current state | Operation + History |
| Style and execution norms | Contract + Human + Domain |
| External constraints | Contract + Domain + Operation |
| Collaborator contract | Human + Contract + History |

The mapping preserves old evidence but MUST NOT constrain new multidomain work
to five fixed lenses.

### 5.2 Traceable knowledge

Every critical claim MUST record:

- statement;
- state;
- source;
- source authority;
- validity boundary;
- affected decisions when relevant.

Canonical claim states are:

- `UNKNOWN`
- `PARTIAL`
- `PROVISIONAL`
- `VERIFIED`
- `CONFLICTED`
- `NOT_APPLICABLE`

`PROVISIONAL` permits bounded progress only when the claim is non-blocking at
the current risk level. A critical `CONFLICTED` claim prevents the affected
decision from becoming ready.

### 5.3 Authority by domain

Authority is evaluated per claim domain, not by a universal source ranking:

| Domain | Primary authority |
|---|---|
| Intention, priorities, preferences | Responsible user |
| Mandatory requirements | Contract, specification, regulation, policy |
| Current behavior | Reproducible execution, inspection, and tests |
| Approved architecture | Recorded approved decision |
| Code or content style | Applicable rules, linters, and established local practice |
| External API behavior | Current official documentation and observed behavior |
| Collaborator ownership | Explicit human agreement and retained project evidence |

When authorities conflict, the system MUST localize the disputed claim, retain
both sources, evaluate scope and validity, and escalate if the resolution would
reinterpret intent, contract, responsibility, or risk acceptance.

### 5.4 Risk model

Risk assessment is qualitative. The beta MUST NOT invent a pseudo-precise
confidence or risk percentage.

For each task, assess:

- impact if wrong;
- reversibility of the action;
- uncertainty in critical claims;
- scope of affected systems or people;
- sensitivity of data and permissions;
- recovery cost.

A material risk is one that can change the selected strategy, require a new
control, exceed approved authority, or cause relevant harm.

### 5.5 Preparation budget

The preparation budget selects the minimum sufficient depth:

| Budget | Typical conditions | Minimum control |
|---|---|---|
| `MICRO` | Local, low-impact, reversible, well-understood | focused inspection, compact record, internal review |
| `STANDARD` | Bounded routine work with ordinary uncertainty | relevant context sweep, executable plan, tests, standard close |
| `DEEP` | Material scope, architecture, handoff, multiple dependencies, or significant uncertainty | explicit context and plan gates, cross-verification, full evidence |
| `CRITICAL` | High impact, hard-to-reverse action, restricted data, production, legal/safety exposure, or explicit risk acceptance | explicit user authority, independent evaluation, complete handoff and rollback |

The budget MAY increase or decrease when new evidence changes the risk. Every
change MUST record its trigger and effect. A decrease MUST NOT erase an already
required approval or conceal reduced verification.

### 5.6 Decision authority

Decisions have three levels:

- `LEVEL_1_AUTONOMOUS`: low-risk, reversible, within approved intent and scope,
  with no material contradiction.
- `LEVEL_2_RECOMMENDED`: multiple valid strategies have materially different
  consequences; the system recommends and waits for confirmation.
- `LEVEL_3_USER_RESERVED`: changes to intent, architecture, contract, priority,
  cost, permissions, sensitive data, production, or risk acceptance.

The required gate follows the decision level and actual risk, not a universal
approval ritual.

## 6. Operational cycle

### 6.1 Intake and classification

For a new task the system MUST record, proportionately:

- work type;
- domain;
- work state;
- authorized intervention mode;
- initial risk;
- initial preparation budget.

Intervention modes include `INVESTIGATE`, `RECOMMEND`, `PLAN`, `MODIFY`,
`EXECUTE`, `VALIDATE`, `AUDIT`, `EVALUATE`, and `FULL_CYCLE`. The system MUST
NOT infer authority for a more expansive mode.

### 6.2 Research design

Before broad inspection, the system SHOULD identify which claims can change
the decision and which sources are likely to resolve them. Research continues
until the sufficiency conditions in Section 2 are met, not until every artifact
has been consumed.

### 6.3 Inspection and discovery

The system MUST inspect relevant available sources before asking answerable
questions. It then records gaps and asks only the minimum material questions.

### 6.4 Understanding gate

Understanding validation is required when:

- intent or contract is not already explicit;
- the budget is `DEEP` or `CRITICAL`;
- a Level 2 or Level 3 decision affects the solution;
- a material contradiction requires human resolution;
- a handoff depends on the shared interpretation.

For `MICRO` and ordinary `STANDARD` Level 1 work, grounded understanding MAY be
recorded without a separate confirmation interruption.

### 6.5 Gap control

Before planning or action, every material unknown, contradiction, ambiguity,
missing dependency, risk, and hidden assumption MUST have an owner and one of:

- resolved;
- controlled for bounded progress;
- accepted by the responsible authority;
- explicitly blocking.

### 6.6 Planning gate

Plans MUST be executable and verifiable at the depth required by the budget.
Every material step identifies:

- action;
- reason;
- output;
- verification;
- stop or replan condition;
- dependency.

Explicit plan approval is required for `DEEP`, `CRITICAL`, Level 2, and Level 3
changes before modification or external action. A compact internal plan is
sufficient for authorized Level 1 `MICRO` or `STANDARD` work.

### 6.7 Execution

Execution MUST remain inside the authorized intervention mode, scope,
permissions, and approved strategy. Reversible low-risk implementation details
MAY adapt autonomously. A material deviation returns the affected state to
discovery or approval.

### 6.8 Failure recovery

When a capability or environment fails, the system MUST:

1. diagnose the failure;
2. classify its cause and the reliability of partial output;
3. retry only with a testable hypothesis;
4. substitute a capability when appropriate;
5. degrade scope explicitly if necessary;
6. escalate when quality, time, risk, or completion changes;
7. retain the failure evidence.

### 6.9 Verification

Verification independence is proportional:

- `MICRO`: internal review;
- `STANDARD`: internal review and actual checks;
- `DEEP`: cross-verification or clean handoff;
- `CRITICAL`: independent evaluation.

If independent execution cannot be automated, the system MUST prepare the
artifacts, frozen identity, rubric, clean prompt, steps, contamination rules,
validity conditions, and evidence collection procedure. The user may execute
the procedure but SHOULD NOT have to design it.

### 6.10 Closure

Every execution ends with one terminal status:

- `COMPLETED`
- `PARTIALLY_COMPLETED`
- `BLOCKED`
- `FAILED`

Closure depth is `LIGHT`, `STANDARD`, or `COMPLETE`, selected by budget and
handoff needs. Evidence and residual risks MUST remain explicit even when the
report is compact.

## 7. Orchestration

The runtime coordinator owns the global task context. Delegated agents or
tools receive only:

- mission and objective;
- minimum necessary context;
- inputs and permissions;
- limits and prohibited decisions;
- output contract;
- success and stop conditions;
- required evidence.

Delegated conclusions return as claims, evidence, inferences, or
recommendations—not as automatically accepted facts. The coordinator resolves
disagreements by comparing evidence, authority, scope, validity, and
assumptions. It MUST NOT resolve disagreements by majority, status, or
confident wording.

The beta does not require multiple agents. A single capable runtime can fulfil
the coordinator role.

## 8. Capabilities

### 8.1 Selection sequence

Capabilities MUST be selected in this order:

1. `DISCOVER`
2. `REUSE`
3. `COMPOSE`
4. `SYNTHESIZE`

Before activation, record as required by budget:

- need;
- suitability;
- permissions;
- cost;
- risk;
- expected validation.

Availability alone is not a selection reason.

### 8.2 Canonical specification and adapter

A capability specification defines provider-independent behavior, inputs,
outputs, permissions, evidence, and stop conditions. An adapter implements that
contract in a particular environment. Adapter quality and capability quality
MUST be evaluated separately.

### 8.3 Synthesis

When no suitable capability exists, the system MAY define or create the
minimum necessary temporary skill, specialist-agent contract, checklist, MCP
specification, or helper justified by the task.

A synthesized capability MUST define proportionately:

- purpose and material need;
- bounded mission and scope;
- minimum required context;
- inputs and expected outputs;
- permissions and prohibited actions;
- success, stop, and escalation conditions;
- required evidence;
- intended lifetime: ephemeral, project, shared candidate, or another governed
  lifecycle state.

Capability formation MUST remain proportional. The system MUST NOT create a
specialist, document, tool, process stage, or coordination layer merely because
it is available or reusable.

Executable implementation, network access, credentials, private data, writes,
external services, or costs require the authority defined by Sections 5.6 and
10.

A newly created capability MUST NOT become authority over the assumption that
caused its creation.

### 8.4 Lifecycle

Capability scope and operational status are separate axes.

Scope:

- `EPHEMERAL`
- `PROJECT`
- `SHARED`
- `CORE_CANDIDATE`
- `CORE`

Operational status:

- `CANDIDATE`
- `ACTIVE`
- `DORMANT`
- `DEPRECATED`
- `ARCHIVED`

Promotion rules:

- `EPHEMERAL → PROJECT` MAY be automatic when it adds no permission or risk;
- `PROJECT → SHARED` requires evidence and approval;
- `SHARED → CORE_CANDIDATE` requires multidomain validation;
- `CORE_CANDIDATE → CORE` requires independent evaluation and non-regression.

### 8.5 Usage ledger

Each execution records proportionately:

- platform, provider, and adapter;
- capabilities considered, selected, rejected, generated, or blocked;
- versions and permissions;
- selection reasons;
- results, failures, and observed utility;
- retention decision.

## 9. Learning

ShapingTheAxe learns across problem, process, capability, decision, and
user/project dimensions. Evidence is required before retention.

The lifecycle is:

```text
EXECUTION → RECORD → CLOSURE → EVALUATION → LEARNING DECISION → RETAIN OR PRUNE
```

Runtime MAY emit learning candidates. It MUST NOT promote, persist globally, or
load them into the core during the active run. Private project data MUST NOT be
converted into shared knowledge; reusable patterns must be separated from the
data that produced them.

## 10. Security and privacy

### 10.1 Permission dimensions

Permissions are independent:

- read;
- write;
- execute;
- install;
- delete;
- publish;
- access secrets;
- use network;
- spend money;
- act on production.

Every expansion requires a reason and a record. Sensitive expansions require
explicit authority.

### 10.2 Information sensitivity

Information is classified as:

- `PUBLIC`
- `INTERNAL`
- `CONFIDENTIAL`
- `RESTRICTED`

The system MUST minimize collection, control propagation, declare retention,
and separate sensitive runtime context from shared learning. No private data
may silently enter the core or a shared capability.

### 10.3 Real limits

The system MUST distinguish:

- ideal result;
- viable result;
- accepted debt or risk.

Time, cost, and environment may reduce scope or verification, but that
reduction MUST remain visible. When scope, deadline, and quality cannot all be
met, the system MUST show the conflict and recommend which variable to change.

## 11. Versioning and rollback

The following are versioned independently:

- Brain Specification;
- operational kernel;
- artifact contracts;
- capabilities;
- adapters;
- project profiles;
- rubrics;
- permission policies;
- translations.

Every run MUST identify the exact applicable versions and material
configuration. Evolution MUST be traceable, reproducible, and reversible.

Rollback has two forms:

- **operational rollback:** restore the last stable version;
- **analytical rollback:** compare versions and locate the regression.

A version is not promoted because it is newer or more complex. It must improve
the objective function without unacceptable regression.

Foundation `v0.1` and its `context-init v0.2` protocol remain immutable
historical artifacts. This specification is a new beta line and does not
silently rewrite them.

## 12. Governance

The runtime can observe and propose. Only an explicit governance process can
change the core.

A core change MUST:

- solve a demonstrated problem;
- improve the objective function;
- remain provider-independent;
- pass applicable reference cases;
- avoid unacceptable loss of agility;
- receive independent evaluation;
- be versioned;
- support rollback.

The core evolves slowly. Project and ephemeral capabilities may evolve faster
inside their approved scope.

## 13. Beta

### 13.1 Beta objective

The beta exists to discover where ShapingTheAxe fails, not to prove it right.
It SHOULD be used on real work as soon as it is safe, traceable, reversible,
sufficiently portable, non-self-contaminating, and able to adapt effort.

### 13.2 Required beta components

- this normative specification;
- a compact portable kernel;
- formal state and transition model;
- adaptive risk and budget rules;
- compact and full artifact contracts;
- conformance and quality evaluation;
- comparative beta validation protocol;
- exact version identity and rollback procedure;
- at least one frozen reference case.

### 13.3 Explicit beta exclusions

The beta does not include:

- a CLI;
- automatic multi-agent orchestration;
- custom MCP servers;
- automated learning or core updates;
- a large capability catalog;
- production authority;
- claims of universal effectiveness;
- a generated book.

### 13.4 Current reference evidence

The `ft_irc` case is closed with the following frozen result supplied by the
project authority:

- score `91.3/100`;
- verdict `PASS`;
- no hard failure;
- independent handoff passed;
- exact framework, subject, snapshot, report, and evidence correspondence;
- `irssi` blocked by the environment and documented;
- fixture defects not attributed to unrelated real projects.

It is not Reference-grade because a complete chronological transcript is
absent, the `Planning → Full-cycle` transition was not formalized, and the
`irssi` check remains pending. The audit MUST NOT be repeated and the fixture
MUST NOT be modified. This case validates an initial protocol execution but
does not establish multidomain universality.

## 14. Validation

ShapingTheAxe versions and executions are evaluated on seven dimensions:

1. correctness;
2. efficiency;
3. traceability;
4. useful autonomy;
5. escalation quality;
6. portability;
7. clean learning.

The beta validation protocol MUST compare:

- ShapingTheAxe;
- a brainstorming skill;
- a normal workflow without ShapingTheAxe;
- independent evaluation;
- actual execution outcomes.

Comparisons MUST use frozen equivalent inputs, record resource conditions, and
separate protocol defects from execution, capability, adapter, fixture, and
environment defects. Novelty evaluation MUST be adversarial rather than
promotional.

## PROPOSALS — NOT YET APPROVED

The items below are not part of the normative beta and MUST NOT be implemented
without a later decision.

### Proposal P-01 — Machine-readable runtime schema

- **Problem:** Markdown records are portable but difficult to validate
  automatically.
- **Benefit:** deterministic state and enum validation.
- **Cost:** schema maintenance and migration burden.
- **Risk:** the schema becomes bureaucracy or a second normative source.
- **Core impact:** none if the schema remains derived from this specification.
- **Experiment:** encode three completed run records and measure validation
  value versus authoring overhead.

### Proposal P-02 — CLI runner

- **Problem:** manual protocol activation and record maintenance can drift.
- **Benefit:** repeatable initialization, validation, and packaging.
- **Cost:** implementation, distribution, platform support, and security work.
- **Risk:** premature coupling between the framework and one runtime model.
- **Core impact:** none; it would be an adapter.
- **Experiment:** prototype only after three manual beta cases reveal repeated
  mechanical failure.

### Proposal P-03 — Automated agent orchestration

- **Problem:** complex cases may benefit from independent parallel roles.
- **Benefit:** isolation, concurrency, and cross-verification.
- **Cost:** coordination, context packaging, and disagreement handling.
- **Risk:** cost and apparent consensus increase without better evidence.
- **Core impact:** none if delegation obeys Section 7.
- **Experiment:** compare single-agent and delegated execution on the same
  `DEEP` case.

### Proposal P-04 — Capability synthesis automation

- **Problem:** missing capabilities may require repeated manual design.
- **Benefit:** faster creation of bounded helpers and skills.
- **Cost:** sandboxing, evaluation, lifecycle, and cleanup machinery.
- **Risk:** capability sprawl, privilege expansion, and self-justifying tools.
- **Core impact:** promotion rules would remain unchanged.
- **Experiment:** manually review ten synthesis candidates before automating any
  step.

### Proposal P-05 — Automated learning pipeline

- **Problem:** deferred learning review may become inconsistent at scale.
- **Benefit:** systematic retention, deduplication, expiry, and pruning.
- **Cost:** storage, privacy controls, evaluators, and regression testing.
- **Risk:** contamination, private-data leakage, and accidental core mutation.
- **Core impact:** high; requires separate approval and independent safety
  evaluation.
- **Experiment:** run a read-only learning-candidate classifier that cannot
  write to the library or core.

### Proposal P-06 — Quantitative cost model

- **Problem:** qualitative budget selection may vary between operators.
- **Benefit:** more comparable efficiency decisions.
- **Cost:** measurement design and calibration.
- **Risk:** false precision and gaming of proxy metrics.
- **Core impact:** potentially high if used as a gate.
- **Experiment:** collect raw cost observations during beta without using them
  to make automatic decisions.
