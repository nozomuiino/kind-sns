// x.com 上で投稿を拾い、jev の判定結果に応じてたたむ。
(async () => {
  const UI = window.KindUI;
  let S = await ksLoadSettings();
  let cats = ksCategorySettings(S);
  chrome.storage.onChanged.addListener(async (changes) => {
    if (!changes.settings) return;
    S = await ksLoadSettings();
    cats = ksCategorySettings(S);
  });

  // 投稿ID → { promise, judgement, revealed }。X は画面外の投稿の DOM を作り直すので、ID で覚えておく。
  const state = new Map();
  const hiddenIds = new Set();

  function tweetInfo(article) {
    const text = article.querySelector('[data-testid="tweetText"]')?.innerText?.trim();
    const link = article.querySelector('a[href*="/status/"] time')?.closest("a");
    return { text, id: link?.getAttribute("href") || text };
  }

  function reportHidden() {
    chrome.runtime.sendMessage({ type: "hiddenCount", count: hiddenIds.size }).catch(() => {});
  }

  function apply(el, id, st, animate) {
    const j = st.judgement;
    UI.setPending(el, false);
    if (j.error) {
      if (j.error !== "no-key") console.debug("[やさしいTL]", j.error);
      return;
    }
    if (st.revealed || !UI.shouldHide(j, cats)) return;
    hiddenIds.add(id);
    reportHidden();
    UI.fold(el, S.mode, UI.labelFor(j, cats), { animate, onReveal: () => (st.revealed = true) });
  }

  function scan() {
    if (!S.enabled || !S.apiKey) return;
    for (const article of document.querySelectorAll('article[data-testid="tweet"]')) {
      const el = article.closest('[data-testid="cellInnerDiv"]') || article;
      const { text, id } = tweetInfo(article);
      if (!text || !id || el.dataset.ksId === id) continue;
      UI.reset(el);
      el.dataset.ksId = id;

      const st = state.get(id);
      if (st?.judgement) {
        apply(el, id, st, false); // 一度判定済みの投稿はアニメーションなしで即反映
        continue;
      }
      if (S.dimPending) UI.setPending(el, true);
      const entry = st || { promise: chrome.runtime.sendMessage({ type: "judge", text }) };
      state.set(id, entry);
      entry.promise
        .then((j) => {
          entry.judgement = j || { error: "empty response" };
          if (el.dataset.ksId === id) apply(el, id, entry, true);
        })
        .catch((e) => {
          state.delete(id);
          UI.setPending(el, false);
          console.debug("[やさしいTL]", e);
        });
    }
  }

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  }).observe(document.body, { childList: true, subtree: true });
  scan();
})();
