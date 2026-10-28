/**
 * Western Astrology Calculator
 *
 * Positions from astronomy-engine (VSOP87; true osculating node); Ascendant and
 * Midheaven from sidereal time (Meeus).
 * Calculates: Sun Sign, Moon Sign, Rising Sign (approximate)
 */

import { parseDateComponents, daysBetween } from './utils.js';
import { calculateBirthPositions, getZodiacSign as getSign } from './astronomy.js';

// Zodiac signs with their date ranges (tropical zodiac)
const ZODIAC_SIGNS = [
  {
    name: 'Aries',
    symbol: '♈',
    element: 'Fire',
    modality: 'Cardinal',
    ruler: 'Mars',
    startMonth: 3, startDay: 21,
    endMonth: 4, endDay: 19,
    traits: 'Bold, ambitious, pioneering, energetic',
    shadow: 'Impatient, impulsive, aggressive'
  },
  {
    name: 'Taurus',
    symbol: '♉',
    element: 'Earth',
    modality: 'Fixed',
    ruler: 'Venus',
    startMonth: 4, startDay: 20,
    endMonth: 5, endDay: 20,
    traits: 'Reliable, patient, practical, sensual',
    shadow: 'Stubborn, possessive, materialistic'
  },
  {
    name: 'Gemini',
    symbol: '♊',
    element: 'Air',
    modality: 'Mutable',
    ruler: 'Mercury',
    startMonth: 5, startDay: 21,
    endMonth: 6, endDay: 20,
    traits: 'Curious, adaptable, communicative, witty',
    shadow: 'Scattered, superficial, inconsistent'
  },
  {
    name: 'Cancer',
    symbol: '♋',
    element: 'Water',
    modality: 'Cardinal',
    ruler: 'Moon',
    startMonth: 6, startDay: 21,
    endMonth: 7, endDay: 22,
    traits: 'Nurturing, intuitive, protective, emotional',
    shadow: 'Moody, clingy, oversensitive'
  },
  {
    name: 'Leo',
    symbol: '♌',
    element: 'Fire',
    modality: 'Fixed',
    ruler: 'Sun',
    startMonth: 7, startDay: 23,
    endMonth: 8, endDay: 22,
    traits: 'Creative, generous, warm, confident',
    shadow: 'Arrogant, dramatic, attention-seeking'
  },
  {
    name: 'Virgo',
    symbol: '♍',
    element: 'Earth',
    modality: 'Mutable',
    ruler: 'Mercury',
    startMonth: 8, startDay: 23,
    endMonth: 9, endDay: 22,
    traits: 'Analytical, practical, helpful, precise',
    shadow: 'Critical, anxious, perfectionist'
  },
  {
    name: 'Libra',
    symbol: '♎',
    element: 'Air',
    modality: 'Cardinal',
    ruler: 'Venus',
    startMonth: 9, startDay: 23,
    endMonth: 10, endDay: 22,
    traits: 'Diplomatic, fair, harmonious, social',
    shadow: 'Indecisive, people-pleasing, avoidant'
  },
  {
    name: 'Scorpio',
    symbol: '♏',
    element: 'Water',
    modality: 'Fixed',
    ruler: 'Pluto/Mars',
    startMonth: 10, startDay: 23,
    endMonth: 11, endDay: 21,
    traits: 'Intense, passionate, transformative, perceptive',
    shadow: 'Jealous, secretive, vengeful'
  },
  {
    name: 'Sagittarius',
    symbol: '♐',
    element: 'Fire',
    modality: 'Mutable',
    ruler: 'Jupiter',
    startMonth: 11, startDay: 22,
    endMonth: 12, endDay: 21,
    traits: 'Adventurous, optimistic, philosophical, free',
    shadow: 'Reckless, preachy, commitment-phobic'
  },
  {
    name: 'Capricorn',
    symbol: '♑',
    element: 'Earth',
    modality: 'Cardinal',
    ruler: 'Saturn',
    startMonth: 12, startDay: 22,
    endMonth: 1, endDay: 19,
    traits: 'Ambitious, disciplined, responsible, patient',
    shadow: 'Cold, rigid, workaholic'
  },
  {
    name: 'Aquarius',
    symbol: '♒',
    element: 'Air',
    modality: 'Fixed',
    ruler: 'Uranus/Saturn',
    startMonth: 1, startDay: 20,
    endMonth: 2, endDay: 18,
    traits: 'Innovative, humanitarian, independent, original',
    shadow: 'Detached, rebellious, aloof'
  },
  {
    name: 'Pisces',
    symbol: '♓',
    element: 'Water',
    modality: 'Mutable',
    ruler: 'Neptune/Jupiter',
    startMonth: 2, startDay: 19,
    endMonth: 3, endDay: 20,
    traits: 'Intuitive, compassionate, artistic, dreamy',
    shadow: 'Escapist, victim mentality, boundary issues'
  }
];

