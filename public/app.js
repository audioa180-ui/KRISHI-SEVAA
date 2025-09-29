// KRISHI SEVA Frontend Interactions
const $ = (s, r = document) => r.querySelector(s);

const state = {
  file: null,
  lang: 'en',
};

// Simple i18n dictionary
const I18N = {
  en: {
    tab_analyzer: 'Analyzer',
    tab_schemes: 'Schemes',
    tab_chat: 'Chatbot',
    tab_therapy: 'Therapy',
    tab_weather: 'Weather',
    hero_title: 'Detect plant diseases instantly',
    hero_sub: 'Upload a photo of your crop. KRISHI SEVA analyzes it using AI and suggests causes and remedies. Designed for Indian farmers with a proud tricolor theme.',
    upload_title: 'Upload your crop image',
    analyze_btn: 'Analyze Image',
    clear_btn: 'Clear',
    result_title: 'Analysis Result',
    schemes_title: 'Latest Government Schemes',
    schemes_refresh: 'Refresh Schemes',
    chat_title: 'Agri Assistant Chatbot',
    chat_placeholder: 'Ask about crops, pests, remedies...',
    send_btn: 'Send',
    therapy_title: 'Mental Wellness Support',
    therapy_placeholder: 'Share how you’re feeling...',
    therapy_disclaimer: 'This is supportive guidance only, not a substitute for professional care.',
    weather_title: 'Weather Report',
    weather_use_loc: 'Use My Location',
    lat_ph: 'Latitude',
    lon_ph: 'Longitude',
    weather_fetch: 'Fetch Weather',
    footer_text: '© {year} KRISHI SEVA • Jai Jawan, Jai Kisan',
    no_image: 'No image selected',
    analyzing: 'Analyzing with AI...',
    err_chat: 'Chat failed.',
    err_therapy: 'Sorry, I can’t respond right now.',
    done: 'Done',
    disease_label: 'Disease',
    cause_label: 'Cause',
    remedies_none: 'No specific remedies provided.',
    err_analyze: 'Failed to analyze. Please try again.',
    must_select_image: 'Please select an image of the crop first.',
    weather_loading: 'Loading weather...',
    weather_error: 'Unable to fetch weather.',
    weather_temperature: 'Temperature',
    weather_feels_like: 'Feels like',
    weather_humidity: 'Humidity',
    weather_wind: 'Wind',
    weather_precip_current: 'Precipitation (current)',
    rain_now: 'Rain chance (now)',
    rain_max_3h: 'Max rain chance (next 3h)',
    rain_max_12h: 'Max rain chance (next 12h)',
    rain_max_24h: 'Max rain chance (next 24h)',
    rain_total_24h: 'Total expected rain (24h)',
    summary_label: 'Summary',
    no_schemes: 'No schemes found right now. Please try Refresh.',
  },
  hi: {
    tab_analyzer: 'विश्लेषक',
    tab_schemes: 'योजनाएँ',
    tab_chat: 'चैटबॉट',
    tab_therapy: 'थेरेपी',
    tab_weather: 'मौसम',
    hero_title: 'फसल की बीमारियाँ तुरंत पहचानें',
    hero_sub: 'अपनी फसल की फोटो अपलोड करें। KRISHI SEVA AI की मदद से कारण और उपचार सुझाता है। भारतीय किसानों के लिए बनाया गया।',
    upload_title: 'अपनी फसल की तस्वीर अपलोड करें',
    analyze_btn: 'छवि विश्लेषण करें',
    clear_btn: 'साफ़ करें',
    result_title: 'विश्लेषण परिणाम',
    schemes_title: 'ताज़ा सरकारी योजनाएँ',
    schemes_refresh: 'योजनाएँ रिफ्रेश करें',
    chat_title: 'कृषि सहायक चैटबॉट',
    chat_placeholder: 'फसलों, कीट, उपायों के बारे में पूछें...',
    send_btn: 'भेजें',
    therapy_title: 'मानसिक स्वास्थ्य सहायता',
    therapy_placeholder: 'आप कैसा महसूस कर रहे हैं, साझा करें...',
    therapy_disclaimer: 'यह केवल सहयोगी मार्गदर्शन है, पेशेवर देखभाल का विकल्प नहीं।',
    weather_title: 'मौसम रिपोर्ट',
    weather_use_loc: 'मेरी लोकेशन का उपयोग करें',
    lat_ph: 'अक्षांश (Latitude)',
    lon_ph: 'देशांतर (Longitude)',
    weather_fetch: 'मौसम प्राप्त करें',
    footer_text: '© {year} KRISHI SEVA • जय जवान, जय किसान',
    no_image: 'कोई छवि चयनित नहीं',
    analyzing: 'AI से विश्लेषण हो रहा है...',
    err_chat: 'चैट विफल हुई।',
    err_therapy: 'माफ़ कीजिए, मैं अभी उत्तर नहीं दे पा रहा/रही हूँ।',
    done: 'हो गया',
    disease_label: 'रोग',
    cause_label: 'कारण',
    remedies_none: 'कोई विशेष उपचार उपलब्ध नहीं।',
    err_analyze: 'विश्लेषण विफल रहा। कृपया पुनः प्रयास करें।',
    must_select_image: 'कृपया पहले फसल की तस्वीर चुनें।',
    weather_loading: 'मौसम लोड हो रहा है...',
    weather_error: 'मौसम प्राप्त नहीं हो सका।',
    weather_temperature: 'तापमान',
    weather_feels_like: 'महसूस तापमान',
    weather_humidity: 'नमी',
    weather_wind: 'हवा',
    weather_precip_current: 'वर्तमान वर्षा (Precipitation)',
    rain_now: 'वर्षा की संभावना (अभी)',
    rain_max_3h: 'अगले 3 घं. में अधिकतम संभावना',
    rain_max_12h: 'अगले 12 घं. में अधिकतम संभावना',
    rain_max_24h: 'अगले 24 घं. में अधिकतम संभावना',
    rain_total_24h: 'अगले 24 घं. में कुल अनुमानित वर्षा',
    summary_label: 'सारांश',
    no_schemes: 'अभी कोई योजना नहीं मिली। कृपया रिफ्रेश करें।',
  }
};

