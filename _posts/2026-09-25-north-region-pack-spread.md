---
layout: post
title: "North Region pack spread: box plots of every girls' cross country team"
description: "Interactive D3 box-and-whisker plots of the ten WV North Region girls' cross country teams, showing where each runner ranks and how tightly each top five packs together."
tags: [ai, anthropic, projects, dataviz]
---

In cross country, a team scores by adding up where its top five runners finish, and the lowest total wins. One fast runner can't carry a team on her own. What matters is how close the whole pack runs together. So I plotted the ten **North Region girls' teams** as **box-and-whisker plots**, which show that spread directly.

<iframe src="{{ '/viz/north-region-pack-spread.html' | relative_url }}"
        title="North Region pack spread box plots"
        loading="lazy"
        style="width:100%;height:1100px;border:1px solid #e1e0d9;border-radius:12px;margin:1rem 0;background:#fff"></iframe>

🏃 **[Open it full screen]({{ '/viz/north-region-pack-spread.html' | relative_url }})**. I filtered the list to the 78 North Region runners and re-ranked them 1–78 by score. Each box covers a team's middle 50%, the dark line is the median, and the whiskers reach the team's best and worst runner shown. A narrow box far to the left means a tight, fast pack.

Things to try:

- **Hover** any dot to see the runner, her year, and her North rank and score. Hover a box to see its quartiles.
- Switch **Top 5 scorers** to **All runners** to see which teams have depth behind their scoring five.
- Switch **North rank** to **Score** to see the same spread in raw points.

The difference between teams is easy to see. Morgantown's top five all fall between 4th and 9th, a spread of only 5 places, and they project to win with 32 points. Musselman has the region's second-best runner, but their top five stretch from 2nd to 71st. That wide spread leaves their sixth-place team spot open to Jefferson.

Spring Mills (3 runners) and Hedgesville (4) don't have full teams, so they sit below the dashed line.

It's a single self-contained page, with D3.js and the data built into one HTML file. Built with **Claude (Anthropic)**, which did the data cleanup, the rank and team-score math, and the chart.

**Data:** North Region girls' cross country runner list, filtered to Morgantown, University, Wheeling Park, Preston, Musselman, Washington, Jefferson, Spring Mills, Hedgesville and Martinsburg. The team scores and places are projections, not race results.