// Elements and their meanings
const ELEMENTS = {
  Fire: { signs: ['Aries', 'Leo', 'Sagittarius'], traits: 'Passionate, dynamic, energetic, inspiring' },
  Earth: { signs: ['Taurus', 'Virgo', 'Capricorn'], traits: 'Practical, grounded, reliable, sensual' },
  Air: { signs: ['Gemini', 'Libra', 'Aquarius'], traits: 'Intellectual, communicative, social, ideas-oriented' },
  Water: { signs: ['Cancer', 'Scorpio', 'Pisces'], traits: 'Emotional, intuitive, deep, nurturing' }
};

// Modalities and their meanings
const MODALITIES = {
  Cardinal: { signs: ['Aries', 'Cancer', 'Libra', 'Capricorn'], traits: 'Initiating, leading, starting new things' },
  Fixed: { signs: ['Taurus', 'Leo', 'Scorpio', 'Aquarius'], traits: 'Stabilizing, persevering, determined' },
  Mutable: { signs: ['Gemini', 'Virgo', 'Sagittarius', 'Pisces'], traits: 'Adapting, flexible, changing' }
};

// Aspect definitions with orbs
const ASPECTS = {
  conjunction: { angle: 0, orb: 8, symbol: '☌', nature: 'major', meaning: 'Fusion, intensity, focus' },
  sextile: { angle: 60, orb: 6, symbol: '⚹', nature: 'major', meaning: 'Opportunity, harmony, ease' },
  square: { angle: 90, orb: 8, symbol: '□', nature: 'major', meaning: 'Tension, challenge, action' },
  trine: { angle: 120, orb: 8, symbol: '△', nature: 'major', meaning: 'Flow, talent, ease' },
  opposition: { angle: 180, orb: 8, symbol: '☍', nature: 'major', meaning: 'Polarity, awareness, balance' },
  quincunx: { angle: 150, orb: 3, symbol: '⚻', nature: 'minor', meaning: 'Adjustment, irritation, growth' },
  semisextile: { angle: 30, orb: 2, symbol: '⚺', nature: 'minor', meaning: 'Subtle opportunity, mild tension' },
  semisquare: { angle: 45, orb: 2, symbol: '∠', nature: 'minor', meaning: 'Friction, minor tension' },
  sesquiquadrate: { angle: 135, orb: 2, symbol: '⚼', nature: 'minor', meaning: 'Agitation, persistent challenge' },
  quintile: { angle: 72, orb: 2, symbol: 'Q', nature: 'minor', meaning: 'Creativity, talent, gifts' },
  biquintile: { angle: 144, orb: 2, symbol: 'bQ', nature: 'minor', meaning: 'Creative expression, special ability' }
};

// Planet symbols for aspect display
const PLANET_SYMBOLS = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '⛢',
  neptune: '♆',
  pluto: '♇',
  northNode: '☊',
  southNode: '☋',
  ascendant: 'Asc',
  midheaven: 'MC'
};

/**
 * Calculate the angular difference between two longitudes
 * Returns the smallest angle (0-180)
 */
