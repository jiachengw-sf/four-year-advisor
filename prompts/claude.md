# Claude Guidance — Hackathon-Minimal Agent Development

## Purpose

This file tells Claude how to interpret and work with the agent documents in this `prompts/` directory.

The existing prompt documents describe the intended product direction, agent responsibilities, research standards, integrations, and future capabilities. They are not all equally complete, and not every described capability must be implemented for the hackathon.

Your job is to preserve the long-term vision while building the smallest honest end-to-end system that demonstrates the core product claim.

## Project context

The project is a four-year personal advisor for college students. Five agents contribute to one shared student model:

- Input Agent
- Knowledge Retrieval Agent
- Opportunity Research Agent
- Learning Patterns Agent
- Advisor Agent

The agents run through Superhuman Go and do not directly communicate with each other or directly write to the database. The website provides each agent with an `Agent context` JSON block. The agent returns structured JSON, which the website validates and stores in the Supabase `agent_outputs` blackboard.

The hackathon demo must prove this loop:

1. Student information creates an initial profile.
2. Agents produce personalized learning and career recommendations.
3. Student activity creates a new event.
4. The student model changes.
5. The Advisor produces a changed plan.
6. The system explains what changed and why.

## How to read the prompt documents

Treat every prompt document as a combination of:

1. Product requirements
2. Agent boundaries
3. Long-term architecture
4. Safety and evidence requirements
5. Possible future capabilities

Do not assume every paragraph is an immediate implementation requirement.

Before implementing or editing an agent:

1. Read the relevant prompt document.
2. Read `../docs/agent-contracts.md`.
3. Read `../db/schema.sql`.
4. Read the corresponding sample in `../samples/`.
5. Read relevant seed data in `../seed/`.
6. Identify the minimum behavior required for the end-to-end demo.
7. Identify any conflict between the prompt, contract, schema, sample, and available tools.
8. Preserve compatibility unless the user explicitly authorizes a coordinated contract change.

When a detailed prompt describes a capability that the repository, tools, contract, or timeline cannot currently support, do not pretend it is implemented. Classify it as deferred and describe the limitation clearly.

## Hackathon development principles

### 1. End-to-end integration over isolated sophistication

A basic working chain is more valuable than one extremely sophisticated agent that cannot pass its output downstream.

Prioritize:

- Valid inputs
- Valid JSON outputs
- Canonical IDs
- Reliable handoffs
- Advisor consumption
- Visible dashboard changes

Do not add prompt complexity that does not improve the complete demo flow.

### 2. Functional minimalism

Implement the smallest function that proves the intended behavior.

Every function, field, branch, integration, and prompt rule should answer at least one of these questions:

- Is it necessary for the demo persona?
- Is it required by the current contract?
- Is it consumed by another agent or the dashboard?
- Does it protect against a likely failure or fabrication?
- Does it demonstrate the closed learning loop?

If the answer is no, defer it.

Avoid:

- Unused abstractions
- Speculative database tables
- Unconsumed output fields
- Duplicate calculations
- Provider-by-provider integrations
- Complex scoring systems without test data
- Broad ontology expansion
- Features that cannot appear in the demo

### 3. Honest limitations

Never claim that a capability exists when it has not been implemented or connected.

Examples:

- Do not claim to access LinkedIn from a URL unless an authorized tool can retrieve it.
- Do not claim Canvas or Gradescope synchronization without a working integration.
- Do not claim a source was searched when it was inaccessible.
- Do not invent current opportunities, alumni details, deadlines, URLs, grades, or assessment evidence.
- Do not imply that an aspirational specification is already supported by the website.

Use explicit labels where useful:

- `available`
- `limited`
- `demo_only`
- `deferred`
- `unavailable`
- `requires_integration`

Missing information should remain unknown. Unsupported functionality should become a documented follow-up, not fabricated output.

### 4. Preserve long-term intent without implementing it prematurely

Do not delete valuable future requirements merely because they are outside the hackathon scope.

Instead, separate requirements into:

- MVP behavior
- Demo fallback
- Post-hackathon extension

When simplifying an implementation, preserve a clean boundary that allows later expansion.

For example:

- Accept pasted transcript text now; add transcript parsing later.
- Use seeded opportunities now; add live opportunity retrieval later.
- Use public accessible alumni pages now; add authorized professional-data integrations later.
- Use seeded events now; add LMS integrations later.

## Current MVP interpretation by agent

### Input Agent

For the hackathon, prioritize:

- Resume text
- One essay or personal statement
- Basic student metadata
- Seeded canonical skill catalog
- Evidence-backed starting skill estimates
- Low-confidence verification nodes

Defer unless already implemented:

- Live LinkedIn retrieval
- Canvas integration
- Gradescope integration
- Full international curriculum normalization
- Complete question-level assessment analysis
- New permanent ontology creation

The Input Agent should extract and map evidence. Deterministic application code should own numerical updates whenever possible.

### Knowledge Retrieval Agent

For the hackathon, prioritize:

- At most three important learning gaps
- Prerequisite checks
- Two or three useful resources per gap
- Personal time estimates
- Concrete milestones
- Mastery verification
- Consumption of Opportunity Agent handoffs

Do not search every listed platform independently. Use accessible, high-quality sources appropriate to the target node and student level.

### Opportunity Research Agent

For the hackathon, prioritize:

- Proactive career questions
- Relevant, publicly verifiable Berkeley alumni evidence
- Recent graduates before older alumni
- Current opportunity or career-requirement corroboration
- Exactly five insights for a new student
- Exactly three new or materially updated insights for a returning student
- Follow-ups for relevant unresolved previous insights
- Advisor planning signals
- Canonical skill-gap handoffs to Knowledge Retrieval

