// たたむ/ひらくの見た目とアニメーション。chrome.* には触らない。
(() => {
  // アニメーションの時間(ms)。
  const TIMING = { fade: 240, collapse: 360, reveal: 360, easing: "cubic-bezier(.2,.7,.2,1)" };

  // cats は ksCategorySettings() の結果（分類ごとの on / threshold つき）。j.scores は { [分類id]: 0〜1 }。
  // しきい値を超えた分類を、スコアの高い順に { label, score } で返す。
  function reasons(j, cats) {
    return cats
      .filter((c) => c.on && (j.scores?.[c.id] ?? 0) >= c.threshold)
      .map((c) => ({ label: c.label, score: j.scores[c.id] }))
      .sort((a, b) => b.score - a.score);
  }

  function shouldHide(j, cats) {
    return !j.error && reasons(j, cats).length > 0;
  }

  function labelFor(j, cats) {
    // 1行目に説明、2行目にスコアつきのタグ。タグ名と数字の間は改行されないよう NBSP。
    // 分類名に「・」が入るものがあるので、区切りは「 / 」。
    const tags = reasons(j, cats).map((r) => `${r.label}\u00a0${r.score.toFixed(2)}`);
    return `やさしくないかもしれない投稿をたたみました\n${tags.join(" / ")}`;
  }

  function setPending(el, on) {
    el.classList.toggle("ks-pending", on);
  }

  const height = (el) => el.getBoundingClientRect().height;

  function run(el, keyframes, opts) {
    const a = el.animate(keyframes, opts);
    (el._ksAnims ||= []).push(a);
    return a;
  }

  function stop(el) {
    for (const node of [el, ...el.children]) {
      (node._ksAnims || []).forEach((a) => a.cancel());
      node._ksAnims = [];
    }
  }

  function unbind(el) {
    if (el._ksClick) el.removeEventListener("click", el._ksClick, true);
    el._ksClick = null;
  }

  function bindReveal(el, mode, opt) {
    unbind(el);
    if (mode === "silent") return;
    el._ksClick = (e) => {
      // たたんだ投稿のクリックで X が投稿ページへ遷移しないよう止める。
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      reveal(el, opt);
    };
    el.addEventListener("click", el._ksClick, true);
  }

  // 1. 本文をぼかしながら消す → 2. 高さを縮めつつ、たたんだ表示を出す
  async function fold(el, mode, label, opt = {}) {
    const sp = opt.speed || 1;
    stop(el);
    el.dataset.ksLabel = label;
    el.dataset.ksMode = mode;
    el.title = label; // 1行に収まらず … になったときもホバーで全部読めるように
    bindReveal(el, mode, opt);
    // 裏タブではアニメーションが進まず途中で止まるので、最終状態だけ当てる。
    if (!opt.animate || document.hidden) {
      el.classList.remove("ks-pending");
      el.classList.add("ks-folded");
      return;
    }
    const from = height(el);
    el.classList.add("ks-folding");
    const fades = [...el.children].map((k) =>
      run(k, [{ opacity: 1, filter: "blur(0px)" }, { opacity: 0, filter: "blur(6px)" }],
        { duration: TIMING.fade * sp, easing: "ease-in", fill: "forwards" }));
    await Promise.all(fades.map((a) => a.finished)).catch(() => {});
    if (!el.classList.contains("ks-folding")) return; // 途中で reset された
    el.classList.remove("ks-pending");
    el.classList.add("ks-folded");
    const to = height(el);
    const collapse = run(el, [{ height: `${from}px` }, { height: `${to}px` }],
      { duration: TIMING.collapse * sp, easing: TIMING.easing });
    if (mode !== "silent") {
      for (const pseudoElement of ["::before", "::after"]) {
        run(el, [{ opacity: 0 }, { opacity: 1 }], {
          pseudoElement, duration: TIMING.collapse * sp * 0.6,
          delay: TIMING.collapse * sp * 0.4, easing: "ease-out", fill: "backwards",
        });
      }
    }
    await collapse.finished.catch(() => {});
    stop(el);
    el.classList.remove("ks-folding");
  }

  async function reveal(el, opt = {}) {
    const sp = opt.speed || 1;
    unbind(el);
    stop(el);
    el.removeAttribute("title");
    opt.onReveal?.();
    if (document.hidden) {
      el.classList.remove("ks-folding", "ks-folded");
      return;
    }
    const from = height(el);
    el.classList.add("ks-folding");
    el.classList.remove("ks-folded");
    const to = height(el);
    for (const k of el.children) {
      run(k, [{ opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)" }],
        { duration: TIMING.reveal * sp, easing: "ease-out" });
    }
    const grow = run(el, [{ height: `${from}px` }, { height: `${to}px` }],
      { duration: TIMING.reveal * sp, easing: TIMING.easing });
    await grow.finished.catch(() => {});
    stop(el);
    el.classList.remove("ks-folding");
  }

  function reset(el) {
    stop(el);
    unbind(el);
    el.classList.remove("ks-pending", "ks-folding", "ks-folded");
    el.removeAttribute("title");
    delete el.dataset.ksLabel;
    delete el.dataset.ksMode;
  }

  window.KindUI = { TIMING, reasons, shouldHide, labelFor, setPending, fold, reveal, reset };
})();
