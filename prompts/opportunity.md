# Build the Opportunity Research Agent — Claude Implementation Framework

> **Document type:** Agent-creation specification for Claude or another coding agent.
>
> **This is not the runtime prompt for the Opportunity Agent.** Use this document to analyze the repository, design the agent, and create the final runtime instructions in `prompts/opportunity.md`.

## 1. Your role

Act as a senior AI prompt engineer, multi-agent systems architect, retrieval-system designer, and product engineer.

You are working in the `jiachengw-sf/just_do_it` repository on the four-year personal advisor project. Your task is to create the **Opportunity Research Agent** owned by Owner C.

The final agent will run in Superhuman Go. It will receive an `Agent context` JSON object from the website and return structured JSON that the website validates and stores in Supabase for other agents to consume.

Do not immediately write a generic career-advice prompt. First understand the repository architecture, existing contracts, ownership boundaries, and downstream consumers.

## 2. Required repository review

Before creating or modifying files, read at minimum:

1. `README.md`
2. `docs/agent-contracts.md`
3. `db/schema.sql`
4. `Input_Agent.md`
5. `Knowledge_Retrieval_Agent.md`
6. `prompts/input.md`
7. `prompts/knowledge.md`
8. `prompts/advisor.md`
9. `prompts/opportunity.md`
10. `samples/input.json`
11. `samples/knowledge.json`
12. `samples/advisor.json`
13. `samples/opportunity.json`
14. All available files in `seed/`

Explain any important mismatch between the requested Opportunity Agent behavior and the repository's current output contract before implementing around it.

## 3. Repository architecture you must preserve

The agents do not directly communicate with one another or directly access the database.

The website acts as a bridge:

1. The website creates an `Agent context` JSON block.
2. The user copies that context into the relevant Superhuman Go agent.
3. The agent performs its task.
4. The agent ends its response with one fenced JSON block.
5. The website validates and stores the JSON in `agent_outputs`.
6. Other agents receive relevant outputs and unread handoffs through later context blocks.

The Opportunity Agent must therefore produce deterministic, well-structured, evidence-grounded output that the Advisor and Knowledge agents can consume without relying on hidden conversation state.

## 4. Ownership boundaries

Owner C owns:

- The Opportunity Agent design and runtime prompt
- `prompts/opportunity.md`
- `samples/opportunity.json`
- `seed/opportunities.csv`
- The Opportunity-to-Knowledge handoff format

Do not modify files owned by another teammate unless the user explicitly authorizes it.

In particular, do not silently modify the database, website, Advisor implementation, or shared contract merely to make the Opportunity Agent easier to build. If those components require changes, produce a precise compatibility note explaining:

- The affected file
- The current limitation
- The required change
- Why the change is necessary
- Which owner should make it

## 5. Product goal

Create an Opportunity Research Agent that proactively helps first-generation and under-resourced college students understand possible career paths and make better career decisions.

The agent should use the student's profile, competency graph, goals, constraints, user input, previous agent outputs, and persistent career memory to decide what career questions matter now.

It should then research relevant public information, synthesize evidence-backed insights, and give personalized career advice that the Advisor Agent can use when creating the student's plan.

This agent is broader than a static opportunity-ranking system. Its primary product value is:

- Generating important career questions
- Researching relevant career paths
- Learning from Berkeley alumni with comparable paths
- Connecting external evidence to the student's background
- Giving actionable, transparent career advice
- Maintaining continuity across repeated runs

The agent does not create the final weekly schedule. The Advisor Agent owns plan construction and conflict resolution.

## 6. Non-negotiable behavior

### 6.1 Proactive research

The agent must proactively generate research questions from:

- The student profile
- Career goals
- Interests
- Competency strengths and gaps
- Recent profile changes
- Student constraints
- Previous career research
- Unresolved follow-ups
- Direct user input
- Relevant outputs from other agents

It must not require the student to provide a perfectly formed career question.

### 6.2 Berkeley alumni as the primary expert population

The primary expert population is UC Berkeley alumni whose publicly documented paths are relevant to the student.

Prioritize:

1. Berkeley graduates from approximately the last five years
2. Berkeley graduates from approximately six to ten years ago
3. Older Berkeley alumni only when they provide uniquely useful evidence
4. Non-Berkeley experts only to corroborate a pattern or fill an evidence gap

Recent graduates should have the greatest influence on immediate advice because their recruiting environment, academic experience, tools, and early-career conditions are more comparable to those of a current student.

### 6.3 Similar-background matching

Match alumni to the student only through explicit, career-relevant public evidence such as:

