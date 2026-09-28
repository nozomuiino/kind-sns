// 拡張全体で共有する設定。API キーは chrome.storage.local にだけ保存する。
const KS_DEFAULTS = {
  apiKey: "",
  endpoint: "https://api.typesafe.ai/v1/systemone",
  model: "jev-latest",
  categories: {}, // { [id]: { on: boolean, threshold: number } }。無い分類は categories.js の既定値
  mode: "notice", // notice: 明示してたたむ / quiet: 細い線だけ残す / silent: 完全に消す
  dimPending: true, // 判定が終わるまで薄く表示する
  enabled: true,
};

// 分類ごとの on/off としきい値を、categories.js の既定値と合わせて返す。
function ksCategorySettings(s) {
  return KS_CATEGORIES.map((c) => ({
    ...c,
    on: s.categories?.[c.id]?.on ?? true,
    threshold: s.categories?.[c.id]?.threshold ?? c.threshold,
  }));
}

async function ksLoadSettings() {
  const r = await chrome.storage.local.get("settings");
  return { ...KS_DEFAULTS, ...(r.settings || {}) };
}

async function ksSaveSettings(s) {
  await chrome.storage.local.set({ settings: s });
}