function angularDifference(long1, long2) {
  let diff = Math.abs(long1 - long2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * Check if two planets form an aspect
 * Returns aspect info or null
 */
function findAspect(planet1Name, planet1Long, planet2Name, planet2Long, includeMinor = true) {
  const diff = angularDifference(planet1Long, planet2Long);

  for (const [aspectName, aspect] of Object.entries(ASPECTS)) {
    if (!includeMinor && aspect.nature === 'minor') continue;

    const orb = Math.abs(diff - aspect.angle);
    if (orb <= aspect.orb) {
      // Calculate if aspect is applying or separating
      // (simplified - would need planet speeds for accuracy)
      const applying = planet1Long < planet2Long;

      return {
        planet1: planet1Name,
        planet2: planet2Name,
        aspect: aspectName,
        symbol: aspect.symbol,
        angle: aspect.angle,
        orb: Math.round(orb * 100) / 100,
        exactOrb: `${orb.toFixed(2)}°`,
        nature: aspect.nature,
        meaning: aspect.meaning,
        applying
      };
    }
  }

  return null;
}

/**
 * Calculate all aspects between planets
 */
function calculateAspects(positions, includeMinor = true) {
  const aspects = [];

  // Build list of all points with their longitudes
  const points = [];

  // Add main planets
  const planetNames = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  for (const name of planetNames) {
    if (positions[name]) {
      points.push({ name, longitude: positions[name].longitude, symbol: PLANET_SYMBOLS[name] });
    }
  }

  // Add nodes
  if (positions.northNode) {
    points.push({ name: 'northNode', longitude: positions.northNode.longitude, symbol: PLANET_SYMBOLS.northNode });
  }

  // Add angles if available
  if (positions.ascendant) {
    points.push({ name: 'ascendant', longitude: positions.ascendant.longitude, symbol: PLANET_SYMBOLS.ascendant });
  }
  if (positions.midheaven) {
    points.push({ name: 'midheaven', longitude: positions.midheaven.longitude, symbol: PLANET_SYMBOLS.midheaven });
  }

  // Find all aspects between pairs
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const aspect = findAspect(
        points[i].name,
        points[i].longitude,
        points[j].name,
        points[j].longitude,
        includeMinor
      );

      if (aspect) {
        aspect.planet1Symbol = points[i].symbol;
        aspect.planet2Symbol = points[j].symbol;
        aspects.push(aspect);
      }
    }
  }

  // Sort by orb (tightest aspects first)
  aspects.sort((a, b) => a.orb - b.orb);

  return aspects;
}

/**
 * Calculate Sun Sign from birth date
 */
export function calculateSunSign(birthDate) {
  const { month, day } = parseDateComponents(birthDate);

  for (const sign of ZODIAC_SIGNS) {
    // Handle Capricorn which spans year boundary
    if (sign.name === 'Capricorn') {
      if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
        return sign;
      }
    } else {
      if ((month === sign.startMonth && day >= sign.startDay) ||
          (month === sign.endMonth && day <= sign.endDay)) {
        return sign;
      }
    }
  }

  return ZODIAC_SIGNS[0]; // Fallback to Aries
}

/**
 * Approximate Moon Sign calculation
 *
 * WARNING: This is a rough approximation and is often INACCURATE.
 * The moon moves ~13° per day and changes signs every ~2.5 days.
 * Accurate calculation requires Swiss Ephemeris with exact birth time/location.
 *
 * This approximation uses a reference point but doesn't account for:
 * - Exact time of day
 * - Lunar orbital variations
 * - Precise astronomical position
 */
export function approximateMoonSign(birthDate) {
  const { year, month, day } = parseDateComponents(birthDate);

  // The moon moves through all 12 signs in ~27.32 days
  // Approximately 2.28 days per sign

  // Reference: New Moon in Aries on April 1, 2022 (UTC)
  const refDateStr = '2022-04-01';
  const birthDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const daysDiff = daysBetween(refDateStr, birthDateStr);

  // Moon cycle is 27.32 days, sign changes every ~2.28 days
  let signIndex = Math.floor((daysDiff / 2.28) % 12);
  if (signIndex < 0) signIndex += 12;

  return {
    sign: ZODIAC_SIGNS[signIndex],
    note: 'APPROXIMATE ONLY - Moon sign requires Swiss Ephemeris for accuracy',
    warning: true
  };
}

/**
 * Calculate Rising Sign (Ascendant)
 * Note: This requires birth time and location for accuracy
 * This is a simplified approximation based on birth time only
 */
export function approximateRisingSign(birthDate, birthHour, sunSign) {
  // The ascendant changes approximately every 2 hours
  // At sunrise, the rising sign is typically the sun sign

  // Approximate sunrise hour (simplified)
  const sunriseHour = 6;

  // Hours after sunrise
  const hoursFromSunrise = (birthHour - sunriseHour + 24) % 24;

  // Each sign rises for about 2 hours (24 hours / 12 signs)
  const signOffset = Math.floor(hoursFromSunrise / 2);

  const sunSignIndex = ZODIAC_SIGNS.findIndex(s => s.name === sunSign.name);
  const risingIndex = (sunSignIndex + signOffset) % 12;

  return {
    sign: ZODIAC_SIGNS[risingIndex],
    note: 'Approximate - for precise rising sign, birth location required'
  };
}

