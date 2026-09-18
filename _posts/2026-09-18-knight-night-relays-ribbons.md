---
layout: post
title: "Knight Night Relays, ribboned: watch every 4×1.5-mile relay rise and fall"
description: "An interactive D3 ribbon chart of the 2026 Knight Night Relays (Preston HS) — every complete boys' and girls' team ranked leg by leg, with a play animation and a leg-by-leg heatmap."
tags: [ai, anthropic, projects, dataviz]
---

I turned the results of the **2026 Knight Night Relays** — the 4&nbsp;×&nbsp;1.5-mile
cross country relay hosted by Preston High School in Kingwood, WV — into an
interactive **ribbon chart** so you can watch each team climb and slide as every
leg is added.

<iframe src="{{ '/viz/knight-night-ribbons.html' | relative_url }}"
        title="Knight Night Relays ribbon chart"
        loading="lazy"
        style="width:100%;height:820px;border:1px solid #e1e0d9;border-radius:12px;margin:1rem 0;background:#fff"></iframe>

🏃 **[Open it full screen]({{ '/viz/knight-night-ribbons.html' | relative_url }})** — toggle **Boys** or **Girls**, then follow any ribbon from *After Leg 1* to *Final*. Each team's height is its rank by cumulative time at that point in the race, and ribbon color encodes net movement from the opening order to the finish (blue = climbed, red = slid).

Things to try:

- **Hover or click** a ribbon to trace one team; **pick a school** from the dropdown to isolate a program's A/B/C squads.
- Hit **Play** and each ribbon *inks itself in* left to right, one leg at a time. Select a school first and Play draws just that school over the grayed-out field.
- Click **Show leg-by-leg heatmap** to flip to the "why": every split shaded by how it compared to the field's average for that leg — blue is fast, red gave time back. The ribbon shows *where* teams moved; the heatmap shows *which leg* won or lost it.

Only teams that fielded four finishers are shown — 60 boys' teams and 44 girls' teams. A few relays with a missing back-half split (an Excel `#VALUE!` on the sheet, no team total) are excluded; Keyser's boys "A" was one of them, despite Luca Altobello's 7:08.8 — the fastest single leg of the meet.

It's a single self-contained page: D3.js and both races' data are baked into one HTML file, so there's no login or setup. Built with **Claude (Anthropic)**, which did the PDF data extraction, the rank math, and the design in one pass.

**Data:** 2026 Knight Night Relays official splits, Preston High School. Results timing by [mountaintiming.com](https://mountaintiming.com).
