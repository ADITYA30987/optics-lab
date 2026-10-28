import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "12mb" }));
app.use(express.static(__dirname));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.OPENROUTER_API_KEY),
    provider: "OpenRouter free-model router"
  });
});

function extractJson(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("AI did not return a JSON object.");
  return JSON.parse(cleaned.slice(first, last + 1));
}

app.post("/api/generate", async (req, res) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "OPENROUTER_API_KEY is not configured in the server environment." });
    }

    const { prompt, imageData, mode } = req.body ?? {};
    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Please enter a prompt or image instructions." });
    }
    if (imageData && (typeof imageData !== "string" ||
      !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(imageData))) {
      return res.status(400).json({ error: "Image must be a supported PNG, JPEG, WEBP, or GIF data URL." });
    }
    if (imageData && imageData.length > 8_000_000) {
      return res.status(413).json({ error: "Image is too large. Please use an image under about 5 MB." });
    }

    const instructions = `You are the model-planning assistant for OPTICS LAB, an educational geometrical-optics simulator.
Interpret the user request${mode === "image" ? " and attached optics question/diagram" : ""}.
Return ONLY one valid JSON object, no Markdown fences, with this exact shape:
{
 "title":"short title",
 "modelType":"concaveMirror|convexMirror|convexLens|concaveLens|tir|other",
 "summary":"what the experiment is about",
 "controls":["suggested control 1"],
 "physics":["equation or principle 1"],
 "educationalNotes":"assumptions and sign-convention caveats",
 "parameters":{"objectDistanceCm":30,"focalLengthCm":15}
}
Choose only a modelType from the allowed list. If the request does not map to a supported model, choose other rather than inventing a setup. objectDistanceCm must be from 5 to 100; focalLengthCm from 5 to 35. For TIR, these two values are placeholders only. Do not claim that equations have been numerically verified. Make physics caveats clear. User prompt: ${prompt}`;

    const userContent = [{ type: "text", text: instructions }];
    if (imageData) userContent.push({ type: "image_url", image_url: { url: imageData } });

    const apiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title": "OPTICS LAB"
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openrouter/free",
        messages: [{ role: "user", content: userContent }],
        temperature: 0.2,
        max_tokens: 1200
      })
    });

    const payload = await apiResponse.json().catch(() => ({}));
    if (!apiResponse.ok) {
      console.error("OpenRouter error:", payload?.error?.message || apiResponse.status);
      return res.status(apiResponse.status === 429 ? 429 : 502).json({
        error: apiResponse.status === 429
          ? "The free AI service rate limit was reached. Try again later."
          : "The free AI service could not complete the request. Try again later or check the server configuration."
      });
    }

    const raw = payload?.choices?.[0]?.message?.content;
    const text = Array.isArray(raw) ? raw.map(part => part.text || "").join("\n") : raw;
    let model;
    try {
      model = extractJson(text);
    } catch {
      return res.status(502).json({ error: "The AI response was not valid JSON. Please try again." });
    }

    const allowed = new Set(["concaveMirror", "convexMirror", "convexLens", "concaveLens", "tir", "other"]);
    if (!allowed.has(model.modelType)) model.modelType = "other";
    model.parameters = model.parameters || {};
    model.parameters.objectDistanceCm = Math.min(100, Math.max(5, Number(model.parameters.objectDistanceCm) || 30));
    model.parameters.focalLengthCm = Math.min(35, Math.max(5, Number(model.parameters.focalLengthCm) || 15));
    model.controls = Array.isArray(model.controls) ? model.controls.map(String).slice(0, 8) : [];
    model.physics = Array.isArray(model.physics) ? model.physics.map(String).slice(0, 8) : [];
    model.title = String(model.title || "Optics concept").slice(0, 120);
    model.summary = String(model.summary || "").slice(0, 2000);
    model.educationalNotes = String(model.educationalNotes || "").slice(0, 2000);
    res.json({ model });
  } catch (err) {
    console.error("Request failed:", err?.message || "Unknown error");
    res.status(500).json({ error: "The request failed. Check server logs and try again." });
  }
});

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "optics_lab_ai_connected_frontend.html")));
app.listen(port, () => console.log(`OPTICS LAB listening on http://localhost:${port}`));