/**
 * Determine element and modality balance
 */
function calculateBalance(sunSign, moonSign, risingSign) {
  const signs = [sunSign, moonSign?.sign, risingSign?.sign].filter(Boolean);

  const elementCount = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalityCount = { Cardinal: 0, Fixed: 0, Mutable: 0 };

  for (const sign of signs) {
    elementCount[sign.element]++;
    modalityCount[sign.modality]++;
  }

  // Find dominant element and modality
  let dominantElement = 'Fire';
  let dominantModality = 'Cardinal';
  let maxElement = 0;
  let maxModality = 0;

  for (const [element, count] of Object.entries(elementCount)) {
    if (count > maxElement) {
      maxElement = count;
      dominantElement = element;
    }
  }

  for (const [modality, count] of Object.entries(modalityCount)) {
    if (count > maxModality) {
      maxModality = count;
      dominantModality = modality;
    }
  }

  return {
    elements: elementCount,
    modalities: modalityCount,
    dominantElement: { name: dominantElement, ...ELEMENTS[dominantElement] },
    dominantModality: { name: dominantModality, ...MODALITIES[dominantModality] }
  };
}

/**
 * Calculate complete Western astrology profile
 * Planetary positions from astronomy-engine (see astronomy.js)
 */
export function calculateAstrology(birthDate, birthHour = 12, timezone = 0, latitude = null, longitude = null) {
  const { year, month, day } = parseDateComponents(birthDate);

  // Planetary positions from astronomy-engine
  const positions = calculateBirthPositions(year, month, day, birthHour, timezone, latitude, longitude);

  // Helper to get zodiac info for a planet
  const getZodiacInfo = (signName) => ZODIAC_SIGNS.find(s => s.name === signName);

  // Get Sun sign from calculated position
  const sunSign = getZodiacInfo(positions.sun.sign) || calculateSunSign(birthDate);

  // Get Moon sign from calculated position (ACCURATE!)
  const moonZodiac = getZodiacInfo(positions.moon.sign);
  const moonSign = {
    sign: moonZodiac,
    degree: positions.moon.degree,
    longitude: positions.moon.longitude,
    note: 'Calculated with astronomy-engine (VSOP87)',
    warning: false
  };

  // Rising sign - accurate if location provided
  let risingSign;
  if (positions.ascendant) {
    const ascZodiac = getZodiacInfo(positions.ascendant.sign);
    risingSign = {
      sign: ascZodiac,
      degree: positions.ascendant.degree,
      longitude: positions.ascendant.longitude,
      note: 'Calculated from sidereal time and birth location',
      accurate: true
    };
  } else {
    risingSign = approximateRisingSign(birthDate, birthHour, sunSign);
    risingSign.note = 'Approximate - birth location needed for accuracy';
    risingSign.accurate = false;
  }

  const balance = calculateBalance(sunSign, moonSign.sign, risingSign.sign);

  // Build planets object with all planetary positions
  const planets = {
    mercury: {
      sign: getZodiacInfo(positions.mercury.sign),
      degree: positions.mercury.degree,
      longitude: positions.mercury.longitude,
      meaning: 'Communication, thinking, learning style'
    },
    venus: {
      sign: getZodiacInfo(positions.venus.sign),
      degree: positions.venus.degree,
      longitude: positions.venus.longitude,
      meaning: 'Love, beauty, values, pleasure'
    },
    mars: {
      sign: getZodiacInfo(positions.mars.sign),
      degree: positions.mars.degree,
      longitude: positions.mars.longitude,
      meaning: 'Action, drive, passion, energy'
    },
    jupiter: {
      sign: getZodiacInfo(positions.jupiter.sign),
      degree: positions.jupiter.degree,
      longitude: positions.jupiter.longitude,
      meaning: 'Growth, expansion, luck, wisdom'
    },
    saturn: {
      sign: getZodiacInfo(positions.saturn.sign),
      degree: positions.saturn.degree,
      longitude: positions.saturn.longitude,
      meaning: 'Discipline, structure, lessons, limits'
    },
    uranus: {
      sign: getZodiacInfo(positions.uranus.sign),
      degree: positions.uranus.degree,
      longitude: positions.uranus.longitude,
      meaning: 'Innovation, rebellion, sudden change'
    },
    neptune: {
      sign: getZodiacInfo(positions.neptune.sign),
      degree: positions.neptune.degree,
      longitude: positions.neptune.longitude,
      meaning: 'Dreams, intuition, spirituality, illusion'
    },
    pluto: {
      sign: getZodiacInfo(positions.pluto.sign),
      degree: positions.pluto.degree,
      longitude: positions.pluto.longitude,
      meaning: 'Transformation, power, death/rebirth'
    }
  };

  // Lunar nodes
  const nodes = {
    north: {
      sign: getZodiacInfo(positions.northNode.sign),
      degree: positions.northNode.degree,
      longitude: positions.northNode.longitude,
      meaning: 'Soul purpose, destiny, growth direction'
    },
    south: {
      sign: getZodiacInfo(positions.southNode.sign),
      degree: positions.southNode.degree,
      longitude: positions.southNode.longitude,
      meaning: 'Past life gifts, comfort zone, release'
    }
  };

  // Midheaven if available
  let midheaven = null;
  if (positions.midheaven) {
    midheaven = {
      sign: getZodiacInfo(positions.midheaven.sign),
      degree: positions.midheaven.degree,
      longitude: positions.midheaven.longitude,
      meaning: 'Career, public image, life direction'
    };
  }

  // Calculate aspects
  const aspects = calculateAspects(positions, true);
  const majorAspects = aspects.filter(a => a.nature === 'major');

  return {
    sun: {
      sign: sunSign,
      degree: positions.sun.degree,
      longitude: positions.sun.longitude,
      meaning: 'Your core identity, ego, and life force'
    },
    moon: {
      ...moonSign,
      meaning: 'Your emotional nature, instincts, and inner self'
    },
    rising: {
      ...risingSign,
      meaning: 'Your outward persona, first impressions, and physical appearance'
    },
    planets,
    nodes,
    midheaven,
    aspects: majorAspects,
    allAspects: aspects,
    balance,
    bigThree: `${sunSign.symbol} ${sunSign.name} Sun, ${moonSign.sign.symbol} ${moonSign.sign.name} Moon, ${risingSign.sign.symbol} ${risingSign.sign.name} Rising`,
    summary: `You are a ${sunSign.name} with ${moonSign.sign.name} Moon and ${risingSign.sign.name} Rising`,
    useEphemeris: true, // We're using accurate calculations now
    julianDay: positions.julianDay,
    hasLocation: latitude !== null && longitude !== null,
    note: 'Calculated with astronomy-engine (VSOP87); angles from sidereal time (Meeus)'
  };
}

