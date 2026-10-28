/**
 * Reference regression: four charts from the official Jovian Archive / MMI engine.
 *
 * Activations (gate.line, 13 bodies × Personality + Design = 26 per chart, 104 total) were
 * transcribed from Jovian Archive "ZEN Human Design Chart Service" composite PDFs
 * ("Software by Erik Memmert"):
 *   https://mail.humandesignsystem.com/archive/charts/compositeCharts/ObamaBidenComposite.pdf
 *   https://www.humandesignsystem.com/archive/charts/compositeCharts/WinfreyOprah_CruiseTom_composite.pdf
 * Column order in the PDFs: Sun, Earth, Moon, North Node, South Node, Mercury … Pluto.
 * Only numbers are used here; no interpretive text.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { calculateHumanDesign } from '../src/calculators/humandesign.js';

const ORDER = ['sun', 'earth', 'moon', 'northNode', 'southNode', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const ref = (s) => Object.fromEntries(s.trim().split(/\s+/).map((v, i) => [ORDER[i], v]));

// timezone = UTC offset at birth (IANA history, as Jovian printed it in GMT).
const REFERENCE_CHARTS = [
  {
    name: 'Barack Obama', date: '1961-08-04', hour: 19 + 24 / 60, timezone: -10,
    P: ref('33.6 19.6 20.4 29.3 30.3 31.1 15.4 47.6 60.5 61.5 29.1 44.2 40.2'),
    D: ref('2.2 1.2 38.5 59.4 55.4 2.6 21.4 56.4 41.5 60.4 4.3 44.3 59.6'),
    derived: { type: 'Projector', profile: '6/2' },
  },
  {
    name: 'Joe Biden', date: '1942-11-20', hour: 8 + 30 / 60, timezone: -4, // US War Time
    P: ref('14.4 8.4 3.5 59.1 55.1 43.3 14.5 44.6 62.5 16.5 20.3 46.4 31.6'),
    D: ref('29.6 30.6 61.1 59.5 55.5 47.1 31.6 64.3 53.2 35.1 20.5 46.1 31.5'),
    derived: { type: 'Generator', profile: '4/6' },
  },
  {
    name: 'Tom Cruise', date: '1962-07-03', hour: 15 + 6 / 60, timezone: -4, // EDT
    P: ref('39.2 38.2 31.1 33.2 19.2 45.4 4.1 8.2 63.2 19.3 29.4 44.4 40.3'),
    D: ref('21.5 48.5 36.4 7.4 13.4 25.3 3.4 22.1 55.2 19.3 29.3 44.6 40.3'),
    derived: { type: 'Manifestor', profile: '2/5' },
  },
  {
    name: 'Oprah Winfrey', date: '1954-01-29', hour: 4 + 30 / 60, timezone: -6, // CST
    P: ref('19.2 33.2 34.5 61.4 62.4 49.1 19.2 43.6 35.6 44.2 53.6 32.6 4.6'),
    D: ref('44.4 24.4 18.4 60.2 56.2 34.1 57.6 46.4 12.4 50.6 62.3 32.4 29.1'),
    derived: { type: 'Generator', profile: '2/4' },
  },
];

const fmt = (a) => (a ? `${a.gate}.${a.line}` : '—');

describe('Jovian Archive reference charts (104 activations)', () => {
  for (const c of REFERENCE_CHARTS) {
    describe(c.name, () => {
      const chart = calculateHumanDesign(c.date, c.hour, c.timezone);

      for (const [side, R] of [['personality', c.P], ['design', c.D]]) {
        for (const body of ORDER) {
          test(`${side} ${body} = ${R[body]}`, () => {
            assert.strictEqual(fmt(chart.gates[side][body]), R[body]);
          });
        }
      }

      test(`type ${c.derived.type}, profile ${c.derived.profile}`, () => {
        assert.strictEqual(chart.type.name, c.derived.type);
        assert.strictEqual(chart.profile.numbers, c.derived.profile);
      });
    });
  }
});
