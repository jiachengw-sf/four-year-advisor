# Demo script (3 minutes)

Demo student: Maya Lopez, first-year CS major (see `seed/persona.md` and `samples/`).

## 1. Problem (20s)

"Most students see an advisor for 15 minutes a semester. That advisor doesn't know what you learned last week, how fast you learn, or which internship deadline is coming up. 4-Year Advisor stays with you for all four years and keeps that picture up to date."

## 2. Onboarding builds the knowledge graph (40s)

- Paste Maya's resume and essay. Copy the Agent context into the **Input agent** in Superhuman.
- Paste the JSON reply back. It's validated and saved to `agent_outputs`.
- Show the knowledge graph filling in: Python strong, recursion shaky, graph algorithms weak. Point out `verify_nodes`: the system knows what it isn't sure about and asks.

## 3. Dashboard panels (40s)

- **Opportunities:** ready (ACM club), almost (Google STEP, missing graph algorithms, due Nov 15), long term (ML lab).
- **Learn next:** graph algorithms first, because the Opportunity agent handed it to the Knowledge agent. Show the handoff row on the blackboard being consumed.
- **Learning profile:** practice works better than video for Maya, and algorithms take her 1.4x the average time.

## 4. Live check-in triggers a re-plan (40s)

- Submit a check-in: "45 minutes on graphs, still confused," confidence 0.4.
- Run the **Learning Patterns agent**, then the **Advisor agent**.
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
