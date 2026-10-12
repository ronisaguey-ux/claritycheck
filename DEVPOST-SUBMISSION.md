# ClarityCheck — ForgeHacks Online 2026 submission

**Track:** AI + Education

## Inspiration

Every teacher has handed back a paper full of red marks. The student looks at the mark, shrugs, and
makes the same mistake again next week. A grade tells you *that* something was wrong; it never
explains the reasoning that went wrong underneath it. A teacher with thirty papers on the desk has
no realistic way to unpack each one, so the same misunderstanding spreads quietly through the class
and nobody ever sees it as a pattern.

## What it does

ClarityCheck takes a class's answers to one question and, for each answer, names the *misconception*
behind it — `sign_error`, `unit_confusion`, `conceptual_gap`, `arithmetic_slip`, `misread_question`,
`incomplete_reasoning`, or `correct` — and writes a short explanation aimed at the student. It then
rolls the whole class up into a ranked top-misconceptions chart and drafts a suggested mini-lesson
targeting the biggest one.

## How we built it

It is deliberately thin and honest. A single serverless function takes the question and the batch of
answers, builds one structured prompt, and calls any OpenAI-compatible model. The response must come
back as strict JSON, and every label is validated against the fixed set above, so the UI cannot
render a hallucinated category. There is no model lock-in, no fine-tuning, and no data leaving the
chosen endpoint. The front end is a single static page that posts to the endpoint and renders the
results table, the chart, and the mini-lesson.

## Challenges

The hard part is not the model call — it is making the output trustworthy. An LLM will happily invent
a plausible-sounding misconception label, so we validate every field against the fixed taxonomy and
fall back gracefully. We also had to keep the feedback student-facing (a sentence they can act on)
rather than teacher-facing jargon.

## Accomplishments

A working, deployable diagnosis pipeline that turns a stack of marked papers into a diagnosis, a
class-wide pattern, and a plan for tomorrow — running on any model the user already has.

## What we learned

Misconception-level feedback is where the learning actually happens, and a small, strictly-typed
output schema is what makes LLM output usable in a classroom at all.

## What's next

Wire it into an LMS so a teacher can run it on a real quiz in one click, and add a per-student
history so a student can see their own recurring misconception over time.

## Built with

JavaScript, Node.js, an OpenAI-compatible LLM endpoint, HTML/CSS.
