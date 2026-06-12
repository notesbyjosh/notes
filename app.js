/* AI Learning Log — renders entries.json into a filterable timeline.
   No dependencies. Add learnings by editing entries.json. */

(() => {
  "use strict";

  const state = { entries: [], activeTag: null, query: "" };

  const el = {
    timeline: document.getElementById("timeline"),
    tagbar: document.getElementById("tagbar"),
    stats: document.getElementById("stats"),
    search: document.getElementById("search"),
    empty: document.getElementById("empty"),
    count: document.getElementById("count"),
    themeToggle: document.getElementById("theme-toggle"),
  };

  /* ---------- Theme ---------- */
  function initTheme() {
    const saved = localStorage.getItem("theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    el.themeToggle.addEventListener("click", () => {
      const current =
        document.documentElement.getAttribute("data-theme") ||
        (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });
  }

  /* ---------- Tiny safe markdown (inline only) ---------- */
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function inlineMd(s) {
    let t = escapeHtml(s);
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return t;
  }
  function renderBody(body) {
    const paras = String(body).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    return paras.map((p) => `<p>${inlineMd(p).replace(/\n/g, "<br>")}</p>`).join("");
  }

  /* ---------- Dates ---------- */
  function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  /* ---------- Render ---------- */
  function allTags() {
    const set = new Set();
    state.entries.forEach((e) => (e.tags || []).forEach((t) => set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }

  function visibleEntries() {
    const q = state.query.toLowerCase().trim();
    return state.entries.filter((e) => {
      if (state.activeTag && !(e.tags || []).includes(state.activeTag)) return false;
      if (!q) return true;
      const hay = `${e.title} ${e.body} ${(e.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function renderTags() {
    const tags = allTags();
    el.tagbar.innerHTML = "";
    const mk = (label, value) => {
      const b = document.createElement("button");
      b.className = "tag-chip" + (state.activeTag === value ? " active" : "");
      b.textContent = label;
      b.addEventListener("click", () => {
        state.activeTag = state.activeTag === value ? null : value;
        render();
      });
      return b;
    };
    el.tagbar.appendChild(mk("All", null));
    tags.forEach((t) => el.tagbar.appendChild(mk("#" + t, t)));
  }

  function renderStats() {
    const total = state.entries.length;
    const tags = allTags().length;
    const days = new Set(state.entries.map((e) => e.date)).size;
    el.stats.innerHTML = [
      ["Learnings", total],
      ["Topics", tags],
      ["Days logged", days],
    ].map(([lbl, num]) =>
      `<div class="stat"><span class="num">${num}</span><span class="lbl">${lbl}</span></div>`
    ).join("");
  }

  function renderTimeline() {
    const items = visibleEntries().slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    el.empty.hidden = items.length > 0;
    el.timeline.innerHTML = items.map((e) => `
      <article class="entry">
        <div class="entry-date">${fmtDate(e.date)}</div>
        <h2 class="entry-title">${escapeHtml(e.title)}</h2>
        <div class="entry-body">${renderBody(e.body || "")}</div>
        ${(e.tags && e.tags.length)
          ? `<div class="entry-tags">${e.tags.map((t) =>
              `<span class="entry-tag" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`).join("")}</div>`
          : ""}
      </article>`).join("");

    el.timeline.querySelectorAll(".entry-tag").forEach((node) => {
      node.addEventListener("click", () => {
        state.activeTag = node.dataset.tag;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    el.count.textContent = `${items.length} of ${state.entries.length} learnings shown`;
  }

  function render() {
    renderTags();
    renderStats();
    renderTimeline();
  }

  /* ---------- Boot ---------- */
  async function load() {
    initTheme();
    el.search.addEventListener("input", (ev) => {
      state.query = ev.target.value;
      renderTimeline();
    });
    try {
      const res = await fetch("entries.json", { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      state.entries = Array.isArray(data) ? data : (data.entries || []);
    } catch (err) {
      state.entries = [];
      el.empty.textContent = "Couldn't load entries.json — make sure it's valid JSON.";
      el.empty.hidden = false;
    }
    render();
  }

  load();
})();
