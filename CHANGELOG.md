# Changelog

## 1.6.1 — 2026-10-28

Accuracy release. Checked against four official Jovian Archive charts (104
activations) and 1,000 Swiss Ephemeris reference births; see `ACCURACY.md`.

### Fixed

- **Design instant**: solved for exactly 88° of solar arc (residual under
  0.001″) in UT milliseconds. The old search stopped at 0.001°, a fallback
  could overwrite the converged hour, and it used host-local dates; it was up
  to 0.26° (about 6 hours) off and changed with the host time zone. Design
  lines (mostly the Moon, sometimes the Sun line and so the profile) were
  wrong in about 8% of charts.
- **True node**: now the osculating node of the Moon's orbit, the Swiss
  Ephemeris definition (within 17″ of Swiss, 1900–2050). The old 5-term
  Meeus correction was up to 17′ off (one tone is 1.56′), so Variable arrows
  and some node lines were wrong.
- **Seconds dropped**: `calculateBirthPositions` truncated fractional minutes,
  up to 59 s (half an arcminute of Moon).
- `positions.design.dateTime` could show the wrong day when rounding 23:59.7
  up to midnight.

### Added

- `positions.personality.utc` / `positions.design.utc` (ISO instants).
- `calculatePositionsAtUtc`, `findSolarArcInstant`, `localToUtcMs`,
  `trueNodeLongitude`, `meanNodeLongitude`, `sunLongitudeAtUtc` exports in
  `natalengine/astronomy`.
- Reference regression tests: `tests/reference-charts.test.js` (Jovian, 104/104)
  and `tests/accuracy-properties.test.js` (Swiss Ephemeris, 1,000 births).

### Performance

- About 4× faster per Human Design chart (1.34 → 0.31 ms), because the solver
  only computes the Sun while it searches.

## 1.2.0 — 2026-06-04

Accuracy release. The Human Design calculator was audited against five
fully-documented reference charts (Ra Uru Hu, Albert Einstein, Marilyn
Monroe, Madonna, Amy Winehouse) — **all five pass on every element**: type,
profile, authority, definition, incarnation cross gates, channels, centers.
The gate wheel was verified exact (Δ = 0.000000°) against the canonical Rave
Mandala for all 64 gates.

### Fixed

- **Variable (Four Arrows) — two bugs**:
  - Arrow direction now derives from **Tone** (1-3 left / 4-6 right), not
    Color, per the canonical PHS spec.
  - Motivation now reads from the **Personality Sun** and Perspective/View
    from the **Personality Nodes** (these two inputs were swapped).
- **Six incarnation cross names** corrected (gate names had been used as
  cross names): Juxtaposition 14 → *Empowering*, 19 → *Need*, 33 →
  *Retreat*, 59 → *Strategy*; Left Angle 25/46 → *Healing*.
- **Cross `fullName`** now uses the canonical format with gates quartet:
  `Right Angle Cross of the Sphinx (1/2 | 7/13)`.
- **Channel subcircuits**: 12-22 Openness → Individual *Knowing*;
  19-49 Synthesis → Tribal *Ego*.
- `positions.personality.earth` / `positions.design.earth` were `undefined`;
  Earth (Sun + 180°) is now included in all position outputs.
- Stale comments claiming "Meeus algorithms" / "mean node" — calculations
  use astronomy-engine (VSOP87) with a true-node default.

### Added

- **Full substructure on every activation**: each planet now carries
  `color`, `tone`, `base` (the 6/6/6/5 subdivision) and raw `longitude`,
  plus new `longitudeToBase()` export.
- **`options.nodeType`** on `calculateHumanDesign` / `calculateBirthPositions`:
  `'true'` (default) or `'mean'` lunar nodes, for QA against charts produced
  with either convention.
- **Timezone module** (`searchPlaces`, `resolveUtcOffset`, `formatUtcOffset`):
  Open-Meteo geocoding (returns IANA zone, no key needed) + historical UTC
  offset resolution via the Intl API — handles wartime DST, half-hour zones,
  pre-1970 oddities. This replaces longitude-based offset estimation as the
  recommended path for birth-data entry.
- **`meta` reproducibility block** on chart output: birth inputs, node type,
  ephemeris, design solar arc.
- **`positions.design.dateTime`** — the exact solved 88°-solar-arc moment
  including time of day.
- Profile storage now preserves `location.iana` (IANA zone name).
- 15 new regression tests covering all of the above (200 total).

### Changed

- npm package no longer ships the demo app (`src/main.js`, `src/styles.css`).

## 1.1.2 and earlier

- 1.1.x: Vedic (Jyotish) astrology system, Western/Sanskrit name toggle.
- 1.0.x: Western astrology, Human Design, Gene Keys, compatibility,
  MCP server, accuracy test suite, true-node fix, exact 88° solar-arc
  design calculation.