/**
 * Get zodiac compatibility
 */
export function getCompatibility(sign1, sign2) {
  const compatibilityRules = {
    // Same element = harmonious
    sameElement: 'Harmonious - natural understanding and flow',
    // Complementary elements (Fire-Air, Earth-Water) = supportive
    complementary: 'Supportive - energize and support each other',
    // Square elements (Fire-Earth, Air-Water) = challenging growth
    challenging: 'Growth-oriented - friction that promotes development',
    // Opposite signs = magnetic attraction with tension
    opposite: 'Magnetic - strong attraction with complementary differences'
  };

  if (sign1.element === sign2.element) {
    return { level: 'high', description: compatibilityRules.sameElement };
  }

  const complementaryPairs = [['Fire', 'Air'], ['Earth', 'Water']];
  for (const pair of complementaryPairs) {
    if (pair.includes(sign1.element) && pair.includes(sign2.element) && sign1.element !== sign2.element) {
      return { level: 'medium-high', description: compatibilityRules.complementary };
    }
  }

  // Check for opposite signs (6 signs apart)
  const index1 = ZODIAC_SIGNS.findIndex(s => s.name === sign1.name);
  const index2 = ZODIAC_SIGNS.findIndex(s => s.name === sign2.name);
  if (Math.abs(index1 - index2) === 6) {
    return { level: 'variable', description: compatibilityRules.opposite };
  }

  return { level: 'medium', description: compatibilityRules.challenging };
}

export { ZODIAC_SIGNS, ELEMENTS, MODALITIES, ASPECTS, PLANET_SYMBOLS };
export default calculateAstrology;
