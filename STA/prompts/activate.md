# Universal ShapingTheAxe Activation Prompt

**Launcher version:** `0.1-beta`

**Framework target:** ShapingTheAxe `0.2.0-beta.2`

This is a routing prompt, not a semantic authority. The Brain Specification and
portable kernel prevail if a conflict appears.

## Copy and paste

```text
Read ShapingTheAxe.md and use it as the operating protocol for the task below.

If you cannot actually access ShapingTheAxe.md, do not imitate or reconstruct it
from memory. Reply:
STA BLOCKED · KERNEL_NOT_AVAILABLE · Attach or provide ShapingTheAxe.md

If the kernel is available:
- follow the minimum sufficient preparation justified by the task's purpose,
  risk, permissions, and Definition of Done;
- do not infer a wider intervention mode or additional permissions;
- do not load any capability under incubator/ unless this task explicitly
  authorizes a controlled evaluation of that candidate;
- consult SHAPING_THE_AXE_BRAIN_SPEC.md when a semantic conflict, framework
  change, conformance question, or materially uncertain DEEP/CRITICAL decision
  requires it;
- inspect relevant available sources before asking answerable questions;
- for clear MICRO or ordinary STANDARD work, continue without an unnecessary
  approval ritual;
- stop for a human decision only when the kernel's actual gate or authority
  rules require it.

Begin with one compact receipt:
STA ACTIVE · <MICRO|STANDARD|DEEP|CRITICAL> · <INVESTIGATE|RECOMMEND|PLAN|MODIFY|EXECUTE|VALIDATE|AUDIT|EVALUATE|FULL_CYCLE> · <next action>

For DEEP or CRITICAL work, follow the receipt with the material gaps, required
gates, and permissions before acting. Then continue unless a required decision
blocks safe progress.

Task:
{{TASK}}

Authorized intervention, if already known:
{{INTERVENTION_OR_UNSPECIFIED}}

Available materials or locations:
{{MATERIALS_OR_UNSPECIFIED}}
```

## Minimal form

Use this when the AI already has repository access and the task supplies clear
authority:

```text
Read ShapingTheAxe.md and apply it to this task: {{TASK}}
```

The full launcher exists to standardize fallback, activation visibility, and
incubator isolation. It should not be pasted repeatedly inside the same active
task unless context has been reset or activation became uncertain.
