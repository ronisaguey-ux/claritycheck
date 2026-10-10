# ClarityCheck

**Teachers see *that* a student is wrong. ClarityCheck shows *why*.**

Automated grading marks an answer wrong and moves on. That tells a student nothing and tells a
teacher even less — a class of thirty has thirty private misunderstandings and no way to see the
pattern. ClarityCheck reads a batch of answers and returns, for each one, the *misconception* behind
it plus a one-sentence explanation written to the student — then rolls the whole class up into its
top misconceptions and a suggested mini-lesson.

## What it does

1. Paste or upload a class's answers to one question (CSV, one answer per row).
2. Each answer gets a **misconception label** — `sign_error`, `unit_confusion`, `conceptual_gap`,
   `arithmetic_slip`, `misread_question`, `incomplete_reasoning`, or `correct` — and a short,
   student-facing explanation of the error.
3. The class is summarised: a **top-misconceptions chart** and a **suggested mini-lesson** the
   teacher can run tomorrow.

## Why it matters

- A student gets feedback on the *reasoning*, which is what actually teaches.
- A teacher gets the aggregate view that no gradebook provides: "nine of thirty made a sign error,
  teach that once."
- It is a thin API: any LMS or tutoring product can call it on a batch of answers today.

## Architecture

```
Browser (index.html)                 Serverless function (api/classify.js)
  question + answers  ───POST──▶  ┌──────────────────────────────┐
  results table                   │  build prompt                 │
  misconception chart  ◀──JSON──  │  call LLM (OpenAI-compatible) │
  mini-lesson                     │  parse + validate JSON        │
                                  └──────────────┬───────────────┘
                                                 ▼
                        any OpenAI-compatible endpoint
                        (Featherless in production; a local
                         router for development — env vars only)
```

The LLM call is provider-agnostic — `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. That is deliberate:
the app is not tied to one vendor, and it runs offline for development and demos.

## Run it

```sh
# dev: point at any OpenAI-compatible endpoint
export LLM_BASE_URL=https://api.featherless.ai/v1
export LLM_API_KEY=<your key>
export LLM_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct
node api/classify.js          # serves the page + /api/classify on :8788
# open http://127.0.0.1:8788
```

Deploy: the `api/classify.js` default export is a Vercel/Netlify serverless handler; `public/` is
static. No build step.

## Evaluation

Run against a set of answers to `2x + 5 = 13` with a known answer key, ClarityCheck labelled:

| Answer | Expected | Got |
|---|---|---|
| `x = 4` | correct | `correct` |
| `x = -4` | sign error | `sign_error` |
| `x = 9` | arithmetic | `arithmetic_slip` |
| `x = 18` | conceptual | `conceptual_gap` |
| "I divided both sides by 2" | unfinished | `incomplete_reasoning` |

It also produced a teacher-facing mini-lesson from the same batch.

## Limitations

- It judges the *explanation of the error*, not whether the student knows the topic — a lucky guess
  reads as `correct`.
- Performance depends on the underlying model; the batch prompt keeps calls cheap and consistent.
- No PII is stored; answers are processed in the request and returned, not persisted.

## Licence

MIT.
