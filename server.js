require('dotenv').config({ path: __dirname + '/.env' });
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// Helper: extract JSON object from a text that may include code fences or extra prose
function parseAIJSON(text) {
  if (!text) return null;
  let s = String(text).trim();
  // normalize smart quotes
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  // extract inside fenced blocks: ```json ... ``` or ``` ... ```
  const fence = s.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  if (fence && fence[1]) s = fence[1].trim();
  // remove leading 'json' token
  s = s.replace(/^json\s*/i, "").trim();
  // grab first {...} block if surrounded by prose
  const obj = s.match(/\{[\s\S]*\}/);
  if (obj) s = obj[0];
  try { return JSON.parse(s); } catch { return null; }
}

// Gemini API key from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
if (!GEMINI_API_KEY) {
  console.warn("[WARN] GEMINI_API_KEY is not set. Please set it in .env");
}

const upload = multer({ dest: "uploads/" });

// Model selection (set to Gemini 2.5 Pro per request)
const GEMINI_TEXT_MODEL = "gemini-2.5-pro";

// Simple in-memory cache with TTL
const cache = {
  weather: new Map(), // key: `${lat.toFixed(2)},${lon.toFixed(2)},${lang}`
  schemes: new Map(), // key: lang
  translate: new Map(), // key: `${target}:${hash(texts)}`
};
const TTL = {
  weather: 10 * 60 * 1000, // 10 minutes
  schemes: 60 * 60 * 1000, // 1 hour
  translate: 24 * 60 * 60 * 1000, // 24 hours
};

function getCache(map, key, ttl) {
  const v = map.get(key);
  if (!v) return null;
  if (Date.now() - v.t > ttl) { map.delete(key); return null; }
  return v.data;
}
function setCache(map, key, data) { map.set(key, { t: Date.now(), data }); }

async function callGeminiText(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  let delay = 800; // ms
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (resp.ok) return await resp.json();
      let shouldRetry = false;
      let body = null;
      try { body = await resp.json(); } catch {}
      const code = body?.error?.code || resp.status;
      const status = (body?.error?.status || '').toUpperCase();
      const msg = String(body?.error?.message || '').toLowerCase();
      if (code === 429 || code === 503 || status === 'RESOURCE_EXHAUSTED' || status === 'UNAVAILABLE' || msg.includes('quota') || msg.includes('unavailable') || msg.includes('retry')) {
        shouldRetry = true;
      }
      if (!shouldRetry || attempt === 3) return body || { error: { code, status, message: 'Request failed' } };
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, 5000);
    } catch (e) {
      if (attempt === 3) return { error: { status: 'NETWORK_ERROR', message: e.message } };
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, 5000);
    }
  }
}

// Resilient multimodal (image + text) Gemini helper with retries and basic backoff
async function callGeminiMultimodal(imageBase64, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  let delay = 800; // ms
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
              ]
            }
          ]
        })
      });
      if (resp.ok) return await resp.json();
      let shouldRetry = false;
      let body = null;
      try { body = await resp.json(); } catch {}
      const code = body?.error?.code || resp.status;
      const status = (body?.error?.status || '').toUpperCase();
      const msg = String(body?.error?.message || '').toLowerCase();
      if (code === 429 || code === 503 || status === 'RESOURCE_EXHAUSTED' || status === 'UNAVAILABLE' || msg.includes('quota') || msg.includes('unavailable') || msg.includes('retry')) {
        shouldRetry = true;
      }
      if (!shouldRetry || attempt === 3) return body || { error: { code, status, message: 'Request failed' } };
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, 5000);
    } catch (e) {
      if (attempt === 3) return { error: { status: 'NETWORK_ERROR', message: e.message } };
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 2, 5000);
    }
  }
}

