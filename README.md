# 4-Year Advisor

A college advisor that sticks with a student for all four years. It learns their skills, pace, and interests, then recommends what to learn next, how to learn it, and which internships to go for. A student uploads their documents (resume, UC application, essays) and gets a dashboard.

Five agents do the work: **Input**, **Opportunity**, **Knowledge**, **Learning Patterns**, and **Advisor**. They don't call each other. Our Next.js + Supabase site sits between them. It builds each agent's "Agent context" JSON, validates the agent's JSON reply against [docs/agent-contracts.md](docs/agent-contracts.md), and saves it to the Supabase table `agent_outputs`. That table is a shared blackboard, and handoffs from one agent to another are rows with `kind = 'handoff'`.

**Rule:** agents interpret and explain; code calculates and validates (mastery, pace, and check-in updates are code).

## How a student uses it

1. Open **/upload** (the "Start" link in the nav).
2. **Pick or create the student.** Create a new one for each real person.
3. **Add documents.** PDF, `.txt`, or `.md`. Text is read in the browser.
4. Click **Generate profile and dashboard.** The site runs Input, Patterns, Opportunity, Knowledge, and Advisor in that order, saves each result, and links to the dashboard at `/?student=<id>`.
5. On the dashboard, **Check in** after studying. A check-in updates mastery and pace in code right away. Re-run Patterns and Advisor to refresh the plan.

The dashboard cards: This week, What changed and why, What should I learn, How should I learn it, What opportunity should I pursue, Handoff feed, Learning patterns, plus a knowledge map.

## How the agents run

- **Local runner (default for Generate).** `lib/runner.ts` sends each agent's instructions (the text below the first `---` in `prompts/<agent>.md`) plus its context to an LLM API, then validates and saves the reply the same way a pasted one is. It uses the **NVIDIA API** when `NVIDIA_API_KEY` is set (default model `nvidia/nemotron-3-super-120b-a12b`, override with `ADVISOR_MODEL`), otherwise the Anthropic API with `ANTHROPIC_API_KEY`.
- **By hand in Superhuman Go.** The same prompts also work as Superhuman Go agents. Under "Advanced" on `/upload`, and on `/agents`, you copy an agent's context into its chat and paste the JSON reply back. Superhuman Go can't call our site, so this path is manual.
- **Real opportunities.** Before the Opportunity agent runs, `lib/jobs.ts` fetches current internship postings from company job boards (public Greenhouse API) and saves them in `opportunities` with their real links, ranked by keywords from the student's profile. Indeed and LinkedIn restrict automated access, so they aren't used. Each posting is mapped to catalog skills from its title with a simple heuristic, and job boards don't expose deadlines.

## Ownership

Roles from the hackathon. Everyone pushes to `main`; stage files by name.

| Area | Files |
|---|---|
| Agent prompts, samples, persona | `prompts/`, `samples/`, `seed/persona/` |
| Skill catalog, opportunities, events | `seed/skills.csv`, `seed/opportunities.csv`, `seed/events.json` |
| Site, database, update math | `app/`, `components/`, `lib/`, `db/` |
| Submission text | `docs/submission.md`, `docs/demo-narration.md` |

### `seed/events.json` format

An array of about 10 events for the demo persona, spread over a few weeks and showing a clear pattern. The full example is in [docs/agent-contracts.md](docs/agent-contracts.md#seed-data-formats).

```json
{ "type": "checkin", "node_id": "graph_algorithms", "payload": { "minutes": 180, "confidence": 2 }, "created_at": "2026-09-20T18:00:00Z" }
```

- `type`: `checkin`, `quiz`, `resource_feedback`, or `goal_change` (matches the `events` table in `db/schema.sql`).
- `node_id`: an id from `seed/skills.csv`.
- `payload` depends on the type:
  - `checkin`: `minutes`, `confidence`
  - `quiz`: `score`
  - `resource_feedback`: `resource_type`, `helped`
- `created_at`: an ISO timestamp.

## Local setup

1. Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key. Add `NVIDIA_API_KEY` (or `ANTHROPIC_API_KEY`) to use the one-click Generate flow. Never commit `.env.local`.
2. Create the tables: run `db/schema.sql` in the Supabase SQL editor, or with the Supabase CLI run `npx supabase link --project-ref <ref>` and then `npx supabase db push` (applies `supabase/migrations/`).
3. `npm install`
4. `npm run dev`

Then open http://localhost:3000/admin, import the CSVs, and use **/upload** to create a student and generate their profile. Or run `npm run seed` to load the skill catalog, opportunities, demo student (the first row of `students`), and `seed/events.json` from the command line.

**Needs internet:** the site runs locally, but Supabase, the LLM API, and the job boards are online services. The PDF reader on `/upload` also loads from a CDN.

**Private data:** students' real documents stay out of the repo. Contact details and ID numbers shouldn't be pasted into agent contexts, and test students should be deleted afterwards.

## Demo

[docs/demo-script.md](docs/demo-script.md) and [docs/demo-narration.md](docs/demo-narration.md) describe the 3-minute demo. [docs/submission.md](docs/submission.md) is the hackathon form text. If the live flow fails, Admin's "Reset demo" followed by "Load samples" restores the saved sample state.

## Repo map

```
app/upload/               start page: create student, upload documents, Generate
app/agents/               manual copy-paste path for each agent
app/admin/                CSV import, reset demo, load samples
app/                      dashboard at /
components/               dashboard, knowledge map, check-in
lib/runner.ts             runs an agent prompt through the NVIDIA/Anthropic API
lib/jobs.ts               fetches real internship postings from job boards
lib/contracts.ts          zod schemas for every agent reply
lib/save.ts               validates and saves agent output, applies Patterns deltas
docs/agent-contracts.md   JSON shape every agent must return
docs/specs/               full design specs behind each agent prompt
db/schema.sql             Supabase tables (agent_outputs = blackboard)
prompts/                  agent instructions, one file per agent
seed/                     skill catalog, opportunities, events, persona
samples/                  one valid output per agent
```