- Major or academic field
- Transfer pathway
- Career goal
- Projects and demonstrated abilities
- Internship or research progression
- Industry and role
- Graduation period
- Explicitly disclosed first-generation experience
- Explicitly disclosed financial, family, accessibility, or scheduling constraints

Never infer a sensitive characteristic from a name, photo, location, school, employer, or writing style.

Use a mixture of:

- Near peers who were recently in the student's position
- Alumni one or two career stages ahead
- A smaller number of aspirational examples

Near-peer evidence should receive the greatest weight for immediate planning advice.

### 6.4 Insight-count rule

For a new student with no previous Opportunity Agent memory:

- Return exactly **five evidence-backed insights**.

For a returning student:

- Return exactly **three new or materially updated insights**.
- Also return all relevant follow-ups connected to unresolved previous memory.
- Follow-ups do not count toward the three-insight limit.

Do not count repeated or unchanged advice as a new insight.

### 6.5 Memory continuity

The agent must compare new research with previous Opportunity Agent outputs.

Every prior unresolved insight should be classified as one of:

- Confirmed
- Updated
- Contradicted
- Completed
- Still open
- Superseded

The agent must not silently forget previous advice, commitments, questions, or outcomes.

### 6.6 Evidence standards

The agent must not generate advice from professional profiles alone.

Alumni examples should be corroborated, when possible, using sources such as:

- Public Berkeley pages
- Employer biographies
- Personal websites or portfolios
- Public professional profiles
- Public GitHub profiles when relevant
- Interviews, talks, articles, or podcasts
- Official opportunity descriptions
- Employer career pages
- University career guidance
- Professional-association resources
- Credible industry reports

Every factual claim must be traceable to an accessible source.

Do not claim to have read inaccessible content. A search-result snippet is not sufficient evidence for detailed personal claims.

## 7. Runtime agent responsibilities

The runtime prompt you create must instruct the Opportunity Agent to:

1. Parse and validate the Agent context.
2. Identify the run type and trigger.
3. Identify material changes since the previous run.
4. Review relevant career memory and previous outputs.
5. Generate candidate career questions.
6. Rank questions by relevance, urgency, novelty, and planning impact.
7. Build a research brief for each selected question.
8. Search for relevant Berkeley alumni and current career evidence.
9. Verify Berkeley affiliation and other factual claims.
10. Compare multiple alumni paths rather than copying one path.
11. Corroborate alumni patterns with current requirements.
12. Separate observed facts from inferred patterns.
13. Personalize insights using the student's profile and constraints.
14. Produce specific career advice.
15. Produce planning signals for the Advisor Agent.
16. Produce skill-gap handoffs for the Knowledge Retrieval Agent.
17. Produce memory updates and follow-up records.
18. Return valid JSON matching the agreed contract.

## 8. Run types and triggers

Design the runtime prompt to support:

- `initial`: first research run after onboarding
- `profile_change`: career goal, interest, major, constraint, or preference changed
- `progress_change`: a material new skill, project, experience, or opportunity outcome appeared
- `freshness`: important external evidence may be stale
- `student_question`: the student asked a direct career question

The agent should not perform a full web-research cycle after every small quiz or study event.

A run should focus on the fields that changed and the decisions those changes could affect.

## 9. Career-question framework

The generated agent should consider questions in these categories:

### Career path

- How do students with comparable preparation enter the target field?
- What adjacent paths may also match the student's interests and abilities?

### Experience building

- Which projects, internships, research roles, clubs, coursework, or leadership experiences create credible career evidence?

### Skill evidence

- Which competencies do current opportunities require?
- How do successful candidates demonstrate those competencies?

### Timeline

- What should a student at this academic stage investigate or prepare for next?
- Which recruiting, research, or application cycles are approaching?

### Access and constraints

- Which paths remain realistic under the student's stated time, financial, family, accessibility, geographic, or academic constraints?

### Career exploration

- What low-cost or reversible action could help the student test interest in a field before making a large commitment?

Questions should be prioritized by:

1. Relevance to a stated goal
2. Importance to the next decision
3. Material changes in the profile
4. Unresolved previous questions
5. Deadline or time sensitivity
6. Strength of existing evidence
7. Potential effect on the Advisor's plan

## 10. Required research workflow

The runtime agent prompt must define the following workflow.

### Step 1: Build a research brief

For each selected question, identify:

- Exact question
- Why it matters now
- Student context used
- Current career and academic stage
- Relevant strengths
- Relevant gaps
- Relevant constraints
- Time horizon
- What evidence could change the plan

### Step 2: Discover relevant alumni

Search public, accessible sources for Berkeley alumni with relevant paths.

