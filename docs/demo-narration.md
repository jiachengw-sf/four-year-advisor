# Demo narration (3 minutes)

Word-for-word script for the video. It follows [demo-script.md](demo-script.md). About 350 spoken words. With pauses for clicks and pasting it runs about 2:50.

**Before recording:** Maya's reset and live agent runs must be finished. Open `/` with Maya. Have a Superhuman Go tab ready for the Input agent and Patterns agent. Don't click "Load samples" during the recording.

**Check against the screen:** the numbers below (1.3x algorithms, Google STEP due Nov 15, practice over video) come from `demo-script.md` and the samples. If Maya's final live run shows different numbers, change the spoken numbers to match what's on screen.

---

## 0:00–0:20 Problem
**On screen:** title slide or the dashboard header, nothing clicked.

> "Most students see an advisor for fifteen minutes a semester. That advisor doesn't know what you learned last week, how fast you learn, or which internship deadline is coming up. Students with family in the industry fill that gap. First-gen students often can't. 4-Year Advisor is the advisor they never had. It stays with you for four years."

## 0:20–1:00 Onboarding builds the knowledge graph
**On screen:** Go tab, **Input agent** chat. Paste Maya's Agent context, attach her resume, transcript, LinkedIn export and essays. Send. Then paste the JSON reply into the site and save. Switch to the knowledge map.

> "Meet Maya, a first-year computer science student. I give the Input agent her documents as they are: resume, transcript, LinkedIn, essays. No reformatting. It works out what each file is and builds her skill graph."
>
> "Python is strong. Recursion is shaky. Graph algorithms are weak."
>
> "Notice what it also returns: a list of skills it isn't sure about, and it asks Maya to verify them. The system knows what it doesn't know."

## 1:00–1:40 Dashboard cards
**On screen:** dashboard `/`. Scroll slowly: **What else do I need**, then **What should I learn**, then **Handoff feed**, then **Learning patterns**.

> "Here's her dashboard. Under 'What else do I need', the Opportunity agent sorts real opportunities. The ACM club is ready now. Google STEP is almost in reach. It's missing graph algorithms, and the deadline is November 15. The ML lab is long term."
>
> "Now 'What should I learn'. Graph algorithms comes first, because the Opportunity agent handed it to the Knowledge agent. The agents can't call each other, so the handoff goes through a shared table. You can see it in the handoff feed, marked as consumed."
>
> "And 'Learning patterns': practice works better than video for Maya, and algorithms take her about one point three times the average."

## 1:40–2:30 Live check-in triggers a re-plan
**On screen:** click **Check in** on the graph node. Type "45 minutes on graphs, still confused", confidence 2, submit. Show the graph update. Go tab: run **Patterns**, then **Advisor**, paste each reply back. Return to `/` and point at **What changed and why**, then **This week**.

> "Now the part that matters. Maya studies graphs for forty-five minutes and says she's still confused. Confidence two out of five."
>
> "Our code updates her mastery and pace right away. The Patterns agent only proposes changes for new evidence, so nothing is counted twice. It reads her note and adjusts the tips."
>
> "Then the Advisor agent re-plans. Here's 'What changed and why':" *(read the first line of the card aloud exactly as it appears, since graphs may already be #1 and the card may say they stayed there with more time)* "This week still leads with a practice set, not a video."

## 2:30–2:50 Close
**On screen:** full dashboard.

> "Five agents, one shared memory, four years. Agents interpret and explain. Code calculates and validates. It learns the student, not just the subject."

---

## If you run long
Cut the Input agent paste (0:20–1:00) down to the reply and the knowledge map. Keep the check-in section whole.