// Compress image before upload to speed up analyze
async function compressImage(file, maxW = 1280, maxH = 1280, quality = 0.72) {
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const ratio = Math.min(maxW / width, maxH / height, 1);
    const w = Math.round(width * ratio);
    const h = Math.round(height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality));
  } catch (_) {
    return file; // fallback: original
  }
}

function applyI18n(lang) {
  state.lang = lang;
  // reflect language in document tag
  try { document.documentElement.lang = lang; } catch {}
  const dict = I18N[lang] || I18N.en;
  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key].replace('{year}', new Date().getFullYear());
  });
  // Placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });
  // Set select value
  const sel = document.getElementById('langSelect');
  if (sel && sel.value !== lang) sel.value = lang;
}

// Attempt to extract a JSON object from an AI text response that may include
// markdown code fences, leading labels (e.g., "json"), or extra prose.
function parseAIJSON(textOrObject) {
  if (!textOrObject) return null;
  if (typeof textOrObject === "object") return textOrObject;
  let s = String(textOrObject).trim();

  // Normalize smart quotes
  s = s
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  // Remove surrounding triple backticks and language hints if present
  // ```json ... ``` or ``` ... ```
  const fenceMatch = s.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  if (fenceMatch && fenceMatch[1]) {
    s = fenceMatch[1].trim();
  }

  // If still has leading 'json' token before the object
  s = s.replace(/^json\s*/i, "").trim();

  // If the text contains other prose, try to extract the first {...} block
  const objMatch = s.match(/\{[\s\S]*\}/);
  if (objMatch) {
    s = objMatch[0];
  }

  try {
    return JSON.parse(s);
  } catch (_) {
    return null;
  }
}

