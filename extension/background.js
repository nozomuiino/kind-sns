// jev への問い合わせ役。CORS とキー管理のため、ページ側からは直接呼ばない。
importScripts("settings.js");

importScripts("categories.js");

// 分類はすべて「当てはまるか」の確率 (noul) で聞く。
const QUESTIONS = Object.fromEntries(
  KS_CATEGORIES.map((c) => [c.id, { type: "noul", instructions: c.instructions, criteria: c.criteria }]),
);

const MAX_IN_FLIGHT = 6;
const MAX_CACHE = 3000;

// 判定キャッシュ: service worker が止まっても残るよう storage.local にも書く。
const cache = new Map();
let cacheLoaded = null;
function loadCache() {
  cacheLoaded ||= chrome.storage.local.get("cache").then((r) => {
    for (const [k, v] of Object.entries(r.cache || {})) cache.set(k, v);
  });
  return cacheLoaded;
}
let saveTimer;
function saveCacheSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const entries = [...cache].slice(-MAX_CACHE);
    chrome.storage.local.set({ cache: Object.fromEntries(entries) });
  }, 1000);
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 同時リクエスト数の制限。
const queue = [];
let active = 0;
function limited(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    pump();
  });
}
function pump() {
  while (active < MAX_IN_FLIGHT && queue.length) {
    const { fn, resolve, reject } = queue.shift();
    active++;
    fn().then(resolve, reject).finally(() => {
      active--;
      pump();
    });
  }
}

async function callJev(text, s) {
  const res = await fetch(s.endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${s.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ state: text, model: s.model, questions: QUESTIONS }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const scores = Object.fromEntries(
    Object.entries(data.answers).map(([id, a]) => [id, a.noul]),
  );
  return { source: data.model || s.model, scores };
}

const inFlight = new Map();
async function judge(text) {
  const s = await ksLoadSettings();
  if (!s.apiKey) return { error: "no-key" };
  await loadCache();
  // 質問を変えたら古い判定を使わないよう、質問の中身もキーに含める。
  const key = `${s.model}:${await sha256(JSON.stringify(QUESTIONS))}:${await sha256(text)}`;
  if (cache.has(key)) return cache.get(key);
  if (inFlight.has(key)) return inFlight.get(key);
  const p = limited(() => callJev(text, s))
    .then((r) => {
      cache.set(key, r);
      saveCacheSoon();
      return r;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "judge") {
    judge(msg.text).then(sendResponse, (e) => sendResponse({ error: String(e.message || e) }));
    return true;
  }
  if (msg.type === "hiddenCount" && sender.tab) {
    const tabId = sender.tab.id;
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#6b8f71" });
    chrome.action.setBadgeText({ tabId, text: msg.count ? String(msg.count) : "" });
  }
});

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
