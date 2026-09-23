(() => {
  "use strict";
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  function labelTheme() { toggle.setAttribute("aria-label", `Switch to ${root.dataset.theme === "dark" ? "light" : "dark"} theme`); }
  labelTheme();
  toggle.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (_) {}
    labelTheme();
  });
  const search = document.getElementById("search");
  // Preserve bookmarks to the old homepage's tag filters.
  if (!search && /^#tag=/.test(location.hash) && !document.querySelector('.article-page')) {
    const notes = document.querySelector('.navigation a[href$="/notebook/"]');
    if (notes) location.replace(notes.href + location.hash);
  }
  if (!search) return;
  const topic = document.getElementById("topic");
  const entries = [...document.querySelectorAll(".note-card")];
  function apply() {
    const q = search.value.toLowerCase().trim();
    let shown = 0;
    entries.forEach(entry => {
      entry.hidden = !((!topic.value || entry.dataset.tags.split(/\s+/).includes(topic.value)) && (!q || entry.dataset.search.includes(q)));
      if (!entry.hidden) shown++;
    });
    document.getElementById("count").textContent = `${shown} of ${entries.length} notes`;
    document.getElementById("empty").hidden = shown > 0;
  }
  function readHash() {
    let tag = '';
    try { tag = new URLSearchParams(location.hash.slice(1)).get('tag') || ''; } catch (_) {}
    topic.value = [...topic.options].some(o => o.value === tag) ? tag : '';
    apply();
  }
  search.addEventListener('input', apply);
  topic.addEventListener('change', () => { history.replaceState(null, '', location.pathname + location.search + (topic.value ? '#tag=' + encodeURIComponent(topic.value) : '')); apply(); });
  document.getElementById('clear-filters').addEventListener('click', () => { search.value = ''; topic.value = ''; history.replaceState(null, '', location.pathname + location.search); apply(); search.focus(); });
  window.addEventListener('hashchange', readHash);
  readHash();
})();