function initDropzone() {
  const dz = $(".dropzone");
  const input = $("#imageInput");
  const previewImg = $(".preview img");
  const placeholder = $(".preview .placeholder");

  const openPicker = () => input.click();
  // Only open picker when clicking the dropzone background, not the action buttons
  dz.addEventListener("click", (e) => {
    const inActions = e.target.closest('.actions');
    if (inActions || e.target === input) return; // ignore clicks on buttons or the input itself
    openPicker();
  });

  input.addEventListener("change", () => {
    if (input.files && input.files[0]) {
      state.file = input.files[0];
      previewImg.src = URL.createObjectURL(state.file);
      previewImg.alt = state.file.name;
      // toggle visibility
      placeholder.style.display = 'none';
      previewImg.style.display = 'block';
    }
  });

  dz.addEventListener("dragover", (e) => {
    e.preventDefault();
    dz.style.background = "rgba(255,255,255,.06)";
  });
  dz.addEventListener("dragleave", () => {
    dz.style.background = "transparent";
  });
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    dz.style.background = "transparent";
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      state.file = e.dataTransfer.files[0];
      input.files = e.dataTransfer.files;
      previewImg.src = URL.createObjectURL(state.file);
      previewImg.alt = state.file.name;
      placeholder.style.display = 'none';
      previewImg.style.display = 'block';
    }
  });

  // Chat send
  const chatSend = $("#chatSend");
  const chatInput = $("#chatMessage");
  if (chatSend && chatInput) {
    const doSend = async () => {
      const msg = chatInput.value.trim();
      if (!msg) return;
      appendChatBubble('user', msg);
      chatInput.value = '';
      chatSend.disabled = true;
      const typing = showTyping('chatWindow');
      try {
        const res = await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, lang: state.lang }) });
        const data = await res.json();
        if (typing) typing.remove();
        appendChatBubble('bot', data.reply || 'No reply');
      } catch (err) {
        if (typing) typing.remove();
        appendChatBubble('bot', I18N[state.lang].err_chat);
      } finally { chatSend.disabled = false; }
    };
    chatSend.addEventListener('click', doSend);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSend(); });
  }

  // Therapy send
  const therapySend = $("#therapySend");
  const therapyInput = $("#therapyMessage");
  if (therapySend && therapyInput) {
    const doTherapySend = async () => {
      const msg = therapyInput.value.trim();
      if (!msg) return;
      appendChatBubbleTo('therapyWindow', 'user', msg);
      therapyInput.value = '';
      therapySend.disabled = true;
      const typing = showTyping('therapyWindow');
      try {
        const res = await fetch('/therapy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, lang: state.lang }) });
        const data = await res.json();
        if (typing) typing.remove();
        appendChatBubbleTo('therapyWindow', 'bot', data.reply || 'I am here to listen.');
      } catch (err) {
        if (typing) typing.remove();
        appendChatBubbleTo('therapyWindow', 'bot', I18N[state.lang].err_therapy);
      } finally { therapySend.disabled = false; }
    };
    therapySend.addEventListener('click', doTherapySend);
    therapyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doTherapySend(); });
  }

  // Weather detect & fetch
  const detectBtn = $("#weatherDetect");
  const fetchBtn = $("#weatherFetch");
  if (detectBtn) {
    detectBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        renderWeatherError('Geolocation not supported');
        return;
      }
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        $("#latInput").value = latitude.toFixed(4);
        $("#lonInput").value = longitude.toFixed(4);
        fetchWeather(latitude, longitude);
      }, (err) => renderWeatherError(err.message || 'Location error'));
    });
  }
  if (fetchBtn) {
    fetchBtn.addEventListener('click', () => {
      const lat = parseFloat($("#latInput").value);
      const lon = parseFloat($("#lonInput").value);
      if (!isFinite(lat) || !isFinite(lon)) {
        renderWeatherError('Please enter valid latitude and longitude');
        return;
      }
      fetchWeather(lat, lon);
    });
  }

  // Refresh schemes using Gemini
  const schemesRefresh = document.getElementById('schemesRefresh');
  if (schemesRefresh) {
    schemesRefresh.addEventListener('click', loadSchemes);
  }
}

