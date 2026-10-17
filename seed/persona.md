# Demo persona (owner: A)

We need a **fake but realistic** student, Maya Lopez, and the documents a real student would actually have. The Input agent reads whatever it's given and works out what each document is, so there's **no template and no required style**. Make them look like real documents: real resumes are inconsistent, transcripts are full of course codes, essays ramble a bit. That's exactly what we want to show the agent handling.

## What to provide

Any of these, in whatever form they'd naturally exist (PDF, DOCX, screenshot, copied text):

- A resume
- A LinkedIn profile, exported as PDF or copied text
- A college transcript (unofficial is fine) and/or a high school transcript
- An AP score report
- UC Personal Insight Question responses or a Common App essay
- Anything else a student might hand over: an activities list, a project README

More documents make a better demo, but even two or three are enough. Put files in `seed/persona/`, or paste text at the bottom of this page.

## Rules

1. **Maya is fictional.** Her documents are made up, and she's the student the demo is built around.
2. **Real public profiles are allowed for testing.** `example_personas/` holds summaries of real students, compiled from their public resumes, portfolios and GitHub. Use them to check that the agents handle different kinds of students. Load them on a separate test student, never on Maya.
3. **No real contact details in the repo:** no phone number, email, home address, student ID, or birthdate, even when the source document has them. This repo is public.

## Who Maya is

- A first-year Computer Science student at a large public university (a fictional name is fine)
- Wants a software engineering internship early on, like a first- or second-year program such as Google STEP
- Interested in machine learning and in education: helping other students learn
- Works part-time as a tutor, about 12 hours a week, so she has roughly 10 hours a week for extra study

## What her background should include

Write these in naturally, wherever they'd show up in real documents. They don't need to be stated in any particular way. The agent should be able to find them on its own.

- **Strong Python:** she built a real project, e.g. a small web app (Flask + SQLite) that her high school's peer-tutoring program used to book sessions. Real numbers help.
- **Java from AP Computer Science A**, with a decent score
- **Recursion is shaky:** somewhere, probably an essay, she's honest that recursion confused her
- **No graph algorithms yet, and no linear algebra yet.** These are the gaps the demo fills.
- **Strong calculus** (e.g. AP Calculus BC)
- **A little statistics**, not a full course
- **Excited about ML but has barely touched it**: maybe one online tutorial
- **Tutoring experience**: what she tutors and something she achieved
- **A skills list that claims a little more than her projects show** (e.g. C++ listed but never used anywhere), like real resumes do

The same project can appear in several documents: resume, LinkedIn, essay. Real students repeat themselves, and the agent should count it once.

---

## Pasted documents

<!-- Paste any documents here as text, with a short label above each (e.g. "Resume", "PIQ 1"). Or put files in seed/persona/. -->
