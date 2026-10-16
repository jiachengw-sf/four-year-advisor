# Demo persona (owner: A)

A **fake but realistic** student. The Input agent reads this resume and essay during the live demo, so the details are designed to produce a specific, interesting skill profile. Please follow the brief below, then fill in the two sections at the bottom.

## Rules

- **Fictional person.** Don't copy a real resume, and don't use real people's names.
- **No contact details:** no phone number, email, home address, or LinkedIn URL. This repo is public.
- **Plain text only**, pasted below. No PDF.
- **Resume:** about one page (350–450 words). **Essay:** at most 350 words, the UC Personal Insight Question limit.
- **Keep the name Maya Lopez.** The sample data in `samples/` already uses it.

## Who she is

| Field | Value |
|---|---|
| Name | Maya Lopez |
| Year | First-year, fall quarter (class of 2030) |
| School | A large public university (a fictional name is fine) |
| Major | Computer Science |
| Career goal | A software engineering internship early on, e.g. a first- or second-year program like Google STEP |
| Interests | Machine learning, education (helping other students learn) |
| Time | Works about 12 hours a week as a tutor, so she has about **10 hours a week** for extra study. Say this somewhere, ideally in the essay. |

## What the documents need to show

Each row is a skill the agent should find. "Strength" is the result we want. The catalog will use the same skill ids, so whoever writes `seed/skills.csv` needs to include all of them.

| Skill id | Strength we want | Put this in the documents |
|---|---|---|
| `python_basics` | **Strong** (~0.75) | A real project she built in Python, with a number in it (users, sessions, lines of code) |
| `web_dev` | Medium (~0.5) | The same project is a small Flask web app with HTML templates |
| `databases` | Light (~0.3) | The app stores data in SQLite, mentioned once |
| `java` | Medium (~0.5) | AP Computer Science A, with a score (e.g. 4) |
| `recursion` | **Weak** (~0.35) | In the essay, an honest moment where recursion confused her in AP CS. Specific: a problem she got stuck on. |
| `data_structures` | Light (~0.3) | AP CS covered arrays and ArrayLists. No trees or graphs. |
| `graph_algorithms` | **None** | Don't mention it. This is the gap the demo fills. |
| `calculus` | Strong (~0.7) | AP Calculus BC, with a score (e.g. 5) |
| `linear_algebra` | **None** | Not taken yet. Can mention she plans to take it. |
| `statistics` | Light (~0.3) | One unit or a short Khan Academy course, not a full class |
| `ml_basics` | **Exposure only** (~0.15) | Followed one online tutorial (e.g. a Kaggle intro). The essay is enthusiastic about ML, but she hasn't really built anything. |
| `git` | Self-reported | Listed in a "Skills:" line only, never shown in a project |
| `teaching` | Medium (~0.6) | The tutoring job: what she tutors, how many students, one concrete result |

## Three tests built into the documents

These check that the Input agent follows its rules:

1. **Self-report test:** the resume's "Skills:" line also lists **C++**, which appears nowhere else. The agent should give it low confidence, or leave it out if C++ isn't in the catalog.
2. **Enthusiasm test:** the essay talks excitedly about ML, but the only evidence is one tutorial. The agent should keep `ml_basics` mastery at about 0.2 or below.
3. **Double-counting test:** the Flask tutoring app appears in both the resume and the essay. The agent should count it as one piece of evidence.

## Resume outline

1. **Header:** name, school, "B.S. Computer Science, expected 2030". No contact details.
2. **Education:** the university (first quarter, intro CS course in progress) and a high school (fictional name), with AP CS A, AP Calc BC, and optional GPA.
3. **Projects (2):**
   - The Flask + SQLite tutoring scheduler she built for her high school's peer-tutoring program, with a number (e.g. "used by 120 students to book 400+ sessions")
   - A small ML attempt: "Followed Kaggle's Titanic tutorial to train a first model"
4. **Experience:** part-time math tutor at a learning center, 12 hrs/week. What she does and one result.
5. **Activities (1–2):** e.g. coding club or robotics. Keep it short.
6. **Skills:** "Python, Java, HTML/CSS, SQL, Git, C++". C++ is the deliberate self-report test.

## Essay outline (UC PIQ #6: "your favorite academic subject")

1. **Hook:** a classmate at tutoring couldn't find a free time slot, so she built the scheduler.
2. **The struggle:** in AP CS, a recursion problem (e.g. a maze or Tower of Hanoi) she couldn't get for days, and how she still isn't fully comfortable with it. Be honest. This drives the demo's "verify recursion" moment.
3. **The spark:** she wonders whether ML could match students with the right tutor or practice problems, and admits she's only done one tutorial.
4. **What's next:** she wants a software internship early, and she's working on finding time around her 12-hour tutoring job, with about 10 hours a week to spare.

---

## Resume

<!-- Paste the demo student's resume text here. -->

## Essay

<!-- Paste the demo student's essay text here. -->
