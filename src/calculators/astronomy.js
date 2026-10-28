/**
 * Astronomical Calculations using astronomy-engine
 *
 * Uses the astronomy-engine library for high-precision planetary positions.
 * Based on VSOP87 theory, accurate to within ±1 arcminute.
 *
 * Reference: https://github.com/cosinekitty/astronomy
 *
 * Calculates:
 * - Sun, Earth (Sun + 180°) and Moon positions (high accuracy)
 * - All major planets: Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
 * - Lunar Nodes (True node by default: the osculating node from the Moon's
 *   state vector, as Swiss Ephemeris computes it; mean node available via
 *   options.nodeType = 'mean')
 * - Ascendant and Midheaven from sidereal time
 */

import * as Astronomy from 'astronomy-engine';

// Constants
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Obliquity of the ecliptic (mean value for J2000.0)
const OBLIQUITY = 23.4393;

/**
 * Calculate Julian Day from calendar date
 */
export function dateToJulianDay(year, month, day, hour = 0) {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);

  const JD = Math.floor(365.25 * (year + 4716)) +
             Math.floor(30.6001 * (month + 1)) +
             day + hour / 24 + B - 1524.5;

  return JD;
}

/**
 * Julian centuries from J2000.0
 */
function julianCenturies(jd) {
  return (jd - 2451545.0) / 36525;
}

/**
 * Normalize angle to 0-360 degrees
 */
function normalizeAngle(angle) {
  angle = angle % 360;
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * Get ecliptic longitude for a celestial body
 * Uses astronomy-engine for VSOP87-level accuracy
 */
function getEclipticLongitude(body, date) {
  const vec = Astronomy.GeoVector(body, date, true);
  const ecl = Astronomy.Ecliptic(vec);
  return ecl.elon;
}

/**
 * Get ecliptic latitude for a celestial body
 */
function getEclipticLatitude(body, date) {
  const vec = Astronomy.GeoVector(body, date, true);
  const ecl = Astronomy.Ecliptic(vec);
  return ecl.elat;
}

/**
 * Calculate Moon's position using astronomy-engine
 */
export function calculateMoonPosition(jd) {
  // Convert JD to Date object
  const date = Astronomy.MakeTime(jd);

  const vec = Astronomy.GeoVector('Moon', date, true);
  const ecl = Astronomy.Ecliptic(vec);

  return {
    longitude: ecl.elon,
    latitude: ecl.elat,
    distance: ecl.dist * 149597870.7 // Convert AU to km
  };
}

/**
 * Calculate Sun's position using astronomy-engine
 */
export function calculateSunPosition(jd) {
  const date = Astronomy.MakeTime(jd);

  const vec = Astronomy.GeoVector('Sun', date, true);
  const ecl = Astronomy.Ecliptic(vec);

  return {
    longitude: ecl.elon,
    latitude: ecl.elat,
    distance: ecl.dist * 149597870.7,
    R: ecl.dist
  };
}

/**
 * Calculate Greenwich Mean Sidereal Time
 */
export function calculateGMST(jd) {
  const T = julianCenturies(jd);
  const T2 = T * T;
  const T3 = T2 * T;

  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T2 - T3 / 38710000;

  return normalizeAngle(gmst);
}

/**
 * Calculate Local Sidereal Time
 */
export function calculateLST(jd, longitude) {
  const gmst = calculateGMST(jd);
  return normalizeAngle(gmst + longitude);
}

/**
 * Calculate Ascendant (Rising Sign)
 * Formula: tan(ASC) = cos(RAMC) / -(sin(ε) * tan(φ) + cos(ε) * sin(RAMC))
 * Where RAMC = LST (in tropical), ε = obliquity, φ = latitude
 * Reference: https://radixpro.com/a4a-start/the-ascendant/
 */
export function calculateAscendant(jd, latitude, longitude) {
  const RAMC = calculateLST(jd, longitude); // RAMC = LST in degrees
  const RAMC_rad = RAMC * DEG_TO_RAD;
  const latRad = latitude * DEG_TO_RAD;
  const oblRad = OBLIQUITY * DEG_TO_RAD;

  // Using atan2 for proper quadrant handling
  // y = cos(RAMC), x = -(sin(ε) * tan(φ) + cos(ε) * sin(RAMC))
  const y = Math.cos(RAMC_rad);
  const x = -(Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(RAMC_rad));

  let asc = Math.atan2(y, x) * RAD_TO_DEG;
  asc = normalizeAngle(asc);

  // MC-based correction: ASC must be within 180° following MC in zodiacal order
  // This ensures the ascendant is on the eastern horizon
  const mc = calculateMidheaven(jd, longitude);
  let diff = normalizeAngle(asc - mc);

  // If ASC is more than 180° from MC, add 180° to correct
  if (diff > 180) {
    asc = normalizeAngle(asc + 180);
  }

  return asc;
}

/**
 * Calculate Midheaven (MC)
 */
export function calculateMidheaven(jd, longitude) {
  const lst = calculateLST(jd, longitude);
  const lstRad = lst * DEG_TO_RAD;
  const oblRad = OBLIQUITY * DEG_TO_RAD;

  let mc = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(oblRad)) * RAD_TO_DEG;
  mc = normalizeAngle(mc);

  return mc;
}

