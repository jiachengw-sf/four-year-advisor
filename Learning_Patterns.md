You are my AI systems architect and technical planning partner for a hackathon project.

Help me design the Learning Pattern Recognition Agent for a four-year AI college advisor. I want your critical input on the implementation architecture, formulas, data structures, memory, tools, integrations, and testing.

YOUR CURRENT TASK IS PLANNING ONLY.

Do not write implementation code, modify files, create database tables, execute migrations, deploy services, or begin implementation. You may inspect available project information and research official documentation.

PROJECT CONTEXT

Our team has four Superhuman Go agents connected through a shared website and persistent database:

1. Input Agent — extracts student background, skills, experiences, interests, and goals.
2. Knowledge Retrieval Agent — determines what students should learn next and recommends resources.
3. Opportunity Retrieval Agent — identifies relevant academic and career opportunities.
4. Learning Pattern Recognition Agent — analyzes progress, learning pace, study-method observations, knowledge gaps, and retention evidence.

My responsibility is the Learning Pattern Recognition component.

Superhuman Go must remain the actual AI agent. Codex may later implement supporting software. Do not propose replacing Go with another LLM chatbot.

Treat the design below as a starting proposal. Challenge weak assumptions and suggest simpler, more reliable alternatives.

1. EVALUATE THE ARCHITECTURE

Recommend a clear division of responsibilities:

- Go interprets student messages, selects tools, asks useful questions, and explains results.
- The backend validates evidence, calculates metrics, enforces authorization, and persists records.
- The website collects student input, administers supported assessments, displays progress, and supports corrections.
- The shared database is the authoritative student memory.

Explain what belongs in each layer and why.

Identify missing requirements, unnecessary complexity, implementation risks, and dependencies on teammates.

Keep the component compatible with the existing application. Do not assume a particular technology stack or invent repository details.

2. DEFINE AGENT BEHAVIOR

Specify how the agent should:

- Read relevant student memory.
- Record study sessions, assessment results, difficulty, and feedback.
- Track individual skills.
- Identify missing or conflicting evidence.
- Ask concise progress questions.
- Recognize possible trends and prerequisite gaps.
- Suggest reassessments.
- Update learning memory through authorized operations.
- Share useful results with the other agents.

Distinguish essential hackathon features from later enhancements.

Keep preferences, reported confidence, demonstrated performance, evidence strength, and evidence freshness separate.

3. DESIGN THE MEMORY AND DATA MODEL

Recommend logical records and fields for:

- Student learning context.
- Skills and prerequisites.
- Assessment evidence.
- Study sessions.
- Completed learning tasks.
- Derived skill estimates.
- Pace summaries.
- Study-method observations.
- Insights and supporting evidence.
- Pending check-ins.
- Corrections and retractions.
- Profile revisions and updates.

Include timestamps, provenance, unique IDs, schema versions, evidence references, and synthetic-data labels where appropriate.

Explain:

- What should persist versus remain conversation context.
- How relevant history is retrieved.
- How corrections affect derived metrics.
- How outdated information is flagged.
- How contradictions are handled.
- How goals and interests change without silently overwriting history.
- How multiple agents avoid conflicting writes.

Prefer structured queries over adding a vector database unless there is a concrete need.

4. CRITIQUE AND REFINE THE FORMULAS

A. Mastery

Starting proposal:

mastery_new = mastery_old + weight × (observed_score − mastery_old)

Evaluate this as a simple performance-based estimate, not a calibrated probability of knowing a skill.

Proposed configurable base weights:
- Verified skill-specific graded assessment: 0.30.
- Backend-scored objective diagnostic: 0.25.
- Skill-specific rubric assignment: 0.15.
- Student-reported numerical assessment: 0.10.
- Study duration, subjective confidence, helpfulness, and unmapped course grades: 0.

Possible adjustment:

weight = base_weight × item_factor × assistance_factor

item_factor = min(relevant_item_count / 8, 1)
Unknown item count: 0.5.
Independent work assistance factor: 1.
Assisted or unknown conditions: 0.5.

Critique these choices. Explain their limitations and propose practical defaults.

Address:
- Cold starts: externally unknown rather than presenting a default as measured mastery.
- Score normalization.
- Multi-skill assessments.
- Repeated questions.
- Assessment difficulty.
- Noisy and self-reported results.
- Evidence provenance.
- Duplicate and out-of-order events.

Do not treat time spent studying as proof of mastery.

B. Evidence strength

Recommend explainable support labels based on evidence count, quality, distinct dates, disagreement, and freshness.

Avoid invented confidence percentages.

Separate heuristic thresholds from statistically calibrated conclusions.

C. Learning pace