Use only accessible public evidence. Do not infer sensitive background characteristics. Do not recommend a specific person's path as the only correct path.

If live research is unreliable for the demo, use a clearly labeled, pre-verified golden research result. Do not present fictional data as live research.

### Learning Patterns Agent

For the hackathon, prioritize:

- Check-ins
- Quiz results
- Resource feedback
- Evidence-backed observations
- Bounded skill deltas
- Pace observations
- Method-effectiveness observations
- Two or three personalized tips

Keep mastery, confidence, pace smoothing, decay, and prerequisite propagation in deterministic application code.

The agent may interpret and explain evidence, but it should not become the source of truth for arithmetic.

### Advisor Agent

For the hackathon, prioritize:

- Three to five weekly plan items
- Weekly-hour cap
- Deadline awareness
- Academic and career conflict resolution
- Traceability to upstream outputs
- A clear `what_changed` explanation

The Advisor must not invent new research, skills, mastery values, deadlines, or student constraints. It should combine and prioritize grounded upstream information.

## Contract-first implementation

The current website validates agent output against `../docs/agent-contracts.md`.

Before expanding an output:

1. Confirm that the website consumes the new field.
2. Confirm that the validator permits it.
3. Confirm that the downstream agent understands it.
4. Confirm that the sample output demonstrates it.

Do not silently make one agent incompatible with the rest of the system.

When the requested behavior exceeds the current contract, choose one of these approaches:

1. Preserve the current required fields and add backward-compatible optional fields.
2. Propose a versioned contract migration and wait for authorization before changing shared components.

Prefer backward-compatible additions during the hackathon.

## Shared implementation rules

All runtime agent outputs should:

- Use the correct `agent` identifier.
- Use canonical `node_id` values from the seed catalog.
- Use existing `opportunity_id` values when referencing seeded opportunities.
- Use ISO dates.
- Use values from 0 to 1 where the contract requires normalized scores.
- End with exactly one valid fenced JSON block when required by the bridge.
- Avoid comments and trailing commas inside JSON.
- Record consumed handoffs.
- Include reasons for recommendations.
- Return warnings or partial results instead of fabricating missing information.

## Deterministic code versus LLM responsibilities

Use application code for:

- Mastery updates
- Confidence updates
- Pace calculations
- Priority formulas
- Deadline calculations
- Weekly-hour limits
- Plan-hour totals
- Decay
- Prerequisite propagation
- JSON schema validation

Use agents for:

- Evidence extraction
- Semantic mapping
- Research
- Comparison
- Explanation
- Personalized reasoning
- Advice generation
- Summarizing why a plan changed

The rule is: agents interpret and explain; code calculates and validates.

## Scope-control process

Before implementing a requested feature, classify it:

### Must have

Required for the main three-minute demo or an existing contract.

### Should have

Improves the demo but has a safe fallback.

### Could have

Useful after the core chain works.

### Deferred

Requires unavailable integrations, major schema changes, extensive data collection, or uncertain research.

Implement all must-haves before should-haves. Do not begin could-haves while an end-to-end handoff remains broken.

## Demo-safe fallback strategy

The project may use precomputed golden outputs when a live model or public search fails.

Golden outputs must:

- Match the same schema as live outputs.
- Be clearly labeled internally as demo fallback data.
- Use the same student, skills, events, and opportunities as the live scenario.
- Avoid fabricated claims presented as current verified facts.
- Preserve the same downstream handoffs.

The fallback should demonstrate reliability, not conceal an incompatible implementation.

## Editing rules

When asked to change the repository:

1. Inspect the current file before editing it.
2. Identify its owner and downstream dependencies.
3. Make the smallest change that satisfies the request.
4. Do not rewrite unrelated files.
5. Do not change shared contracts without explicit authorization.
6. Preserve existing IDs and interfaces unless migration is part of the request.
7. Update examples when a contract-controlled output changes.
8. Report limitations and pending owner dependencies honestly.

When asked only for an evaluation or plan, do not modify files.

## Validation checklist

Before reporting an implementation complete, verify:

- The modified prompt has one clear purpose.
- The agent's inputs are explicitly defined.
- The agent's boundaries are explicit.
- The workflow is ordered.
- The output matches the shared contract.
- Required counts are enforced.
- Canonical IDs are used.
- Missing data behavior is defined.
- Unsupported tools or integrations are not claimed.
- At least one valid sample exists.
- The downstream handoff is understandable.
- The change supports the end-to-end demo.
- Deferred functionality is documented honestly.

## Definition of hackathon done

The prompt system is ready for the demo when:

1. The Input Agent produces a valid student profile and initial skill estimates.
2. The Opportunity Agent produces grounded career insights and a skill-gap handoff.
3. The Knowledge Agent consumes that handoff and returns a focused learning plan.
4. The Learning Patterns Agent interprets a new event.
5. Deterministic code updates the student model.
6. The Advisor produces a weekly plan within the student's available hours.
7. The dashboard explains what changed and why.
8. Every output passes validation.
9. Golden fallback outputs are available.
10. Known limitations are stated rather than hidden.

## Final instruction

Build for the demonstrated student journey, not for every theoretical future user.

Prefer a small truthful system that works from input to changed weekly plan over a large impressive specification that cannot run.

Preserve future extensibility through clear contracts, modular ownership, and documented deferred work—not through premature implementation.