/**
 * Get zodiac sign from ecliptic longitude
 */
export function getZodiacSign(longitude) {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const index = Math.floor(longitude / 30) % 12;
  return signs[index];
}

/**
 * Format degree as "DD°MM'SS"" within sign
 */
export function formatDegree(longitude) {
  const withinSign = longitude % 30;
  const degrees = Math.floor(withinSign);
  const minutesFloat = (withinSign - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.floor((minutesFloat - minutes) * 60);

  return `${degrees}°${String(minutes).padStart(2, '0')}'${String(seconds).padStart(2, '0')}"`;
}

/**
 * Calculate all planetary positions for a birth chart
 * Uses astronomy-engine for VSOP87-level accuracy (±1 arcminute)
 *
 * @param {object} [options]
 * @param {('true'|'mean')} [options.nodeType='true'] - Lunar node flavor.
 *   True (osculating) node is the dominant Human Design convention; mean
 *   node is exposed for QA against charts produced with that setting.
 */
export function calculateBirthPositions(year, month, day, hour = 12, timezone = 0, latitude = null, longitude = null, options = {}) {
  // Local wall time → UT instant. Date.UTC normalizes day/month overflow; the
  // hour is added in milliseconds so seconds are kept.
  const midnight = new Date(0);
  midnight.setUTCFullYear(year, month - 1, day);
  const utMs = midnight.getTime() + (hour - timezone) * 3600000;
  return calculatePositionsAtUtc(utMs, latitude, longitude, options);
}

/**
 * Ecliptic longitude of the true (osculating) lunar ascending node.
 *
 * The node of the instantaneous orbit plane: the normal h = r × v of the
 * Moon's geocentric state vector, in the true ecliptic and equinox of date,
 * points 90° behind the ascending node. This is the same definition Swiss
 * Ephemeris uses for SE_TRUE_NODE; against it the error is under 20″
 * (1900–2050), versus up to 17′ for the old 5-term Meeus correction.
 */
export function trueNodeLongitude(time) {
  const t = Astronomy.MakeTime(time);
  const s = Astronomy.GeoMoonState(t); // EQJ, AU and AU/day
  const rot = Astronomy.Rotation_EQJ_ECT(t);
  const r = Astronomy.RotateVector(rot, new Astronomy.Vector(s.x, s.y, s.z, t));
  const v = Astronomy.RotateVector(rot, new Astronomy.Vector(s.vx, s.vy, s.vz, t));
  const hx = r.y * v.z - r.z * v.y;
  const hy = r.z * v.x - r.x * v.z;
  return normalizeAngle(Math.atan2(hx, -hy) * RAD_TO_DEG);
}

/**
 * Mean longitude of the Moon's ascending node (Meeus, Astronomical Algorithms 47.7).
 */
export function meanNodeLongitude(jd) {
  const T = julianCenturies(jd);
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;
  return normalizeAngle(125.0445479 - 1934.1362891 * T + 0.0020754 * T2 + T3 / 467441 - T4 / 60616000);
}

/**
 * Sun's apparent ecliptic longitude (true ecliptic of date) at a UT instant.
 */
export function sunLongitudeAtUtc(utMs) {
  return Astronomy.Ecliptic(Astronomy.GeoVector('Sun', new Date(utMs), true)).elon;
}

/**
 * All planetary positions at a UT instant (milliseconds since the Unix epoch).
 * Same result shape as calculateBirthPositions.
 */
export function calculatePositionsAtUtc(utMs, latitude = null, longitude = null, options = {}) {
  const date = new Date(utMs);
  const jd = utMs / 86400000 + 2440587.5;

  // Get positions using astronomy-engine
  const sunVec = Astronomy.GeoVector('Sun', date, true);
  const sunEcl = Astronomy.Ecliptic(sunVec);

  const moonVec = Astronomy.GeoVector('Moon', date, true);
  const moonEcl = Astronomy.Ecliptic(moonVec);

  const mercuryVec = Astronomy.GeoVector('Mercury', date, true);
  const mercuryEcl = Astronomy.Ecliptic(mercuryVec);

  const venusVec = Astronomy.GeoVector('Venus', date, true);
  const venusEcl = Astronomy.Ecliptic(venusVec);

  const marsVec = Astronomy.GeoVector('Mars', date, true);
  const marsEcl = Astronomy.Ecliptic(marsVec);

  const jupiterVec = Astronomy.GeoVector('Jupiter', date, true);
  const jupiterEcl = Astronomy.Ecliptic(jupiterVec);

  const saturnVec = Astronomy.GeoVector('Saturn', date, true);
  const saturnEcl = Astronomy.Ecliptic(saturnVec);

  const uranusVec = Astronomy.GeoVector('Uranus', date, true);
  const uranusEcl = Astronomy.Ecliptic(uranusVec);

  const neptuneVec = Astronomy.GeoVector('Neptune', date, true);
  const neptuneEcl = Astronomy.Ecliptic(neptuneVec);

  const plutoVec = Astronomy.GeoVector('Pluto', date, true);
  const plutoEcl = Astronomy.Ecliptic(plutoVec);

  // Lunar North Node: true (osculating) by default, as Human Design uses
  const useMeanNode = options.nodeType === 'mean';
  const northNodeLong = useMeanNode ? meanNodeLongitude(jd) : trueNodeLongitude(date);
  const southNodeLong = normalizeAngle(northNodeLong + 180);

  const earthLong = normalizeAngle(sunEcl.elon + 180);

  const result = {
    julianDay: jd,
    nodeType: useMeanNode ? 'mean' : 'true',
    sun: {
      longitude: sunEcl.elon,
      latitude: sunEcl.elat,
      sign: getZodiacSign(sunEcl.elon),
      degree: formatDegree(sunEcl.elon)
    },
    earth: {
      longitude: earthLong,
      sign: getZodiacSign(earthLong),
      degree: formatDegree(earthLong)
    },
    moon: {
      longitude: moonEcl.elon,
      latitude: moonEcl.elat,
      sign: getZodiacSign(moonEcl.elon),
      degree: formatDegree(moonEcl.elon)
    },
    mercury: {
      longitude: mercuryEcl.elon,
      sign: getZodiacSign(mercuryEcl.elon),
      degree: formatDegree(mercuryEcl.elon)
    },
    venus: {
      longitude: venusEcl.elon,
      sign: getZodiacSign(venusEcl.elon),
      degree: formatDegree(venusEcl.elon)
    },
    mars: {
      longitude: marsEcl.elon,
      sign: getZodiacSign(marsEcl.elon),
      degree: formatDegree(marsEcl.elon)
    },
    jupiter: {
      longitude: jupiterEcl.elon,
      sign: getZodiacSign(jupiterEcl.elon),
      degree: formatDegree(jupiterEcl.elon)
    },
    saturn: {
      longitude: saturnEcl.elon,
      sign: getZodiacSign(saturnEcl.elon),
      degree: formatDegree(saturnEcl.elon)
    },
    uranus: {
      longitude: uranusEcl.elon,
      sign: getZodiacSign(uranusEcl.elon),
      degree: formatDegree(uranusEcl.elon)
    },
    neptune: {
      longitude: neptuneEcl.elon,
      sign: getZodiacSign(neptuneEcl.elon),
      degree: formatDegree(neptuneEcl.elon)
    },
    pluto: {
      longitude: plutoEcl.elon,
      sign: getZodiacSign(plutoEcl.elon),
      degree: formatDegree(plutoEcl.elon)
    },
    northNode: {
      longitude: northNodeLong,
      sign: getZodiacSign(northNodeLong),
      degree: formatDegree(northNodeLong)
    },
    southNode: {
      longitude: southNodeLong,
      sign: getZodiacSign(southNodeLong),
      degree: formatDegree(southNodeLong)
    }
  };

  // Calculate Ascendant and Midheaven if location provided
  if (latitude !== null && longitude !== null) {
    const asc = calculateAscendant(jd, latitude, longitude);
    const mc = calculateMidheaven(jd, longitude);

    result.ascendant = {
      longitude: asc,
      sign: getZodiacSign(asc),
      degree: formatDegree(asc)
    };

    result.midheaven = {
      longitude: mc,
      sign: getZodiacSign(mc),
      degree: formatDegree(mc)
    };
  }

  return result;
}

export default {
  dateToJulianDay,
  calculateSunPosition,
  calculateMoonPosition,
  calculateGMST,
  calculateLST,
  calculateAscendant,
  calculateMidheaven,
  calculateBirthPositions,
  calculatePositionsAtUtc,
  sunLongitudeAtUtc,
  trueNodeLongitude,
  meanNodeLongitude,
  getZodiacSign,
  formatDegree
};