// Simple translation endpoint
app.post('/translate', async (req, res) => {
  try {
    const { texts, target } = req.body || {};
    if (!Array.isArray(texts) || !texts.length) {
      return res.status(400).json({ error: "'texts' must be a non-empty array" });
    }
    const tgt = String(target || 'hi').toLowerCase();
    const prompt = `Translate the following array of strings to ${tgt === 'hi' ? 'Hindi' : 'English'}. Return STRICT JSON as {"translations": ["...", "...", ...]} with the same order and length as input. If a string is empty, return an empty string in that position. Input JSON: ${JSON.stringify({ texts })}`;
    const tkey = `tr:${target}:${JSON.stringify(texts).slice(0,200)}`;
    const tcache = getCache(cache.translate, tkey, TTL.translate);
    if (tcache) return res.json({ translations: tcache, raw: '' });
    const j = await callGeminiText(prompt);
    const text = j.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parseAIJSON(text) || {};
    const translations = Array.isArray(parsed.translations) ? parsed.translations : texts.map(x => String(x||''));
    setCache(cache.translate, tkey, translations);
    res.json({ translations, raw: text });
  } catch (e) {
    console.error('/translate error:', e);
    res.status(500).json({ error: 'Translate failed' });
  }
});

// Simple chat endpoint using the same Gemini model for text responses
app.post("/chat", async (req, res) => {
  try {
    const { message, lang } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Missing 'message' in request body" });
    }
    const isHindi = String(lang).toLowerCase() === 'hi';
    const data = await callGeminiText(`You are an agriculture assistant for Indian farmers. Keep answers short and practical.${isHindi ? " Respond in Hindi." : " Respond in English."}\n\nUser: ${message}`);
    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) {
      const apiErr = (data && data.error && data.error.message) ? String(data.error.message) : '';
      if (apiErr) console.warn('/chat Gemini error:', apiErr);
      // Log truncated payload for debugging
      try { console.warn('Gemini raw:', JSON.stringify(data).slice(0, 500)); } catch {}
      // Localized fallback when service is unavailable
      reply = isHindi
        ? 'सेवा अस्थायी रूप से उपलब्ध नहीं है। कृपया 1–2 मिनट बाद पुनः प्रयास करें।'
        : 'The service is temporarily unavailable. Please try again in 1–2 minutes.';
    }
    res.json({ reply });
  } catch (err) {
    console.error("/chat error:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

// Mental therapy assistant (empathetic, non-clinical support)
app.post("/therapy", async (req, res) => {
  try {
    const { message, lang } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' in request body" });
    }
    const isHindi = String(lang).toLowerCase() === 'hi';

    // Simple keyword screening for crisis content to ensure we add immediate help guidance
    const crisisRegex = /(suicide|self\s*-?harm|kill\s*myself|end\s*my\s*life|hang\s*myself|overdose|cutting|I am worthless|I can't go on)/i;
    const isCrisis = crisisRegex.test(message);

    const systemPrompt = `You are a supportive, empathetic mental well-being companion for users in India.
Goals:
- Validate feelings, reflect back, and suggest simple, practical coping tools (breathing, grounding, journaling, micro-steps, reaching out to trusted people).
- Be brief, compassionate, and non-judgmental. Use simple language.
- Avoid clinical diagnosis or definitive medical claims. Do not replace professional care.
- Encourage seeking professional help if appropriate.
- If the user expresses potential self-harm or crisis, prioritize safety language and provide immediate help instructions and helplines in India.

Style:
- 2–5 short paragraphs or bullet points max.
- Offer 1–3 small actionable steps the user can try right now.
- End with a gentle opt-in question (e.g., “Would you like to try a short breathing exercise together?”).

Safety:
- Do NOT provide instructions that could cause harm.
- If crisis is detected, include a short urgent help note with Indian resources.
${isHindi ? "Respond in Hindi." : "Respond in English."}`;

    const crisisNoteEn = `\n\nIf you are in immediate danger or thinking about harming yourself, you deserve care right now. Please contact:\n- Kiran Mental Health Helpline (India): 1800-599-0019 (24x7)\n- iCall: +91-9152987821 or email icall@tiss.edu\n- Emergency services: 112\nIf you can, reach out to a trusted friend/family member nearby.`;
    const crisisNoteHi = `\n\nयदि आप तुरंत खतरे में हैं या स्वयं को नुकसान पहुँचाने के विचार आ रहे हैं, तो कृपया अभी मदद लें:\n- किरण मानसिक स्वास्थ्य हेल्पलाइन (भारत): 1800-599-0019 (24x7)\n- iCall: +91-9152987821 या icall@tiss.edu\n- आपातकालीन सेवा: 112\nयदि संभव हो तो किसी भरोसेमंद मित्र/परिवार के सदस्य से तुरंत संपर्क करें।`;

    const prompt = `${systemPrompt}\n\nUser message: "${message}"\n\nRespond in plain text.`;

    const data = await callGeminiText(prompt);
    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text || (isHindi ? "मैं आपके साथ हूँ। क्या आप एक छोटा ग्राउंडिंग अभ्यास करना चाहेंगे?" : "I'm here for you. Would you like to try a short grounding exercise together?");
    if (isCrisis) {
      reply += (isHindi ? crisisNoteHi : crisisNoteEn);
    }
    // Append universal disclaimer
    reply += isHindi ? "\n\nनोट: मैं एक AI सहायक हूँ और पेशेवर देखभाल का विकल्प नहीं हूँ।" : "\n\nNote: I’m an AI assistant and not a substitute for professional care.";

    res.json({ reply, crisis: isCrisis });
  } catch (err) {
    console.error("/therapy error:", err);
    res.status(500).json({ error: "Therapy chat failed" });
  }
});

// Weather endpoint using Open-Meteo (no API key required)
app.get("/weather", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const lang = String(req.query.lang || '').toLowerCase();
    if (!isFinite(lat) || !isFinite(lon)) {
      return res.status(400).json({ error: "Invalid or missing lat/lon" });
    }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m` +
      `&hourly=precipitation_probability,precipitation,rain&timezone=auto`;
    // Weather cache
    const ckey = `${lat.toFixed(2)},${lon.toFixed(2)},${lang}`;
    const cached = getCache(cache.weather, ckey, TTL.weather);
    if (cached) return res.json(cached);

    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: "Weather provider error" });
    const j = await r.json();
    const current = j.current || j.current_weather || {};

    // Compute rain probability stats from hourly series (if available)
    const hourly = j.hourly || {};
    const times = Array.isArray(hourly.time) ? hourly.time : [];
    const probs = Array.isArray(hourly.precipitation_probability) ? hourly.precipitation_probability : [];
    const precip = Array.isArray(hourly.precipitation) ? hourly.precipitation : [];

    const nowMs = Date.now();
    let nowIdx = 0;
    for (let i = 0; i < times.length; i++) {
      const t = Date.parse(times[i]);
      if (isFinite(t) && t >= nowMs) { nowIdx = i; break; }
      if (i === times.length - 1) nowIdx = i;
    }

    function sliceWindow(n) {
      const end = Math.min(times.length, nowIdx + n);
      return {
        probs: probs.slice(nowIdx, end).filter(v => typeof v === 'number'),
        precip: precip.slice(nowIdx, end).filter(v => typeof v === 'number'),
      };
    }

    const w3 = sliceWindow(3);
    const w12 = sliceWindow(12);
    const w24 = sliceWindow(24);

    const max = (arr) => arr.length ? Math.max(...arr) : null;
    const sum = (arr) => arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

    const rainStats = {
      now_probability: (typeof probs[nowIdx] === 'number') ? probs[nowIdx] : null,
      next_3h_max_probability: max(w3.probs),
      next_12h_max_probability: max(w12.probs),
      next_24h_max_probability: max(w24.probs),
      next_24h_precip_sum_mm: Number(sum(w24.precip).toFixed(2)),
      upcoming_hours: times.slice(nowIdx, Math.min(times.length, nowIdx + 24)).map((t, k) => ({
        time: t,
        probability: typeof probs[nowIdx + k] === 'number' ? probs[nowIdx + k] : null,
        precip_mm: typeof precip[nowIdx + k] === 'number' ? precip[nowIdx + k] : null,
      })),
    };

    // Use Gemini to summarize weather into farmer-friendly guidance
    let summary = "";
    try {
      const weatherPrompt = `You are an agriculture assistant for Indian farmers. Based on the following current weather data, provide a brief farmer-friendly summary (2-4 short bullet points) including any actionable advice for irrigation, spraying, or harvesting. Keep it concise and practical.${lang === 'hi' ? ' Respond in Hindi.' : ' Respond in English.'}\n\nData JSON: ${JSON.stringify(current)}`;
      const dj = await callGeminiText(weatherPrompt);
      summary = dj.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (e) {
      console.warn("Gemini weather summary failed:", e.message);
    }
    const out = { current, summary, rain: rainStats };
    setCache(cache.weather, ckey, out);
    res.json(out);
  } catch (err) {
    console.error("/weather error:", err);
    res.status(500).json({ error: "Weather failed" });
  }
});

// Latest schemes using Gemini to produce a structured list
app.get('/schemes', async (req, res) => {
  try {
    const lang = String(req.query.lang || '').toLowerCase();
    const prompt = `List the latest Indian Government schemes relevant to farmers. Return STRICT JSON array named schemes with objects having fields: title, desc, link, eligibility, how_to_apply. Keep descriptions short. Provide official links where possible.${lang === 'hi' ? ' Respond in Hindi.' : ' Respond in English.'} Example: {"schemes": [{"title": "...", "desc": "...", "link": "https://...", "eligibility": "...", "how_to_apply": "..."}]}`;
    const skey = `schemes:${lang}`;
    const scached = getCache(cache.schemes, skey, TTL.schemes);
    if (scached) return res.json(scached);
    const gj = await callGeminiText(prompt);
    const text = gj.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parseAIJSON(text);
    let schemes = parsed?.schemes && Array.isArray(parsed.schemes) ? parsed.schemes : [];
    if (!schemes.length) {
      // Fallback minimal curated list
      if (lang === 'hi') {
        schemes = [
          { title: 'प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)', desc: 'छोटे और सीमांत किसानों को प्रति वर्ष ₹6,000 की वित्तीय सहायता, 3 किस्तों में।', link: 'https://pmkisan.gov.in/', eligibility: 'भूमि रिकॉर्ड के अनुसार योग्य किसान परिवार।', how_to_apply: 'राज्य/जिला कृषि विभाग या PM-KISAN पोर्टल पर पंजीकरण।' },
          { title: 'प्रधानमंत्री फसल बीमा योजना (PMFBY)', desc: 'कम प्रीमियम पर फसल बीमा, प्राकृतिक आपदाओं से सुरक्षा।', link: 'https://pmfby.gov.in/', eligibility: 'किसान (किरायेदार/बटाईदार सहित) जो नामित फसल बोते हैं।', how_to_apply: 'निकटतम बैंक/CSC/बीमा कंपनी या PMFBY पोर्टल से आवेदन।' },
          { title: 'मृदा स्वास्थ्य कार्ड योजना', desc: 'मिट्टी की जाँच और सिफारिशों के साथ स्वास्थ्य कार्ड।', link: 'https://soilhealth.dac.gov.in/', eligibility: 'सभी किसान।', how_to_apply: 'कृषि विभाग/कृषि विज्ञान केंद्र में नमूना देकर।' },
          { title: 'प्रधानमंत्री कृषि सिंचाई योजना (PMKSY)', desc: 'सिंचाई विस्तार, माइक्रो-इरिगेशन पर सहायता।', link: 'https://pmksy.gov.in/', eligibility: 'राज्य दिशा-निर्देश अनुसार किसान।', how_to_apply: 'राज्य कृषि/सिंचाई विभाग के माध्यम से आवेदन।' },
        ];
      } else {
        schemes = [
          { title: 'PM-KISAN', desc: 'Income support of ₹6,000 per year to eligible farmer families in three installments.', link: 'https://pmkisan.gov.in/', eligibility: 'Eligible farmer families as per land records.', how_to_apply: 'Register via State/ District Agriculture Department or PM-KISAN portal.' },
          { title: 'PM Fasal Bima Yojana (PMFBY)', desc: 'Crop insurance at low premium; protection from natural risks.', link: 'https://pmfby.gov.in/', eligibility: 'Farmers (including tenant/sharecroppers) sowing notified crops.', how_to_apply: 'Apply via nearest Bank/CSC/Insurer or PMFBY portal.' },
          { title: 'Soil Health Card Scheme', desc: 'Soil testing and recommendations with a health card.', link: 'https://soilhealth.dac.gov.in/', eligibility: 'All farmers.', how_to_apply: 'Submit soil sample via Agriculture Dept/KVK.' },
          { title: 'PM Krishi Sinchayee Yojana (PMKSY)', desc: 'Irrigation expansion and support for micro‑irrigation.', link: 'https://pmksy.gov.in/', eligibility: 'As per State guidelines.', how_to_apply: 'Apply via State Agriculture/Irrigation Dept.' },
        ];
      }
    }
    const out = { schemes, raw: text };
    setCache(cache.schemes, skey, out);
    res.json(out);
  } catch (e) {
    console.error('/schemes error:', e);
    res.status(500).json({ error: 'Schemes fetch failed' });
  }
});

app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    const lang = String(req.query.lang || '').toLowerCase();
    const imagePath = req.file.path;
    const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

    // Use resilient multimodal helper
    const prompt = `Analyze this crop image. If diseased, respond in STRICT JSON format with keys disease, cause, remedies (array). ${lang === 'hi' ? 'Write the values in Hindi. Keep keys in English.' : 'Write the values in English.'}`;
    const data = await callGeminiMultimodal(imageBase64, prompt);

    // Optional: log Gemini response (trim to avoid huge logs)
    try { console.log("Gemini response:", JSON.stringify(data).slice(0, 2000)); } catch {}

    fs.unlinkSync(imagePath); // delete uploaded image

    // Parse result safely
    let resultText = lang === 'hi' ? 'क्षमा करें, मैं छवि का विश्लेषण नहीं कर सका।' : 'Sorry, I could not analyze the image.';
    if (data?.error) {
      const status = String(data.error.status || '').toUpperCase();
      const msg = String(data.error.message || '');
      console.warn('/analyze Gemini error:', status, msg);
      // Localized friendly fallback for service unavailability
      if (status === 'UNAVAILABLE' || data.error.code === 503) {
        resultText = lang === 'hi'
          ? 'सेवा अस्थायी रूप से उपलब्ध नहीं है। कृपया 1–2 मिनट बाद पुनः प्रयास करें।'
          : 'The service is temporarily unavailable. Please try again in 1–2 minutes.';
      } else {
        // Brief error message
        resultText = msg || resultText;
      }
    } else if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      resultText = data.candidates[0].content.parts[0].text;
    }
    let parsed = parseAIJSON(resultText);
    let resultTranslated = null;

    // If Hindi requested and we have a parsed object, translate values to Hindi while keeping keys
    if (lang === 'hi' && parsed && typeof parsed === 'object') {
      try {
        const translatePrompt = `Translate the VALUES of the following JSON to Hindi. Keep the JSON structure and keys (disease, cause, remedies) in English. Return ONLY JSON.\n\n${JSON.stringify(parsed)}`;
        const tj = await callGeminiText(translatePrompt);
        const ttext = tj?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const tparsed = parseAIJSON(ttext);
        if (tparsed && typeof tparsed === 'object') parsed = tparsed;
      } catch (e) {
        console.warn('Hindi translation failed:', e.message);
      }
    }

    // If no JSON parsed and Hindi requested, translate raw summary text to Hindi
    if (lang === 'hi' && (!parsed || typeof parsed !== 'object') && resultText) {
      try {
        const trPrompt = `Translate the following text into Hindi, preserving the original meaning. Return plain text only.\n\n${resultText}`;
        const tj2 = await callGeminiText(trPrompt);
        resultTranslated = tj2?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      } catch (e) {
        console.warn('Hindi summary translation failed:', e.message);
      }
    }

    res.json({ result: resultText, parsed, result_translated: resultTranslated });
  } catch (error) {
    console.error("Error analyzing image:", error);
    res.status(500).json({ error: "Failed to analyze image" });
  }
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
