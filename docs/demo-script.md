# Demo script (3 minutes)

Demo student: Maya Lopez, first-year CS major (see `seed/persona.md` and `samples/`).

**Setup order in /admin:** import `seed/skills.csv` and `seed/opportunities.csv`, load `seed/events.json`, and run the Learning Patterns agent live **before** clicking "Load samples". Patterns ignores events older than its last saved output, golden ones included, so loading samples first makes the seeded history count as already reviewed.

## 1. Problem (20s)

"Most students see an advisor for 15 minutes a semester. That advisor doesn't know what you learned last week, how fast you learn, or which internship deadline is coming up. 4-Year Advisor stays with you for all four years and keeps that picture up to date."

## 2. Onboarding builds the knowledge graph (40s)

- Drop Maya's documents (resume PDF, LinkedIn export, transcript, PIQs) into the **Input agent** in Superhuman along with the Agent context. No reformatting: the agent figures out what each file is.
- Paste the JSON reply back. It's validated and saved to `agent_outputs`.
- Show the knowledge graph filling in: Python strong, recursion shaky, graph algorithms weak. Point out `verify_nodes`: the system knows what it isn't sure about and asks.

## 3. Dashboard panels (40s)

- **Opportunities:** ready (ACM club), almost (Google STEP, missing graph algorithms, due Nov 15), long term (ML lab).
- **Learn next:** graph algorithms first, because the Opportunity agent handed it to the Knowledge agent. Show the handoff row on the blackboard being consumed.
- **Learning profile:** practice works better than video for Maya, and algorithms take her 1.3x the average time.

## 4. Live check-in triggers a re-plan (40s)

- Submit a check-in: "45 minutes on graphs, still confused," confidence 2.
- Run the **Learning Patterns agent**, then the **Advisor agent**.

**Exact check-in (Check in button, bottom right).** It must be the first check-in on Maya after the live agent run, so the on-stage change is clean:

| Field | Value |
|---|---|
| Skill | Graph algorithms |
| Minutes studied | 45 |
| Confidence | 2 |
| What did you do? | 45 minutes on graphs, still confused |
| Quiz score | leave empty |

Expected, with Maya at graph algorithms mastery 0.40 and algorithms pace 1.3 (no graph row from Input, so the 0.3 prior + Patterns delta 0.1):

- **Toast:** "Graph algorithms: mastery 0.40 → 0.38, estimate 10.4h → 12.1h (you're taking longer on algorithms)"
- **Knowledge map:** the Graph algorithms node turns from amber to red (red is below 0.40), and its panel shows 12.1h and "Check-in: 45 min, confidence 2/5".
- **What changed and why:** updates only after the Patterns and Advisor re-runs, not on the check-in alone.

If the live run leaves different values, the toast numbers change. Check the graph node's mastery and estimate before going on stage. The amber → red flip happens only if graph mastery is 0.40–0.42 going in. Below 0.40 it's already red, and above 0.42 it stays amber; the estimate still rises either way.
- Show the **"What changed and why"** card: "Graph algorithms moved to #1 after your check-in said you were still confused." This week's plan now leads with a practice set, not a video.

## 5. Close (10s)

"Five agents, one shared memory, four years. It learns the student, not just the subject."

---

## Likely judge questions

**How is this different from ChatGPT?**
ChatGPT starts from zero every conversation. We keep a persistent student model: a skill graph with mastery and confidence, a learning-pace profile, and event history. Specialized agents read from and write to that model. Recommendations are tied to real opportunities and deadlines, and every change comes with a reason.

**Where does the data live?**
In our Supabase Postgres database. Agent outputs and handoffs go in the `agent_outputs` table, which acts as the shared blackboard. The agents themselves store nothing; they only see the Agent context we paste in. For the hackathon we use a synthetic persona with personal details removed, and no real student data.

**Does this replace human advisors?**
No. It prepares students to use their advisors better. A student walks into a meeting knowing their gaps, their deadlines, and what they've tried, so the 15 minutes go to judgment calls and mentorship instead of catching up.
