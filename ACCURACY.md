# Accuracy — natalengine 1.6.1

Two calculation bugs, found by the Open Human Design audit (2026-10-28), are fixed. This file says what was
wrong, what changed and how it was checked.

## What was wrong

1. **The Design instant was not at 88° of solar arc.** The search stopped at 0.001°. After the loop a fallback
   could overwrite the converged hour with the previous step's offset. It ran on host-local `Date` objects, so the
   machine's time zone changed results. Separately, `calculateBirthPositions` dropped seconds, up to 59 s (half an
   arcminute of Moon). Over 1,000 births the arc was off by up to 919″ (0.26°, about 6 hours). Design lines
   differed from the exact instant in 8.4% of charts (Moon 7.6%, Sun line 0.7%, which changes profile and cross).
2. **The true node was too rough.** It used the mean node plus a 5-term Meeus correction, which was up to 17′ off
   Swiss Ephemeris. One tone is 1.56′, so 87% of node tones and 53% of node arrows were wrong, and 6.5% of node lines.
   Biden's Personality node sat in the wrong gate (29.6 instead of 59.1).

## What changed

- `findSolarArcInstant()` (`src/calculators/astronomy.js`): solves in UT milliseconds for the instant the Sun's
  apparent longitude is exactly 88° earlier. It uses Newton steps with a secant slope inside a physical bracket
  (the Sun moves 0.94–1.03°/day) and falls back to bisection. Tolerance is 1e-7°, and it needs 3–4 Sun evaluations.
  The old fallback is gone.
- `trueNodeLongitude()`: the osculating node, meaning the ascending node of the plane of the Moon's instantaneous
  orbit, `h = r × v` from astronomy-engine's geocentric Moon state in the true ecliptic of date. This is how Swiss
  Ephemeris defines `SE_TRUE_NODE`. The mean node is still available with `options.nodeType: 'mean'`.
- Every position goes through `calculatePositionsAtUtc(utMs)`, so seconds are kept and the host time zone never
  enters.
- `positions.design.dateTime` is formatted from the rounded instant. Before, 23:59.7 could print the wrong day.
  `positions.*.utc` was added.

## Evidence

| check | 1.6.0 | 1.6.1 |
|---|---|---|
| Jovian reference activations (`tests/reference-charts.test.js`) | 101/104 | **104/104** |
| \|solar arc − 88°\|, worst of 1,000 births | 919″ | **0.0004″** |
| Design instant vs Swiss instant | 385 births > 5 min | **worst 71 s** |
| True node vs Swiss, worst of 2,000 instants | 1,028″ (17′) | **17″** (¼ tone = 23.4″) |
| Node tone ≠ Swiss | 87.3% | 4.8% |
| Node arrow ≠ Swiss | 53.0% | 1.9% |
| Charts with any Determination/Environment/Perspective arrow ≠ Swiss | 79.2% | 4.0% |
| Same chart under host TZ UTC / New York / Kolkata / Chatham | 8/144 rows differed (audit) | identical |
| Chart time (median of 5 × 500 charts) | 1.34 ms | **0.31 ms** |

- **References.** Jovian Archive "ZEN" composite PDFs for Obama, Biden, Cruise and Winfrey (gate.line only, no
  text). Swiss Ephemeris 2.10.03 (pyswisseph with SE1 files, in a throwaway venv, not a dependency) produced
  `tests/data/swiss-reference.json`: 1,000 seeded births from 1900–2050, with Sun and true node at birth and at
  Swiss's own 88° instant. The Swiss nodes for Obama (27°18.3′ Leo), Biden (0°08.9′ Virgo) and Cruise (9°02.6′ Leo)
  match Astrotheme's published true node.
- **Red first.**
  - `reference-charts` failed on the three audit misses at the start (Obama D.Moon 38.4, Biden P.NN/SN 29.6/30.6).
  - `accuracy-properties` failed all 4 checks on the node-only commit (7c07cfe, old solver): 967 births more than 1″
    off the arc, 385 instants more than 5 min from Swiss, 9 nodes ≥ ¼ tone, 347 offset differences.
  - In a scratch copy, putting back the old 5-term node turned Biden red and failed 1,893/2,000 nodes. Putting back
    the old 0.001° tolerance failed 16 births on the 88° ± 1″ check. Restoring the code turned both green.
- **Open Human Design.** In a throwaway worktree of OHD `main` (d2d5508) with `npm i ../natalengine-accuracy
  --ignore-scripts`: OHD `npm test` passes 37/37 (also 37/37 on 1.6.0), and the audit's `accuracy-check.mjs`
  scores 104/104 (101/104 on 1.6.0). Variable notation now equals the audit's best estimate for all four people
  (Obama LL RR, Biden LL RL, Cruise RL RL, Winfrey RR RL).

## Limits

- The remaining node difference (median 4″, worst 17″) comes from astronomy-engine's Moon model. When a node sits
  that close to a tone edge, its tone can still differ from Swiss; this affects about 4% of charts' arrows. Closing it
  would need a fuller lunar theory (ELP/DE).
- Jovian's PDFs give gate.line only, so tones and Variable are checked against Swiss, not against Jovian itself.
- After 2025, astronomy-engine's ΔT extrapolation differs from Swiss by about 12 s (about 6″ of Moon).
