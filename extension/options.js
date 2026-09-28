const $ = (id) => document.getElementById(id);
const FIELDS = ["apiKey", "model", "endpoint"];

function renderCategories(s) {
  $("cats").innerHTML = ksCategorySettings(s).map((c) => `
    <label class="cat">
      <input type="checkbox" data-cat="${c.id}" ${c.on ? "checked" : ""}>
      <span>${c.label}<small class="hint">${c.description}</small></span>
      <input type="number" data-th="${c.id}" step="0.05" min="0" max="1" value="${c.threshold}">
    </label>`).join("");
}

async function load() {
  const s = await ksLoadSettings();
  for (const f of FIELDS) $(f).value = s[f];
  renderCategories(s);
  document.querySelector(`input[name=mode][value=${s.mode}]`).checked = true;
  $("dimPending").checked = s.dimPending;
  $("enabled").checked = s.enabled;
}

function read() {
  const categories = Object.fromEntries(KS_CATEGORIES.map((c) => [c.id, {
    on: document.querySelector(`[data-cat=${c.id}]`).checked,
    threshold: Number(document.querySelector(`[data-th=${c.id}]`).value),
  }]));
  return {
    apiKey: $("apiKey").value.trim(),
    model: $("model").value.trim() || KS_DEFAULTS.model,
    endpoint: $("endpoint").value.trim() || KS_DEFAULTS.endpoint,
    categories,
    mode: document.querySelector("input[name=mode]:checked").value,
    dimPending: $("dimPending").checked,
    enabled: $("enabled").checked,
  };
}

// 日本語などが混ざったまま保存すると fetch がヘッダーエラーになるので先に弾く。
function badKey(s) {
  return s.apiKey && /[^\x21-\x7e]/.test(s.apiKey);
}

$("save").addEventListener("click", async () => {
  if (badKey(read())) return ($("status").textContent = "API キーに使えない文字が入っています。コピーし直してください。");
  await ksSaveSettings(read());
  $("status").textContent = "保存しました。X のタブを再読み込みすると反映されます。";
});

$("test").addEventListener("click", async () => {
  if (badKey(read())) return ($("test-result").textContent = "API キーに使えない文字が入っています。コピーし直してください。");
  await ksSaveSettings(read());
  $("test-result").textContent = "問い合わせ中…";
  const t0 = performance.now();
  const r = await chrome.runtime.sendMessage({
    type: "judge",
    text: "【拡散希望】これ知らない奴マジで損してる。今すぐ見ないと手遅れになるぞ！！",
  });
  const ms = Math.round(performance.now() - t0);
  if (r.error) {
    $("test-result").textContent = `エラー: ${r.error === "no-key" ? "API キーが空です" : r.error}`;
    return;
  }
  const top = KS_CATEGORIES.map((c) => `${c.label} ${(r.scores[c.id] ?? 0).toFixed(2)}`).join(" / ");
  $("test-result").textContent = `OK (${r.source}, ${ms}ms) ${top}`;
});

load();
