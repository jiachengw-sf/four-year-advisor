# 4-Year Advisor

A college advisor that sticks with a student for all four years. It learns their skills, pace, and interests, then recommends what to learn next, how to learn it, and what to apply for. Five AI agents run in Superhuman, a chat-based agent tool. The agents can't talk to each other or to our database, so our Next.js + Supabase site is the bridge between them. The site shows each agent an "Agent context" JSON block to copy into the agent chat. The agent's JSON reply gets pasted back into the site, validated, and saved to the Supabase table `agent_outputs`. That table works as a shared blackboard, including handoffs from one agent to another.

## How the bridge works

1. **Copy Agent context.** The site shows a JSON block for the agent you're about to run.
2. **Run the agent in Superhuman.** Paste the context into that agent's chat.
3. **Paste the JSON reply into the site.** The agent ends its reply with one fenced `json` block.
4. **Validated and saved to `agent_outputs`.** The site checks the reply against [docs/agent-contracts.md](docs/agent-contracts.md). Handoffs are saved as rows with `kind = 'handoff'`.
5. **Dashboard updates.** Panels read the latest outputs, and the next agent's context includes any unread handoffs.

## Ownership

| Owner | Owns |
|---|---|
| A | Input agent + Knowledge Retrieval agent prompts, skill catalog (`seed/skills.csv`), demo persona (`seed/persona.md`) |
| B | Learning Patterns agent prompt, synthetic events (`seed/events.json`) |
| C | Opportunity Retrieval agent prompt, opportunities list (`seed/opportunities.csv`), handoff format |
| D | Site, database, dashboard, update math, Advisor agent prompt |

## Where to put your work

- `prompts/`: agent instructions, one file per agent.
- `seed/`: data (skill catalog, opportunities, events, demo persona).
- `samples/`: one validated example output per agent.

**A, B, and C only edit `prompts/`, `seed/`, and `samples/`, and push straight to `main`.** Everything else is D's.

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

1. Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key.
2. Create the tables: run `db/schema.sql` in the Supabase SQL editor, or with the Supabase CLI run `npx supabase link --project-ref <ref>` and then `npx supabase db push` (applies `supabase/migrations/`).
3. `npm install`
4. `npm run dev`

Then open http://localhost:3000/admin, create the demo student, import the CSVs, and click "Load samples".

## Repo map

```
docs/agent-contracts.md   JSON shape every agent must return
docs/demo-script.md       3-minute demo + judge Q&A
db/schema.sql             Supabase tables (agent_outputs = blackboard)
prompts/                  Superhuman agent instructions
seed/                     skill catalog, opportunities, events, persona
samples/                  one valid output per agent
```