Evaluate:

ratio = actual_active_hours / original_unpersonalized_baseline_hours

pace_new = 0.7 × pace_old + 0.3 × ratio

estimated_hours = task_baseline_hours × category_pace_multiplier

Do not divide by an already personalized prediction, which can create a feedback problem.

Explain eligibility requirements:
- Baseline saved before completion.
- Clear task scope and completion criterion.
- Starting knowledge.
- Active time.
- Comparable completed tasks.
- Positive, valid durations.

Recommend minimum evidence, outlier handling, cold-start behavior, and uncertainty reporting.

D. Study-method observations

Evaluate:

observed_gain_per_hour =
(post_assessment_score − pre_assessment_score) / active_study_hours

Use comparable raw assessment scores, not changes in the smoothed mastery estimate.

Specify eligibility for pre/post pairs, assessment comparability, starting-level differences, timing, mixed methods, overlapping episodes, negative gains, and missing data.

Explain when the system should decline to rank methods.

Distinguish association from causation. Do not assign fixed learning styles.

E. Trends and retention

Recommend simple, explainable trend rules.

Do not lower observed mastery merely because time has passed.

Distinguish:
- Last practice.
- Last assessment.
- Review due.
- Observed performance on a delayed assessment.
- Hypothesized retention risk.

Explain which learning-curve or forgetting models should be postponed.

5. DESIGN THE APPLICATION OPERATIONS

Consider operations equivalent to:

- get_learning_context
- list_learning_events
- record_learning_event
- correct_learning_event
- save_learning_review
- respond_to_checkin
- list_learning_updates

These are proposed application tools, not guaranteed Go features.

Specify each operation’s:
- Purpose.
- Inputs and outputs.
- Authorization.
- Validation.
- Idempotency.
- Revision handling.
- Error behavior.

Prefer evidence submission and validated review operations over unrestricted profile editing.

Explain transaction boundaries, duplicate prevention, concurrent updates, correction replay, and safe retries.

Do not add a message broker or complex distributed system without a clear need.

6. VERIFY SUPERHUMAN GO INTEGRATION

Research current official documentation and distinguish:

- Documented capabilities.
- Capabilities confirmed in our actual account.
- Proposed application functionality.
- Unresolved assumptions.

Investigate agent configuration, custom connectors, supported tools, authentication, hosting, triggers, and action confirmations.

Determine whether Go can call our application tools and whether the website can actually initiate a Go interaction.

Do not assume these directions are equivalent.

Do not invent SDK methods, endpoints, agent-to-agent messaging, or automatic notifications.

Recommend the smallest real integration proof: Go reads one authorized synthetic student, records an event, and another agent reads the resulting revision.

If unavailable, describe the blocker and a clearly labeled manual or test-adapter fallback. Do not present that fallback as verified live integration.

7. DESIGN FOLLOW-UPS AND CROSS-AGENT COMMUNICATION

Explain when a check-in is useful and how to avoid repeated questions.

Include pending-question states, skips, declines, cooldowns, and delivery status.

Define what the Knowledge Agent and Opportunity Agent should receive.

Keep measured mastery separate from inferred readiness.

A backend update means information is available; it does not prove another agent read or acted on it.

Prevent feedback loops where agent summaries or plan changes become new assessment evidence.

8. OPTIMIZE THE HACKATHON DEMO

Prioritize a reliable end-to-end demonstration:

1. Student reports study time and confusion.
2. Go reads context and records the session.
3. Mastery stays unchanged.
4. Go offers an available diagnostic.
5. The backend processes the result.
6. The website explains the change using saved evidence.
7. The Knowledge Agent reads the new revision and changes its recommendation.
8. Records persist across sessions.
9. Duplicate submissions do not double-count.

Recommend independent tests, synthetic fixtures, implementation priorities, teammate dependencies, and features to postpone.

Show how the advisor adapts through updated memory and recommendations. Do not imply that its underlying model retrains after every interaction.

REQUIRED OUTPUT

Produce:

A. A critical evaluation of this proposal.
B. An improved architecture and responsibility breakdown.
C. A concrete memory, data, and tool specification.
D. Recommended formulas, defaults, assumptions, and limitations.
E. Verified Go integration findings and unresolved blockers.
F. A prioritized implementation and testing plan.
G. One comprehensive, ready-to-paste Codex implementation prompt.
H. Refined operational instructions for the eventual Go Learning Pattern Recognition Agent.

Explain major tradeoffs in plain language.

Proceed with reasonable labeled assumptions where possible. Ask only questions whose answers materially affect compatibility or feasibility.

Do not implement anything yet. Your output should make the future implementation precise, realistic, and reviewable.