Do not stop at the first result. Use multiple focused searches and synonymous role or field names where useful.

### Step 3: Reconstruct supported path facts

Extract only verifiable facts such as:

- Berkeley program and graduation period
- Publicly documented projects
- Internships
- Research experience
- Extracurricular or leadership experience
- First role after college
- Career transitions
- Publicly stated advice
- Relevant skills
- Approximate sequence of experiences

Do not invent motivations or causal relationships.

### Step 4: Verify current relevance

Compare alumni evidence with current sources such as:

- Official internship or job descriptions
- Research-program pages
- Lab pages
- Employer career pages
- University guidance
- Professional-association resources
- Current credible career articles or reports

Alumni paths show what happened. Current opportunity and institutional sources indicate whether the pattern is still relevant.

### Step 5: Identify patterns and differences

Look for:

- Patterns repeated across independent sources
- Differences between alumni paths
- Current requirements
- Stage-appropriate actions
- Contradictions
- Missing information
- Selection bias in public profiles

Do not turn one person's path into a universal rule.

### Step 6: Personalize

Connect every insight to one or more of:

- Student goal
- Demonstrated strength
- Competency gap
- Student constraint
- Previous insight
- Current decision
- Time-sensitive cycle or opportunity

### Step 7: Check novelty

Classify findings relative to memory as:

- New
- Updated
- Confirmed
- Contradicted
- Completed
- Still open
- Superseded

### Step 8: Create downstream signals

Convert supported advice into:

- Advisor planning signals
- Knowledge Retrieval handoffs
- Memory updates
- Follow-up records
- Ontology-review requests when no canonical skill node exists

## 11. Agent input design

Design the runtime prompt to accept relevant fields from the Agent context, including when available:

- `run_id`
- `student_id`
- `run_type`
- `current_date`
- `trigger_reason`
- `changed_fields[]`
- `planning_horizon`
- `student`
- `competency_summary`
- `career_memory`
- `previous_agent_outputs`
- `current_student_question`
- `skill_catalog`
- `opportunity_list`
- `unread_handoffs`

The runtime prompt must instruct the agent to mark missing information as unknown rather than inventing values.

## 12. Agent output design

The output must be optimized for downstream planning rather than only for human reading.

The proposed output should support:

- Research summary
- Generated career questions
- Five initial or three returning-user insights
- Alumni examples used as evidence
- Personalized advice
- Follow-ups on prior memory
- Advisor planning signals
- Knowledge Retrieval handoffs
- Ontology-review requests
- Memory updates
- Source records
- A quality report

Each insight should include at minimum:

- Stable insight ID
- Research question ID
- Title
- Summary
- Status relative to memory
- Evidence pattern
- Relevant alumni examples
- Student relevance
- Advice
- Limitations
- Confidence
- Source IDs
- Related career goal
- Related canonical skill nodes
- Previous insight link, when applicable
- Verification date

Each source should include at minimum:

- Stable source ID
- Title
- URL
- Source type
- Publisher or platform
- Person or organization
- Publication date, when available
- Access date
- Relevant extracted facts
- Verification status

Verification status should distinguish:

- Verified primary source
- Verified secondary source
- Partially verified source
- Unverified source

Unverified sources must not support final advice.

## 13. Advisor planning signals

Planning signals should propose, not schedule, actions such as:

- Explore a career direction
- Build career evidence through a project
- Investigate an opportunity
- Prepare for an application cycle
- Verify interest through a small experiment
- Close a competency gap
- Continue, revise, pause, or stop a previous action

Each planning signal should explain:

- Suggested action
- Evidence-backed reason
- Urgency
- Time horizon
- Estimated effort category
- Related goal
- Related skill nodes
- Student constraint considered
- Suggested Advisor priority
- Whether student confirmation is required

The Advisor Agent remains responsible for placing actions into the weekly plan and resolving workload conflicts.

## 14. Knowledge Retrieval handoffs

When research identifies a competency gap, create a handoff containing:

- Source insight ID
- Career question
- Target canonical nodes
- Missing canonical nodes
- Required depth
- Career reason
- Verified deadline, if one exists
- Supporting source IDs

Use only canonical skill-node IDs supplied in the context.

If an important concept has no canonical node, create an ontology-review request rather than inventing an ID.

Do not recommend educational resources in the Opportunity Agent. The Knowledge Retrieval Agent owns resource selection and mastery planning.

## 15. Safety, privacy, and fairness requirements

The runtime prompt must require the agent to:

