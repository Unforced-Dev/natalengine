/**
 * Randomized accuracy properties against Swiss Ephemeris.
 *
 * tests/data/swiss-reference.json holds 1,000 seeded births (1900–2050 UTC) with Swiss Ephemeris
 * 2.10.03 values: Sun and true node at birth, and the Swiss 88° design instant with its Sun and
 * true node. Generated once with pyswisseph in a throwaway venv; Swiss is not a dependency.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { calculateHumanDesign } from '../src/calculators/humandesign.js';

const REF = JSON.parse(readFileSync(new URL('./data/swiss-reference.json', import.meta.url), 'utf8'));
const ARCSEC = 1 / 3600;
const TONE = 360 / 64 / 6 / 6 / 6; // 1.5625′
const QUARTER_TONE = TONE / 4; // 23.4″

const norm = (x) => ((x % 360) + 360) % 360;
const sdiff = (a, b) => { const d = norm(a - b); return d > 180 ? d - 360 : d; };
const utcInput = (ms) => {
  const d = new Date(ms);
  return [d.toISOString().slice(0, 10), d.getUTCHours() + d.getUTCMinutes() / 60, 0];
};
// Local wall time for a UT instant at a fixed offset (hours).
const localInput = (ms, tz) => {
  const d = new Date(ms + tz * 3600000);
  return [d.toISOString().slice(0, 10), d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600, tz];
};
// positions.design.dateTime is local wall time, to the minute.
const designUtMs = (chart, tz) => Date.parse(`${chart.positions.design.dateTime}:00Z`) - tz * 3600000;
const fmtArc = (deg) => `${(deg * 3600).toFixed(2)}″`;

describe(`Swiss Ephemeris property checks (${REF.births.length} births)`, () => {
  const charts = REF.births.map((b) => calculateHumanDesign(...utcInput(b.utMs)));

  test('Design Sun is exactly 88° of solar arc before Personality Sun (± 1″)', () => {
    let worst = 0;
    const bad = [];
    charts.forEach((c, i) => {
      const err = sdiff(c.positions.personality.sun.longitude - 88, c.positions.design.sun.longitude);
      worst = Math.max(worst, Math.abs(err));
      if (Math.abs(err) > ARCSEC) bad.push(`${new Date(REF.births[i].utMs).toISOString()}: ${fmtArc(err)}`);
    });
    assert.deepStrictEqual(bad.slice(0, 5), [], `${bad.length} births off by more than 1″ (worst ${fmtArc(worst)})`);
  });

  test('Design instant agrees with Swiss Ephemeris to within 5 minutes', () => {
    const bad = [];
    charts.forEach((c, i) => {
      const dt = (designUtMs(c, 0) - REF.births[i].dUtMs) / 60000;
      if (Math.abs(dt) > 5) bad.push(`${new Date(REF.births[i].utMs).toISOString()}: ${dt.toFixed(1)} min`);
    });
    assert.deepStrictEqual(bad.slice(0, 5), [], `${bad.length} design instants more than 5 min from Swiss`);
  });

  test('Personality and Design true node within ¼ tone of Swiss Ephemeris', () => {
    let worst = 0;
    const bad = [];
    charts.forEach((c, i) => {
      const b = REF.births[i];
      for (const [side, ref] of [['personality', b.pNode], ['design', b.dNode]]) {
        const err = sdiff(c.positions[side].northNode.longitude, ref);
        worst = Math.max(worst, Math.abs(err));
        if (Math.abs(err) >= QUARTER_TONE) bad.push(`${new Date(b.utMs).toISOString()} ${side}: ${fmtArc(err)}`);
      }
    });
    assert.deepStrictEqual(bad.slice(0, 5), [], `${bad.length} nodes ≥ ¼ tone off (worst ${fmtArc(worst)})`);
  });

  test('Chart does not depend on which UTC offset expresses the birth instant', () => {
    const offsets = [-10, -4, 5.5, 9.75, 14];
    const bad = [];
    REF.births.slice(0, 100).forEach((b, i) => {
      const tz = offsets[i % offsets.length];
      const c = calculateHumanDesign(...localInput(b.utMs, tz));
      const ref = charts[i];
      for (const side of ['personality', 'design']) {
        for (const body of ['sun', 'moon', 'northNode']) {
          const err = sdiff(c.positions[side][body].longitude, ref.positions[side][body].longitude);
          if (Math.abs(err) > 1e-6) bad.push(`${new Date(b.utMs).toISOString()} tz ${tz} ${side} ${body}: ${fmtArc(err)}`);
        }
      }
      if (Math.abs(designUtMs(c, tz) - designUtMs(ref, 0)) > 60000) bad.push(`${new Date(b.utMs).toISOString()} tz ${tz} design dateTime`);
    });
    assert.deepStrictEqual(bad.slice(0, 5), [], `${bad.length} differences`);
  });

  test('Chart does not depend on the host time zone', () => {
    const inputs = REF.births.slice(0, 50).map((b, i) => localInput(b.utMs, [-5, 5.5, 12.75][i % 3]));
    const run = (tz) => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', `
      const { calculateHumanDesign } = await import(${JSON.stringify(new URL('../src/calculators/humandesign.js', import.meta.url).href)});
      const out = ${JSON.stringify(inputs)}.map((i) => { const c = calculateHumanDesign(...i);
        return [c.positions.design.dateTime, c.positions.design.sun.longitude, c.positions.design.moon.longitude, c.positions.personality.northNode.longitude]; });
      console.log(JSON.stringify(out));`], { env: { ...process.env, TZ: tz }, encoding: 'utf8' }));
    const base = run('UTC');
    for (const tz of ['America/New_York', 'Asia/Kolkata', 'Pacific/Chatham']) assert.deepStrictEqual(run(tz), base, tz);
  });
});
