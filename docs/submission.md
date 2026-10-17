# 4-Year Advisor

**Tagline:** An advisor that stays with a student for all four years and keeps up with what they actually learn.

**Track:** Inclusion & Accessibility. First-gen and under-resourced students often get a 15-minute advising slot a semester and no one at home who knows what an internship pipeline asks for, so this is the advisor they never had.

## Problem

Most students see an advisor for about 15 minutes a semester. That advisor doesn't know what the student learned last week, how fast they learn, or which deadline is coming up. Students with family in the industry fill the gap informally. First-gen and under-resourced students usually can't, and they find out after the deadline.

## What it does

The student's dashboard has seven cards:

1. **This week:** a plan that fits the hours they actually have.
2. **What changed and why:** the reason the plan moved since last time.
3. **What should I learn:** the next skills, with time estimates and milestones.
4. **How should I learn it:** resources matched to the methods that work for them.
5. **What opportunity should I pursue:** opportunities that are ready, almost reachable, or long-term, and the skills missing for each.
6. **Handoff feed:** what one agent passed to another.
7. **Learning patterns:** how they learn best and how fast, per topic area.

A knowledge map and a Check in button sit alongside.

## How it works

Five agents run in Superhuman Go:

- **Input** reads a resume, transcript, essays or LinkedIn export and builds the skill graph. It lists what it isn't sure about.
- **Opportunity** sorts internships into ready, almost and long-term and hands missing skills to Knowledge. Postings are fetched live from company job boards (Greenhouse), with real links.
- **Knowledge** picks what to learn next, with resources and milestones.
- **Learning Patterns** finds which methods work and how fast the student learns each topic.
- **Advisor** combines everything into the weekly plan and explains what changed.

The agents can't call each other or our database. A Next.js site bridges them: it shows an agent's context, the reply is pasted back, validated with zod, and saved to the Supabase table `agent_outputs`. That table is a shared blackboard, and handoffs are rows other agents read later.

**Rule:** agents interpret and explain; code calculates and validates.

## The learning loop

A check-in updates mastery and pace in code immediately. The Patterns agent only proposes changes for new evidence, flagged `new_evidence`, so a check-in isn't counted twice. It still reads the student's note for tips.

## Built with

Superhuman Go, Next.js, Supabase, zod, React Flow.

## Challenges

- Agents can't call each other, so we designed the blackboard and a strict output contract.
- Counting a check-in twice, once in code and once by the Patterns agent.
- Trusting model output: every reply is checked against the contract before saving.

## Next

- Connect the agents directly instead of copy and paste.
- Add more job boards and deadlines, and match postings to each student's resume in more detail.
- Add human advisors, so a student arrives at a meeting knowing their gaps.
