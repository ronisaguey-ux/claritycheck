// ClarityCheck classifier — provider-agnostic.
//
// Takes a batch of student answers and returns, for each: a misconception label and a
// one-sentence student-facing explanation. Plus a class-level summary of the top
// misconceptions. The LLM call is OpenAI-compatible, so the same function runs against
// a free local router (free-ai) or Featherless in production — only env vars change:
//
//   LLM_BASE_URL   default https://api.featherless.ai/v1
//   LLM_API_KEY    the provider key
//   LLM_MODEL      default a small instruct model
//
// Runs three ways: as a Vercel/Netlify serverless handler, as a plain Node HTTP server
// (node classify.js), or imported for tests.

const DEFAULT_BASE = process.env.LLM_BASE_URL || "https://api.featherless.ai/v1";
const DEFAULT_KEY = process.env.LLM_API_KEY || "";
const DEFAULT_MODEL = process.env.LLM_MODEL || "meta-llama/Meta-Llama-3.1-8B-Instruct";

const SYSTEM = `You are a teaching assistant that diagnoses WHY a student's answer is wrong.
For each answer, name the misconception in a short category and explain it to the student in one
sentence. Use these categories when they fit: sign_error, unit_confusion, conceptual_gap,
arithmetic_slip, misread_question, incomplete_reasoning, correct. Never invent work the student
did not do.

Return ONLY JSON: {"results":[{"id":"...","label":"...","explanation":"..."}],
"top_misconceptions":[{"label":"...","count":N}],"mini_lesson":"..."}`;

async function classify(items, question) {
  const body = {
    model: DEFAULT_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: JSON.stringify({ question, answers: items }) },
    ],
  };
  const res = await fetch(DEFAULT_BASE.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEFAULT_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const out = await res.json();
  const text = out.choices[0].message.content;
  try { return JSON.parse(text); }
  catch { const s = text.indexOf("{"), e = text.lastIndexOf("}"); return JSON.parse(text.slice(s, e + 1)); }
}

// ── serverless handler (Vercel / Netlify) ───────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { question = "", answers = [] } = req.body || {};
    if (!Array.isArray(answers) || !answers.length) return res.status(400).json({ error: "answers[] required" });
    const items = answers.map((a, i) => (typeof a === "string" ? { id: String(i + 1), answer: a } : a));
    res.status(200).json(await classify(items, question));
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}

// ── combined local server (static page + API) for demo/testing: node classify.js ──
if (import.meta.url === `file://${process.argv[1]}`) {
  const http = await import("node:http");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const PUB = path.join(path.dirname(process.argv[1]), "..", "public");
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };

  http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url.startsWith("/api/classify")) {
      let buf = ""; for await (const c of req) buf += c;
      try {
        const { question, answers } = JSON.parse(buf || "{}");
        const items = (answers || []).map((a, i) => (typeof a === "string" ? { id: String(i + 1), answer: a } : a));
        const result = await classify(items, question || "");
        res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }
    // static
    let p = path.normalize(decodeURIComponent(req.url.split("?")[0]));
    if (p === "/" || p === "\\") p = "/index.html";
    const file = path.join(PUB, p);
    if (!file.startsWith(PUB) || !fs.existsSync(file)) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  }).listen(process.env.PORT || 8788, () => console.log(`ClarityCheck on http://127.0.0.1:${process.env.PORT || 8788}`));
}