function renderResult(data) {
  const wrap = $(".result");
  const pill = $(".result .pill");
  const kv = $(".result .kv");
  const remediesList = $(".result .remedies");

  wrap.classList.add("show");
  const D0 = I18N[state.lang] || I18N.en;
  pill.textContent = D0.result_title;

  kv.innerHTML = "";
  remediesList.innerHTML = "";

  let parsed = null;
  if (data && typeof data === "object") {
    // Prefer server-side parsed JSON if available
    if (data.parsed && typeof data.parsed === "object") {
      parsed = data.parsed;
    } else if ("result" in data) {
      parsed = parseAIJSON(data.result);
      if (!parsed && typeof data.result === "string") {
        // Not JSON, show raw text summary (localized label). Prefer server translated text if provided.
        const D = I18N[state.lang] || I18N.en;
        const text = (state.lang === 'hi' && typeof data.result_translated === 'string' && data.result_translated.trim()) ? data.result_translated : data.result;
        kv.innerHTML = `<div class="row"><div><strong>${D.summary_label}</strong></div><div>${text}</div></div>`;
        return;
      }
    }
  }

  const disease = parsed?.disease || "N/A";
  const cause = parsed?.cause || "N/A";
  const remedies = Array.isArray(parsed?.remedies) ? parsed.remedies : [];

  const D = I18N[state.lang] || I18N.en;
  kv.innerHTML = `
    <div class="row"><div><strong>${D.disease_label}</strong></div><div>${disease}</div></div>
    <div class="row"><div><strong>${D.cause_label}</strong></div><div>${cause}</div></div>
  `;

  if (remedies.length) {
    remedies.forEach((r) => {
      const li = document.createElement("li");
      li.textContent = r;
      remediesList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = (I18N[state.lang] || I18N.en).remedies_none;
    remediesList.appendChild(li);
  }
}

async function analyzeImage() {
  const loader = $(".loader");
  const result = $(".result");
  const status = $("#statusMsg");
  const analyzeBtn = $("#btnAnalyze");
  result.classList.remove("show");
  loader.classList.add("show");
  if (status) status.textContent = I18N[state.lang].analyzing;
  if (analyzeBtn) analyzeBtn.disabled = true;

  try {
    const formData = new FormData();
    // Compress image before upload
    const blob = await compressImage(state.file);
    const upload = new File([blob], 'upload.jpg', { type: 'image/jpeg' });
    formData.append("image", upload);

    const res = await fetch(`/analyze?lang=${encodeURIComponent(state.lang)}`, { method: "POST", body: formData });
    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }
    const data = await res.json();
    // Client-side translation fallback for Hindi
    if (state.lang === 'hi' && data && data.parsed && typeof data.parsed === 'object') {
      try {
        const disease = data.parsed.disease || '';
        const cause = data.parsed.cause || '';
        const remedies = Array.isArray(data.parsed.remedies) ? data.parsed.remedies : [];
        const texts = [disease, cause, ...remedies];
        const trRes = await fetch('/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts, target: 'hi' }) });
        if (trRes.ok) {
          const tr = await trRes.json();
          const arr = Array.isArray(tr.translations) ? tr.translations : texts;
          data.parsed.disease = arr[0] || disease;
          data.parsed.cause = arr[1] || cause;
          data.parsed.remedies = arr.slice(2);
        }
      } catch (_) {}
    }
    renderResult(data);
    if (status) status.textContent = I18N[state.lang].done;
  } catch (err) {
    renderResult({ result: "Error: " + err.message });
    if (status) status.textContent = I18N[state.lang].err_analyze;
  } finally {
    loader.classList.remove("show");
    if (analyzeBtn) analyzeBtn.disabled = false;
  }
}

function bindActions() {
  $("#btnAnalyze").addEventListener("click", (e) => {
    e.stopPropagation(); // prevent triggering dropzone click
    if (!state.file) {
      alert(I18N[state.lang].must_select_image);
      return;
    }
    analyzeImage();
  });
  $("#btnClear").addEventListener("click", (e) => {
    e.stopPropagation(); // prevent triggering dropzone click
    const input = $("#imageInput");
    const preview = $(".preview img");
    const placeholder = $(".preview .placeholder");
    input.value = "";
    state.file = null;
    preview.src = "";
    preview.alt = "Preview";
    preview.style.display = 'none';
    placeholder.style.display = 'block';
    $(".result").classList.remove("show");
  });
}

function main() {
  initDropzone();
  bindActions();
  const preview = $(".preview img");
  const placeholder = $(".preview .placeholder");
  preview.style.display = 'none';
  placeholder.style.display = 'block';
  loadSchemes();
  setupTabs();
  // Always wire up schemes Refresh button
  const refreshBtn = document.getElementById('schemesRefresh');
  if (refreshBtn) refreshBtn.addEventListener('click', loadSchemes);
  // i18n init
  const sel = document.getElementById('langSelect');
  const saved = localStorage.getItem('lang') || 'hi';
  applyI18n(saved);
  if (sel) {
    sel.value = saved;
    sel.addEventListener('change', () => {
      const v = sel.value;
      localStorage.setItem('lang', v);
      applyI18n(v);
      // If user already selected an image and analysis result is relevant, re-run analysis in new language
      const resultWrap = document.querySelector('.result');
      if (state.file && resultWrap) {
        analyzeImage();
      }
      // Reload schemes in selected language
      loadSchemes();
      // If weather coords are present, refetch
      const latVal = parseFloat((document.getElementById('latInput')||{}).value);
      const lonVal = parseFloat((document.getElementById('lonInput')||{}).value);
      if (isFinite(latVal) && isFinite(lonVal)) {
        fetchWeather(latVal, lonVal);
      }
    });
  }
}
document.addEventListener("DOMContentLoaded", main);

// ===== Schemes =====
function loadSchemes() {
  const el = document.getElementById('schemesList');
  if (!el) return;
  el.innerHTML = '<div class="weather-loading">Loading schemes...</div>';
  fetch('/schemes' + (state.lang ? `?lang=${encodeURIComponent(state.lang)}` : ''))
    .then(r => r.json())
    .then(data => {
      const arr = Array.isArray(data.schemes) ? data.schemes : [];
      if (!arr.length) {
        el.innerHTML = `<div class="scheme-desc">${I18N[state.lang].no_schemes}</div>`;
        const refreshBtn = document.getElementById('schemesRefresh');
        if (refreshBtn) {
          refreshBtn.addEventListener('click', loadSchemes);
        }
        return;
      }
      el.innerHTML = arr.map(s => `
        <div class="scheme-item">
          <div class="scheme-title">${s.title || ''}</div>
          <div class="scheme-desc">${s.desc || ''}</div>
          ${s.eligibility ? `<div class="scheme-desc"><strong>Eligibility:</strong> ${s.eligibility}</div>` : ''}
          ${s.how_to_apply ? `<div class="scheme-desc"><strong>How to apply:</strong> ${s.how_to_apply}</div>` : ''}
          ${s.link ? `<a class="scheme-link" href="${s.link}" target="_blank" rel="noopener">Official link →</a>` : ''}
        </div>
      `).join('');
    })
    .catch(() => {
      el.innerHTML = '<div class="scheme-desc">Failed to load schemes.</div>';
    });
}
// ===== Chat UI =====
function appendChatBubble(role, text) {
  const win = document.getElementById('chatWindow');
  if (!win) return;
  const div = document.createElement('div');
  div.className = `bubble ${role === 'user' ? 'user' : 'bot'}`;
  div.textContent = text;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

// Typing indicator bubble for chat/therapy
function showTyping(containerId) {
  const win = document.getElementById(containerId);
  if (!win) return null;
  const div = document.createElement('div');
  div.className = 'bubble bot typing';
  // Simple three-dot indicator (works even without extra CSS)
  div.textContent = '...';
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
  return div;
}

function appendChatBubbleTo(windowId, role, text) {
  const win = document.getElementById(windowId);
  if (!win) return;
  const div = document.createElement('div');
  div.className = `bubble ${role === 'user' ? 'user' : 'bot'}`;
  div.textContent = text;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}

// ===== Weather UI =====
async function fetchWeather(lat, lon) {
  const card = document.getElementById('weatherCard');
  const summary = document.getElementById('weatherSummary');
  if (!card) return;
  card.innerHTML = `<div class="weather-loading">${I18N[state.lang].weather_loading}</div>`;
  try {
    const res = await fetch(`/weather?lat=${lat}&lon=${lon}&lang=${encodeURIComponent(state.lang)}`);
    if (!res.ok) throw new Error('Weather error');
    const data = await res.json();
    const c = data.current || {};
    const r = data.rain || {};
    const fmtPct = (v) => (v === null || v === undefined) ? '-' : `${v}%`;
    const fmtMm = (v) => (v === null || v === undefined) ? '-' : `${v} mm`;
    const D = I18N[state.lang];
    card.innerHTML = `
      <div class="weather-row"><span>${D.weather_temperature}</span><strong>${c.temperature_2m ?? '-'} °C</strong></div>
      <div class="weather-row"><span>${D.weather_feels_like}</span><strong>${c.apparent_temperature ?? '-'} °C</strong></div>
      <div class="weather-row"><span>${D.weather_humidity}</span><strong>${c.relative_humidity_2m ?? '-'} %</strong></div>
      <div class="weather-row"><span>${D.weather_wind}</span><strong>${c.wind_speed_10m ?? '-'} km/h</strong></div>
      <div class="weather-row"><span>${D.weather_precip_current}</span><strong>${c.precipitation ?? '-'} mm</strong></div>
      <div class="weather-row"><span>${D.rain_now}</span><strong>${fmtPct(r.now_probability)}</strong></div>
      <div class="weather-row"><span>${D.rain_max_3h}</span><strong>${fmtPct(r.next_3h_max_probability)}</strong></div>
      <div class="weather-row"><span>${D.rain_max_12h}</span><strong>${fmtPct(r.next_12h_max_probability)}</strong></div>
      <div class="weather-row"><span>${D.rain_max_24h}</span><strong>${fmtPct(r.next_24h_max_probability)}</strong></div>
      <div class="weather-row"><span>${D.rain_total_24h}</span><strong>${fmtMm(r.next_24h_precip_sum_mm)}</strong></div>
    `;
    if (summary) summary.innerHTML = data.summary ? `<div class="scheme-item">${data.summary}</div>` : '';
  } catch (err) {
    renderWeatherError(I18N[state.lang].weather_error);
  }
}

function renderWeatherError(msg) {
  const card = document.getElementById('weatherCard');
  if (card) card.innerHTML = `<div class="weather-error">${msg}</div>`;
}

// ===== Tabs / Sections =====
function setupTabs() {
  const groups = {
    analyzer: ["section-analyzer-hero", "section-analyzer-result"],
    schemes: ["section-schemes"],
    chat: ["section-chat"],
    therapy: ["section-therapy"],
    weather: ["section-weather"],
  };

  function show(key) {
    // toggle active button
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === key);
    });
    // hide all
    Object.values(groups).flat().forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    // show selected
    (groups[key] || []).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    });
    // scroll to top of main container
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // attach handlers
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => show(btn.dataset.target));
  });

  // default view
  show('analyzer');
}
