# Agent output contracts (send to A, B, C now)

Every agent must end its reply with ONE fenced ```json block in exactly this shape.
The site validates it and saves it to Supabase. Extra text above the JSON is fine.

Shared rules
- `node_id` = snake_case ids from A's skill catalog (e.g. `graph_algorithms`, `linear_algebra`). Never invent new ids.
- `opportunity_id` = ids from C's opportunity list (e.g. `opp_google_step`).
- mastery and confidence are numbers from 0 to 1.
- Dates are ISO: `2026-11-15`.
- The agent's input is the "Agent context" JSON block the site shows. Paste it into the agent chat.

---

## Input agent (A)
Input: the student's documents in any format (resume, LinkedIn export, transcripts, score reports, UC PIQs or other essays; files or pasted text) + Agent context (contains the skill catalog).
```json
{
  "agent": "input",
  "student": {
    "name": "Maya Lopez",
    "year": 1,
    "major": "Computer Science",
    "career_goals": ["software engineering internship"],
    "interests": ["machine learning", "education"],
    "weekly_hours": 10
  },
  "skills": [
    { "node_id": "python_basics", "mastery": 0.8, "confidence": 0.7, "evidence": "Resume: built a Flask app" }
  ],
  "verify_nodes": ["recursion"]
}
```

## Knowledge Retrieval agent (A)
Input: Agent context (skill catalog with base hours, skills, goals, learning profile, prerequisite edges, unread handoffs, recent check-ins and quizzes).
```json
{
  "agent": "knowledge",
  "learn_next": [
    {
      "node_id": "graph_algorithms",
      "reason": "Needed for Google STEP (due Nov 15); quiz score 40%",
      "est_hours": 8,
      "resources": [
        { "title": "BFS/DFS practice set", "url": "https://...", "type": "practice" }
      ],
      "milestones": ["Solve 5 BFS problems", "Pass graph quiz at 80%"]
    }
  ],
  "consumed_handoffs": ["<handoff id from context>"]
}
```
`type` is one of: practice, video, reading, project.

## Opportunity Retrieval agent (C)
Input: Agent context (skills, interests, goals, opportunity list).
```json
{
  "agent": "opportunity",
  "ready": [
    { "opportunity_id": "opp_acm_club", "reason": "Matches ML interest; no prerequisites" }
  ],
  "almost": [
    { "opportunity_id": "opp_google_step", "reason": "Strong Python", "missing_nodes": ["graph_algorithms"], "deadline": "2026-11-15" }
  ],
  "long_term": [
    { "opportunity_id": "opp_ml_lab", "reason": "Needs linear algebra and ML basics first" }
  ],
  "handoffs": [
    { "to_agent": "knowledge", "opportunity_id": "opp_google_step", "missing_nodes": ["graph_algorithms"], "deadline": "2026-11-15" }
  ]
}
```
Every "almost" item must also appear in `handoffs`.

## Learning Patterns agent (B)
Input: Agent context (skills, learning profile, recent events such as check-ins and quiz scores).
```json
{
  "agent": "patterns",
  "skill_deltas": [
    { "node_id": "graph_algorithms", "mastery_delta": -0.1, "confidence_delta": 0.2 }
  ],
  "pace_updates": [
    { "category": "algorithms", "multiplier": 1.4 }
  ],
  "method_scores": { "practice": 0.8, "video": 0.3, "reading": 0.5, "project": 0.6 },
  "tips": ["Your quiz scores rise after practice problems, not videos."]
}
```
Keep deltas between -0.3 and 0.3. multiplier > 1 means slower than average.

## Advisor agent (D, built last)
```json
{
  "agent": "advisor",
  "this_week": [
    { "title": "Graph algorithms practice set", "node_id": "graph_algorithms", "hours": 3, "reason": "STEP deadline in 4 weeks" }
  ],
  "what_changed": ["Graph algorithms moved to #1 after your check-in said you were still confused."]
}
```

---

## Seed data formats

A: skill catalog (~30 nodes), CSV or JSON:
`node_id, name, category, base_hours, prerequisites (comma-separated node_ids)`

C: opportunities (~15 real ones), CSV or JSON:
`opportunity_id, type (club|research|internship), title, required_nodes (comma-separated), deadline, link, tags`

A: demo persona, `seed/persona.md` (and files in `seed/persona/`): realistic documents for a fictional student, in any format. No real contact details.

B: synthetic events (~10), `seed/events.json`: a history of check-ins and quizzes for the persona, spread over a few weeks, that shows a clear pattern (e.g. scores jump after practice problems, slow on algorithms topics).
```json
[
  { "type": "checkin", "node_id": "graph_algorithms", "payload": { "minutes": 180, "confidence": 2 }, "created_at": "2026-09-20T18:00:00Z" },
  { "type": "quiz", "node_id": "graph_algorithms", "payload": { "score": 40 }, "created_at": "2026-09-21T18:00:00Z" },
  { "type": "resource_feedback", "node_id": "graph_algorithms", "payload": { "resource_type": "practice", "helped": true }, "created_at": "2026-09-22T18:00:00Z" }
]
```
`type` is one of: checkin, quiz, resource_feedback, goal_change. Use node_ids from A's catalog.

## Who owns what
| Person | Agent prompts | Seed data | Other |
| --- | --- | --- | --- |
| A | Input, Knowledge Retrieval | skills.csv, persona.md | |
| B | Learning Patterns | events.json | |
| C | Opportunity Retrieval | opportunities.csv | Handoff format |
| D | Advisor (last) | | Site, Supabase, dashboard, update math |
