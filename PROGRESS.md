# PROGRESS — natalengine accuracy (branch `accuracy`)

## Done
1. `tests/reference-charts.test.js` (d95488d): red 101/104 before any fix.
2. Osculating true node + seconds kept (7c07cfe). `tests/data/swiss-reference.json` from pyswisseph (throwaway venv /tmp/ne-swe).
3. Design solver `findSolarArcInstant` + `tests/accuracy-properties.test.js` (fe8ef2f). Property test red on 7c07cfe.
4. 1.6.1 + CHANGELOG (9fff88a).
5. OHD check in /home/uni/Code/wt/ohd-ne161 (throwaway): npm test 37/37; accuracy-check 104/104.
6. ACCURACY.md.

7. Code review (medium): fixes in de8a7cd (host-TZ child-process test, arc guard, provenance notes).
8. Video: ~/.local/share/uni/videos/natalengine-accuracy.mp4 (63 s; script /tmp/ne-scripts/make_video.py).

## Next
- Aaron: review branch, npm publish 1.6.1, bump natalengine in Open HD.

## Open questions
- About 4% of charts still have an arrow that differs from Swiss (node within 17″ of a tone edge). A fuller Moon theory would be needed.