- Use only public, accessible, career-relevant information
- Minimize the personal information retained about alumni
- Avoid sensitive-trait inference
- Avoid ranking people by prestige
- Avoid presenting salary or employer brand as the only measure of success
- Acknowledge public-profile selection bias
- Distinguish observed facts from interpretation
- Avoid deterministic claims about the student's future
- Avoid presenting an alumnus's path as the only correct path
- Respect access restrictions and platform limitations
- Never fabricate a source or unsupported quotation

## 16. Compatibility requirement

The current repository contract may still describe the Opportunity Agent primarily through:

- `ready`
- `almost`
- `long_term`
- `handoffs`

The requested research-agent behavior needs a richer contract.

Before changing the runtime prompt, determine whether to:

1. Preserve the current fields while adding backward-compatible research fields, or
2. Propose a versioned replacement contract

Do not silently produce JSON that the current website validator will reject.

If the validator or shared contract must change, document the exact required change for Owner D. Keep Owner C's files internally consistent even when another owner's change is pending.

## 17. Required deliverables

After reviewing the repository, produce the following Owner C artifacts:

### Deliverable A: Runtime prompt

Create or update:

- `prompts/opportunity.md`

This must contain the instructions that the installed Superhuman Go Opportunity Agent will execute at runtime.

### Deliverable B: Valid sample output

Create or update:

- `samples/opportunity.json`

The sample must:

- Be valid JSON
- Match the runtime prompt and agreed contract
- Use realistic but non-sensitive demo data
- Demonstrate five insights for a new student, unless the shared contract requires a smaller transitional example
- Include at least one Knowledge Retrieval handoff
- Include source traceability
- Contain no fake claim presented as a real researched fact; clearly use demo/example source data where live verification has not occurred

### Deliverable C: Opportunity seed alignment

Review:

- `seed/opportunities.csv`

Update it only if necessary and within Owner C's scope. Preserve the repository's expected CSV format unless a coordinated contract change has been approved.

### Deliverable D: Compatibility report

Summarize:

- Files changed
- Contract decisions
- Pending changes required from Owner D
- Assumptions
- Validation performed
- Remaining risks

## 18. Prompt-engineering requirements

The runtime prompt must be operational rather than aspirational.

Use:

- Explicit role and boundaries
- Clear input interpretation rules
- Ordered execution steps
- Retrieval and verification rules
- Memory and novelty rules
- Exact insight-count requirements
- Downstream handoff rules
- A strict output schema
- A final validation checklist
- Failure behavior for insufficient or inaccessible evidence

Avoid:

- Vague instructions such as “find the best advice”
- Unbounded browsing
- Unsupported confidence
- Generic career coaching language
- Hidden assumptions
- Duplicate responsibilities owned by other agents
- Instructions that depend on unavailable tools
- Schema examples that conflict with repository validation

The prompt should be detailed enough for reliable execution but organized so the agent can identify priorities quickly.

## 19. Failure behavior

The runtime agent must have explicit behavior for:

- No relevant Berkeley alumni found
- Only inaccessible profiles found
- Conflicting sources
- Stale opportunity information
- Missing student information
- Missing career memory
- Missing canonical skill nodes
- No meaningful new insight for a returning student
- Fewer than the required number of evidence-backed insights

It must report these limitations honestly and must never fill missing evidence with fabricated facts.

If three genuinely new returning-user insights cannot be supported, return the supported insights, explain the shortfall in the quality report, and preserve unresolved follow-ups. Do not disguise repeated advice as new.

## 20. Acceptance criteria

The work is complete only when:

- The runtime prompt clearly distinguishes the Opportunity Agent from the Advisor, Input, Knowledge, and Learning Patterns agents.
- The agent proactively generates career questions.
- Berkeley alumni are the primary expert population.
- Recent graduates are explicitly prioritized.
- Similarity uses only supported, career-relevant evidence.
- New students receive five insights.
- Returning students receive three new or materially updated insights plus all relevant follow-ups.
- Previous memory is explicitly reconciled.
- Advice is source-grounded and personalized.
- Current requirements corroborate alumni examples.
- Advisor planning signals are structured but do not schedule the final plan.
- Knowledge handoffs use only canonical node IDs.
- Sources and claims are traceable.
- Missing or inaccessible evidence is reported honestly.
- Owner C files agree with one another.
- Any dependency on Owner D is documented rather than silently ignored.
- The final JSON is compatible with the repository validator or accompanied by an exact versioned migration requirement.

## 21. Execution instruction

Now inspect the repository, identify contract conflicts, and implement the Owner C deliverables.

Do not merely describe what the Opportunity Agent should do. Create the requested files, validate them, and report the exact changes and remaining cross-owner dependencies.