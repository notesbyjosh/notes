---
layout: post
title: "West Virginia cross country team champions, mapped (1958–2025)"
description: "An interactive D3 map of every WV high school cross country state team championship, 1958–2025 — with a year-by-year build and a boys/girls breakdown."
tags: [ai, anthropic, projects, dataviz]
---

I built an interactive map of **every West Virginia high school cross country
state _team_ championship from 1958 to 2025** — 203 titles across 40 schools —
and published it here so it's easy to share.

<a href="{{ '/viz/wv-cross-country-team-champions.html' | relative_url }}">
  <img src="{{ '/assets/images/wv-cross-country-feed.png' | relative_url }}"
       alt="Map of West Virginia cross country team champions, 1958–2025"
       style="max-width:380px;width:100%;height:auto;border-radius:12px;display:block;margin:1rem auto" />
</a>

🏃 **[Open the interactive map]({{ '/viz/wv-cross-country-team-champions.html' | relative_url }})** — every school is a bubble on the state, sized by its total titles and split into boys and girls. Hover any school for the exact years it won, filter by division, and hit **Play** to watch the titles add up season by season, 1958 → 2025.

It's a single self-contained page — D3.js, the West Virginia county geography, and the data are all baked into one HTML file, so there's no login or setup. Built with **Claude (Anthropic)**, which did the data wrangling, the map projection, and the Old Gold &amp; Blue design in one pass.

A couple of things the map makes obvious: the sport's center of gravity has drifted from the old Charleston and St. Albans programs of the 1960s to the north-central and Ohio-valley powers today, and University and Morgantown — two schools in one town — sit on top with a combined 37 titles.

**Data:** championship records compiled by [runwv.com](https://runwv.com), West Virginia's home for high school cross country &amp; track. Team titles only (individual champions excluded); girls' titles begin in 1980.

There's also a quick nine-second build animation for socials — [watch the reel]({{ '/assets/wv-cross-country-reel.mp4' | relative_url }}).
