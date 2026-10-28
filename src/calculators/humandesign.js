/**
 * Human Design Calculator
 *
 * Human Design synthesizes:
 * - I Ching (64 hexagrams/gates)
 * - Kabbalah (Tree of Life - 9 centers)
 * - Astrology (planetary positions)
 * - Hindu Chakra system
 * - Quantum physics concepts
 *
 * Calculates: Type, Strategy, Authority, Profile, Centers, Gates, Channels
 *
 * Positions from astronomy-engine (see astronomy.js); true (osculating) node;
 * Design instant solved for exactly 88° of solar arc.
 */

import { calculatePositionsAtUtc, localToUtcMs, findSolarArcInstant } from './astronomy.js';
import { parseDateComponents } from './utils.js';
import { getIncarnationCross } from '../data/incarnation-crosses.js';

// The 9 Centers in Human Design
const CENTERS = {
  head: {
    name: 'Head', theme: 'Inspiration', biological: 'Pineal gland',
    pressure: 'Mental pressure to answer questions', motor: false,
    notSelfTheme: 'Trying to answer everyone else\'s questions',
    notSelfQuestion: 'Am I trying to answer questions that don\'t matter to me?',
    definedMeaning: 'Consistent access to inspiration and mental pressure. You inspire others with your questions.',
    undefinedMeaning: 'Amplify others\' mental pressure. Can become overwhelmed by questions that aren\'t yours.',
    openMeaning: 'Completely open to all forms of inspiration. Deeply impressionable by others\' mental pressure.'
  },
  ajna: {
    name: 'Ajna', theme: 'Conceptualization', biological: 'Pituitary',
    pressure: 'Mental awareness and processing', motor: false,
    notSelfTheme: 'Pretending to be certain about things',
    notSelfQuestion: 'Am I trying to convince everyone that I am certain?',
    definedMeaning: 'Consistent way of processing and conceptualizing. You have a reliable mental framework.',
    undefinedMeaning: 'Flexible thinker who can see all perspectives. May feel pressure to have fixed opinions.',
    openMeaning: 'Completely open-minded. Can process information in any way but may struggle with mental certainty.'
  },
  throat: {
    name: 'Throat', theme: 'Manifestation', biological: 'Thyroid',
    pressure: 'Communication and action', motor: false,
    notSelfTheme: 'Trying to attract attention',
    notSelfQuestion: 'Am I trying to attract attention or be heard?',
    definedMeaning: 'Consistent voice and way of expressing. You can reliably communicate and manifest.',
    undefinedMeaning: 'Flexible communicator. May feel pressure to speak or act to get noticed.',
    openMeaning: 'Can channel any form of expression. Deeply sensitive to timing of speech and action.'
  },
  g: {
    name: 'G Center', theme: 'Identity', biological: 'Liver/Blood',
    pressure: 'Love, direction, identity', motor: false,
    notSelfTheme: 'Searching for love and direction',
    notSelfQuestion: 'Am I trying to find love, identity, or direction?',
    definedMeaning: 'Fixed sense of identity and direction. You know who you are and where you\'re going.',
    undefinedMeaning: 'Chameleon identity that adapts to environment. Can become wise about love and direction.',
    openMeaning: 'Completely open to all forms of identity. Place and people strongly determine your experience.'
  },
  heart: {
    name: 'Heart/Ego', theme: 'Willpower', biological: 'Heart/Stomach',
    pressure: 'Material world, ego, willpower', motor: true,
    notSelfTheme: 'Trying to prove your worth',
    notSelfQuestion: 'Am I trying to prove myself or make promises I can\'t keep?',
    definedMeaning: 'Consistent willpower and self-worth. Can make and keep promises reliably.',
    undefinedMeaning: 'Amplify others\' willpower. May over-commit trying to prove worth. Rest the heart.',
    openMeaning: 'No fixed sense of material value. Can become wise about worth but must avoid proving anything.'
  },
  sacral: {
    name: 'Sacral', theme: 'Life Force', biological: 'Ovaries/Testes',
    pressure: 'Vital energy, sexuality, work', motor: true,
    notSelfTheme: 'Not knowing when enough is enough',
    notSelfQuestion: 'Do I know when enough is enough?',
    definedMeaning: 'Sustainable life force energy. Can work consistently when responding to what you love.',
    undefinedMeaning: 'Amplify others\' sacral energy. May overwork. Need to know when to stop and rest.',
    openMeaning: 'No fixed life force. Deeply sensitive to others\' energy. Must protect against burnout.'
  },
  spleen: {
    name: 'Spleen', theme: 'Intuition', biological: 'Spleen/Lymph',
    pressure: 'Survival, health, intuition', motor: false,
    notSelfTheme: 'Holding on to what isn\'t healthy',
    notSelfQuestion: 'Am I holding on to things, people, or habits that aren\'t good for me?',
    definedMeaning: 'Consistent intuitive awareness and immune system. You have reliable instincts.',
    undefinedMeaning: 'Amplify others\' fears and intuitions. May hold on to unhealthy situations out of fear.',
    openMeaning: 'No fixed immune or intuitive pattern. Can become deeply wise about health and survival.'
  },
  solar: {
    name: 'Solar Plexus', theme: 'Emotion', biological: 'Kidneys/Pancreas',
    pressure: 'Emotional wave, feelings', motor: true,
    notSelfTheme: 'Avoiding truth and confrontation to keep the peace',
    notSelfQuestion: 'Am I avoiding truth and confrontation?',
    definedMeaning: 'Consistent emotional wave. You experience life through feelings that move in cycles.',
    undefinedMeaning: 'Amplify others\' emotions. May avoid conflict. Can become wise about emotional truth.',
    openMeaning: 'No fixed emotional pattern. Deeply empathic. Must learn emotions felt are often not your own.'
  },
  root: {
    name: 'Root', theme: 'Pressure', biological: 'Adrenals',
    pressure: 'Stress, adrenaline, drive', motor: true,
    notSelfTheme: 'Being in a hurry to be free of pressure',
    notSelfQuestion: 'Am I in a hurry to get things done just to relieve pressure?',
    definedMeaning: 'Consistent adrenal pressure. You handle stress in your own reliable way.',
    undefinedMeaning: 'Amplify others\' pressure. May rush to complete tasks. Learn to manage pressure wisely.',
    openMeaning: 'No fixed relationship to pressure. Can be deeply sensitive to stress from all sources.'
  }
};

// The 64 Gates mapped to their positions on the zodiac wheel
// Each gate occupies 5.625 degrees (360/64)
// Format: gate number -> { degrees start, center, line meanings }
const GATES = {
  1: { center: 'g', name: 'The Creative', iching: 'The Creative', theme: 'Self-expression' },
  2: { center: 'g', name: 'The Receptive', iching: 'The Receptive', theme: 'Higher knowing' },
  3: { center: 'sacral', name: 'Ordering', iching: 'Difficulty at the Beginning', theme: 'Innovation' },
  4: { center: 'ajna', name: 'Formulization', iching: 'Youthful Folly', theme: 'Mental solutions' },
  5: { center: 'sacral', name: 'Fixed Rhythms', iching: 'Waiting', theme: 'Natural rhythms' },
  6: { center: 'solar', name: 'Friction', iching: 'Conflict', theme: 'Emotional clarity' },
  7: { center: 'g', name: 'The Role of Self', iching: 'The Army', theme: 'Leadership' },
  8: { center: 'throat', name: 'Contribution', iching: 'Holding Together', theme: 'Making a contribution' },
  9: { center: 'sacral', name: 'Focus', iching: 'The Taming Power of the Small', theme: 'Determination' },
  10: { center: 'g', name: 'Behavior of Self', iching: 'Treading', theme: 'Self-love' },
  11: { center: 'ajna', name: 'Ideas', iching: 'Peace', theme: 'New ideas' },
  12: { center: 'throat', name: 'Caution', iching: 'Standstill', theme: 'Social caution' },
  13: { center: 'g', name: 'The Listener', iching: 'Fellowship with Men', theme: 'Listening' },
  14: { center: 'sacral', name: 'Power Skills', iching: 'Possession in Great Measure', theme: 'Wealth' },
  15: { center: 'g', name: 'Extremes', iching: 'Modesty', theme: 'Humanity' },
  16: { center: 'throat', name: 'Skills', iching: 'Enthusiasm', theme: 'Mastery' },
  17: { center: 'ajna', name: 'Opinions', iching: 'Following', theme: 'Opinions' },
  18: { center: 'spleen', name: 'Correction', iching: 'Work on What Has Been Spoiled', theme: 'Correction' },
  19: { center: 'root', name: 'Wanting', iching: 'Approach', theme: 'Sensitivity' },
  20: { center: 'throat', name: 'The Now', iching: 'Contemplation', theme: 'Presence' },
  21: { center: 'heart', name: 'The Hunter', iching: 'Biting Through', theme: 'Control' },
  22: { center: 'solar', name: 'Openness', iching: 'Grace', theme: 'Social grace' },
  23: { center: 'throat', name: 'Assimilation', iching: 'Splitting Apart', theme: 'Expression' },
  24: { center: 'ajna', name: 'Rationalization', iching: 'Return', theme: 'Returning' },
  25: { center: 'g', name: 'Innocence', iching: 'Innocence', theme: 'Universal love' },
  26: { center: 'heart', name: 'The Trickster', iching: 'The Taming Power of the Great', theme: 'Influence' },
  27: { center: 'sacral', name: 'Caring', iching: 'The Corners of the Mouth', theme: 'Nourishment' },
  28: { center: 'spleen', name: 'The Player', iching: 'Preponderance of the Great', theme: 'Struggle' },
  29: { center: 'sacral', name: 'Perseverance', iching: 'The Abysmal', theme: 'Commitment' },
  30: { center: 'solar', name: 'Recognition of Feelings', iching: 'The Clinging', theme: 'Desire' },
  31: { center: 'throat', name: 'Leading', iching: 'Influence', theme: 'Leadership' },
  32: { center: 'spleen', name: 'Continuity', iching: 'Duration', theme: 'Endurance' },
  33: { center: 'throat', name: 'Privacy', iching: 'Retreat', theme: 'Remembering' },
  34: { center: 'sacral', name: 'Power', iching: 'The Power of the Great', theme: 'Pure power' },
  35: { center: 'throat', name: 'Change', iching: 'Progress', theme: 'Experience' },
  36: { center: 'solar', name: 'Crisis', iching: 'Darkening of the Light', theme: 'Exploration' },
  37: { center: 'solar', name: 'Friendship', iching: 'The Family', theme: 'Family' },
  38: { center: 'root', name: 'The Fighter', iching: 'Opposition', theme: 'Struggle' },
  39: { center: 'root', name: 'Provocation', iching: 'Obstruction', theme: 'Provocation' },
  40: { center: 'heart', name: 'Aloneness', iching: 'Deliverance', theme: 'Delivery' },
  41: { center: 'root', name: 'Contraction', iching: 'Decrease', theme: 'Fantasy' },
  42: { center: 'sacral', name: 'Growth', iching: 'Increase', theme: 'Completion' },
  43: { center: 'ajna', name: 'Insight', iching: 'Break-through', theme: 'Insight' },
  44: { center: 'spleen', name: 'Coming to Meet', iching: 'Coming to Meet', theme: 'Alertness' },
  45: { center: 'throat', name: 'Gathering', iching: 'Gathering Together', theme: 'Gathering' },
  46: { center: 'g', name: 'Love of Body', iching: 'Pushing Upward', theme: 'Serendipity' },
  47: { center: 'ajna', name: 'Realization', iching: 'Oppression', theme: 'Realization' },
  48: { center: 'spleen', name: 'Depth', iching: 'The Well', theme: 'Depth' },
  49: { center: 'solar', name: 'Principles', iching: 'Revolution', theme: 'Revolution' },
  50: { center: 'spleen', name: 'Values', iching: 'The Cauldron', theme: 'Values' },
  51: { center: 'heart', name: 'Shock', iching: 'The Arousing', theme: 'Initiation' },
  52: { center: 'root', name: 'Stillness', iching: 'Keeping Still', theme: 'Inaction' },
  53: { center: 'root', name: 'Beginnings', iching: 'Development', theme: 'Starting' },
  54: { center: 'root', name: 'Ambition', iching: 'The Marrying Maiden', theme: 'Ambition' },
  55: { center: 'solar', name: 'Spirit', iching: 'Abundance', theme: 'Abundance' },
  56: { center: 'throat', name: 'Stimulation', iching: 'The Wanderer', theme: 'Stimulation' },
  57: { center: 'spleen', name: 'Intuition', iching: 'The Gentle', theme: 'Intuitive clarity' },
  58: { center: 'root', name: 'Vitality', iching: 'The Joyous', theme: 'Vitality' },
  59: { center: 'sacral', name: 'Sexuality', iching: 'Dispersion', theme: 'Intimacy' },
  60: { center: 'root', name: 'Limitation', iching: 'Limitation', theme: 'Acceptance' },
  61: { center: 'head', name: 'Mystery', iching: 'Inner Truth', theme: 'Inner truth' },
  62: { center: 'throat', name: 'Details', iching: 'Preponderance of the Small', theme: 'Details' },
  63: { center: 'head', name: 'Doubt', iching: 'After Completion', theme: 'Doubt' },
  64: { center: 'head', name: 'Confusion', iching: 'Before Completion', theme: 'Confusion' }
};

// Circuit Groups
const CIRCUIT_GROUPS = {
  individual: { name: 'Individual', theme: 'Empowerment, mutation, uniqueness', keywords: 'Knowing, uniqueness, melancholy' },
  tribal: { name: 'Tribal', theme: 'Support, community, resources', keywords: 'Loyalty, support, bargains' },
  collective: { name: 'Collective', theme: 'Sharing, humanity, evolution', keywords: 'Sharing, logic, experience' },
  integration: { name: 'Integration', theme: 'Self-empowerment, survival', keywords: 'Self, survival, attainment' }
};

// The 36 Channels (connecting two gates) with circuit membership
const CHANNELS = [
  { gates: [1, 8], name: 'Inspiration', centers: ['g', 'throat'], theme: 'Creative role model', circuit: 'individual', subcircuit: 'knowing' },
  { gates: [2, 14], name: 'The Beat', centers: ['g', 'sacral'], theme: 'Keeper of keys', circuit: 'individual', subcircuit: 'knowing' },
  { gates: [3, 60], name: 'Mutation', centers: ['sacral', 'root'], theme: 'Energy for mutation', circuit: 'individual', subcircuit: 'knowing' },
  { gates: [4, 63], name: 'Logic', centers: ['ajna', 'head'], theme: 'Mental ease in doubt', circuit: 'collective', subcircuit: 'logic' },
  { gates: [5, 15], name: 'Rhythm', centers: ['sacral', 'g'], theme: 'Being in flow', circuit: 'collective', subcircuit: 'logic' },
  { gates: [6, 59], name: 'Intimacy', centers: ['solar', 'sacral'], theme: 'Focused on reproduction', circuit: 'tribal', subcircuit: 'defense' },
  { gates: [7, 31], name: 'Alpha', centers: ['g', 'throat'], theme: 'Leadership', circuit: 'collective', subcircuit: 'logic' },
  { gates: [9, 52], name: 'Concentration', centers: ['sacral', 'root'], theme: 'Focused determination', circuit: 'collective', subcircuit: 'logic' },
  { gates: [10, 20], name: 'Awakening', centers: ['g', 'throat'], theme: 'Commitment to self', circuit: 'integration', subcircuit: 'integration' },
  { gates: [10, 34], name: 'Exploration', centers: ['g', 'sacral'], theme: 'Following convictions', circuit: 'integration', subcircuit: 'integration' },
  { gates: [10, 57], name: 'Perfected Form', centers: ['g', 'spleen'], theme: 'Survival', circuit: 'integration', subcircuit: 'integration' },
  { gates: [11, 56], name: 'Curiosity', centers: ['ajna', 'throat'], theme: 'A searcher', circuit: 'collective', subcircuit: 'sensing' },
  { gates: [12, 22], name: 'Openness', centers: ['throat', 'solar'], theme: 'Social being', circuit: 'individual', subcircuit: 'knowing' },
  { gates: [13, 33], name: 'The Prodigal', centers: ['g', 'throat'], theme: 'A witness', circuit: 'collective', subcircuit: 'sensing' },
  { gates: [16, 48], name: 'The Wavelength', centers: ['throat', 'spleen'], theme: 'Talent', circuit: 'collective', subcircuit: 'logic' },
  { gates: [17, 62], name: 'Acceptance', centers: ['ajna', 'throat'], theme: 'An organizational being', circuit: 'collective', subcircuit: 'logic' },
  { gates: [18, 58], name: 'Judgement', centers: ['spleen', 'root'], theme: 'Insatiability', circuit: 'collective', subcircuit: 'logic' },
  { gates: [19, 49], name: 'Synthesis', centers: ['root', 'solar'], theme: 'Sensitivity', circuit: 'tribal', subcircuit: 'ego' },
  { gates: [20, 34], name: 'Charisma', centers: ['throat', 'sacral'], theme: 'Busy-ness', circuit: 'integration', subcircuit: 'integration' },
  { gates: [20, 57], name: 'The Brainwave', centers: ['throat', 'spleen'], theme: 'Penetrating awareness', circuit: 'integration', subcircuit: 'integration' },
  { gates: [21, 45], name: 'Money', centers: ['heart', 'throat'], theme: 'A materialist', circuit: 'tribal', subcircuit: 'ego' },
  { gates: [23, 43], name: 'Structuring', centers: ['throat', 'ajna'], theme: 'Individuality', circuit: 'individual', subcircuit: 'knowing' },
  { gates: [24, 61], name: 'Awareness', centers: ['ajna', 'head'], theme: 'A thinker', circuit: 'individual', subcircuit: 'knowing' },
  { gates: [25, 51], name: 'Initiation', centers: ['g', 'heart'], theme: 'Needing to be first', circuit: 'individual', subcircuit: 'centering' },
  { gates: [26, 44], name: 'Surrender', centers: ['heart', 'spleen'], theme: 'A transmitter', circuit: 'tribal', subcircuit: 'ego' },
  { gates: [27, 50], name: 'Preservation', centers: ['sacral', 'spleen'], theme: 'Custodianship', circuit: 'tribal', subcircuit: 'defense' },
  { gates: [28, 38], name: 'Struggle', centers: ['spleen', 'root'], theme: 'Stubbornness', circuit: 'individual', subcircuit: 'knowing' },
  { gates: [29, 46], name: 'Discovery', centers: ['sacral', 'g'], theme: 'Succeeding where others fail', circuit: 'collective', subcircuit: 'sensing' },
  { gates: [30, 41], name: 'Recognition', centers: ['solar', 'root'], theme: 'Focused energy', circuit: 'collective', subcircuit: 'sensing' },
  { gates: [32, 54], name: 'Transformation', centers: ['spleen', 'root'], theme: 'Being driven', circuit: 'tribal', subcircuit: 'ego' },
  { gates: [34, 57], name: 'Power', centers: ['sacral', 'spleen'], theme: 'An archetype', circuit: 'integration', subcircuit: 'integration' },
  { gates: [35, 36], name: 'Transitoriness', centers: ['throat', 'solar'], theme: 'A jack of all trades', circuit: 'collective', subcircuit: 'sensing' },
  { gates: [37, 40], name: 'Community', centers: ['solar', 'heart'], theme: 'Part of a bargain', circuit: 'tribal', subcircuit: 'ego' },
  { gates: [39, 55], name: 'Emoting', centers: ['root', 'solar'], theme: 'Moodiness', circuit: 'individual', subcircuit: 'knowing' },
  { gates: [42, 53], name: 'Maturation', centers: ['sacral', 'root'], theme: 'Balanced development', circuit: 'collective', subcircuit: 'sensing' },
  { gates: [47, 64], name: 'Abstraction', centers: ['ajna', 'head'], theme: 'Mental activity/clarity', circuit: 'collective', subcircuit: 'sensing' }
];

// The 5 Human Design Types
const TYPES = {
  manifestor: {
    name: 'Manifestor',
    strategy: 'Inform',
    notSelf: 'Anger',
    signature: 'Peace',
    description: 'Independent initiators who can make things happen',
    percentage: '9%'
  },
  generator: {
    name: 'Generator',
    strategy: 'Wait to Respond',
    notSelf: 'Frustration',
    signature: 'Satisfaction',
    description: 'Life force beings who respond to what life brings',
    percentage: '37%'
  },
  manifestingGenerator: {
    name: 'Manifesting Generator',
    strategy: 'Wait to Respond, then Inform',
    notSelf: 'Frustration/Anger',
    signature: 'Satisfaction',
    description: 'Multi-passionate beings who can move quickly',
    percentage: '33%'
  },
  projector: {
    name: 'Projector',
    strategy: 'Wait for the Invitation',
    notSelf: 'Bitterness',
    signature: 'Success',
    description: 'Guides and managers who see others deeply',
    percentage: '20%'
  },
  reflector: {
    name: 'Reflector',
    strategy: 'Wait a Lunar Cycle',
    notSelf: 'Disappointment',
    signature: 'Surprise',
    description: 'Mirrors of community health and wisdom',
    percentage: '1%'
  }
};

// Line names for profile building
const LINE_NAMES = {
  1: 'Investigator',
  2: 'Hermit',
  3: 'Martyr',
  4: 'Opportunist',
  5: 'Heretic',
  6: 'Role Model'
};

// The 12 Profiles (combinations of two line numbers)
const PROFILES = {
  '1/3': { name: 'Investigator/Martyr', theme: 'Learning through trial and error' },
  '1/4': { name: 'Investigator/Opportunist', theme: 'Foundation through relationships' },
  '2/4': { name: 'Hermit/Opportunist', theme: 'Natural talent shared with others' },
  '2/5': { name: 'Hermit/Heretic', theme: 'Called out for natural gifts' },
  '3/5': { name: 'Martyr/Heretic', theme: 'Learning through experience to save others' },
  '3/6': { name: 'Martyr/Role Model', theme: 'Trial and error becoming wisdom' },
  '4/6': { name: 'Opportunist/Role Model', theme: 'Networking toward role modeling' },
  '4/1': { name: 'Opportunist/Investigator', theme: 'Influencing through research' },
  '5/1': { name: 'Heretic/Investigator', theme: 'Practical solutions from study' },
  '5/2': { name: 'Heretic/Hermit', theme: 'Called out but needs alone time' },
  '6/2': { name: 'Role Model/Hermit', theme: 'Wise but needs solitude' },
  '6/3': { name: 'Role Model/Martyr', theme: 'Wisdom from life experience' }
};

// Get profile info with fallback for unlisted combinations
function getProfileInfo(line1, line2) {
  const key = `${line1}/${line2}`;
  if (PROFILES[key]) return PROFILES[key];
  // Fallback: construct name from line names
  const name1 = LINE_NAMES[line1] || `Line ${line1}`;
  const name2 = LINE_NAMES[line2] || `Line ${line2}`;
  return { name: `${name1}/${name2}`, theme: 'Unique combination of energies' };
}

// Authorities (decision-making process)
const AUTHORITIES = {
  emotional: { name: 'Emotional Authority', description: 'Wait for emotional clarity over time' },
  sacral: { name: 'Sacral Authority', description: 'Listen to gut response sounds' },
  splenic: { name: 'Splenic Authority', description: 'Trust instant intuitive knowing' },
  ego: { name: 'Ego/Heart Authority', description: 'Follow what the heart wants' },
  self: { name: 'Self-Projected Authority', description: 'Hear truth in your own voice' },
  mental: { name: 'Mental/Environment', description: 'Process with trusted others' },
  lunar: { name: 'Lunar Authority', description: 'Wait 28 days for clarity' }
};

/**
 * Map zodiac longitude to gate number
 * The 64 gates are distributed around the zodiac wheel
 * Each gate occupies 5.625 degrees (360/64 = 5°37'30")
 *
 * Gate order verified from official Rave Mandala:
 * https://www.barneyandflow.com/gate-zodiac-degrees
 *
 * Gate 25 starts at 358°15' (28°15' Pisces) - this is the offset
 */
const GATE_WHEEL_OFFSET = 358.25; // 358°15' where Gate 25 starts

// Gates in order around the wheel starting from Gate 25
const GATE_ORDER = [
  25, 17, 21, 51, 42, 3,   // Aries
  27, 24, 2, 23, 8, 20,    // Taurus
  16, 35, 45, 12, 15, 52,  // Gemini
  39, 53, 62, 56, 31, 33,  // Cancer/Leo
  7, 4, 29, 59, 40, 64,    // Leo/Virgo
  47, 6, 46, 18, 48, 57,   // Virgo/Libra
  32, 50, 28, 44, 1, 43,   // Libra/Scorpio
  14, 34, 9, 5, 26, 11,    // Sagittarius
  10, 58, 38, 54, 61, 60,  // Capricorn
  41, 19, 13, 49, 30, 55,  // Aquarius
  37, 63, 22, 36           // Pisces (then back to 25)
];

/**
 * Convert zodiac longitude to gate
 * @param {number} longitude - Zodiac longitude (0-360, 0° = 0° Aries)
 */
function longitudeToGate(longitude) {
  // Normalize to 0-360
  const normalizedLong = ((longitude % 360) + 360) % 360;
  // Adjust for wheel offset (Gate 25 starts at 358.25°)
  const adjustedLong = ((normalizedLong - GATE_WHEEL_OFFSET + 360) % 360);
  // Each gate is 5.625 degrees
  const gateIndex = Math.floor(adjustedLong / 5.625);
  return GATE_ORDER[gateIndex % 64];
}

/**
 * Get line number from longitude (each gate has 6 lines)
 * Lines are numbered 1-6, each spanning 0.9375 degrees
 */
function longitudeToLine(longitude) {
  const normalizedLong = ((longitude % 360) + 360) % 360;
  // Adjust for wheel offset
  const adjustedLong = ((normalizedLong - GATE_WHEEL_OFFSET + 360) % 360);
  // Position within gate
  const withinGate = adjustedLong % 5.625;
  // Each line is 0.9375 degrees (5.625 / 6)
  const line = Math.floor(withinGate / 0.9375) + 1;
  return Math.min(line, 6); // Ensure max is 6
}

/**
 * Convert planet positions to gate activations.
 * Includes the full substructure (line/color/tone/base) so consumers can
 * build Variable/PHS features and re-derive anything from the longitude.
 */
function planetToGateActivation(planet, longitude) {
  if (!longitude && longitude !== 0) return null;
  const gate = longitudeToGate(longitude);
  const line = longitudeToLine(longitude);
  return {
    planet,
    gate,
    line,
    color: longitudeToColor(longitude),
    tone: longitudeToTone(longitude),
    base: longitudeToBase(longitude),
    longitude,
    ...GATES[gate]
  };
}

/**
 * Calculate Human Design chart.
 *
 * Planetary positions via astronomy-engine (VSOP87, ±1 arcminute); design
 * moment solved for exactly 88° of solar arc before birth.
 *
 * @param {string} birthDate - YYYY-MM-DD (local)
 * @param {number} birthHour - decimal local hour (14.5 = 2:30 PM)
 * @param {number} timezone - UTC offset in hours at the birth moment
 * @param {object} [options]
 * @param {('true'|'mean')} [options.nodeType='true'] - lunar node flavor
 */
export function calculateHumanDesign(birthDate, birthHour = 12, timezone = 0, options = {}) {
  const { year, month, day } = parseDateComponents(birthDate);

  // Personality: the birth instant. Design: the instant the Sun stood exactly
  // 88° of ecliptic longitude earlier (about 86–92 days, varying with Earth's
  // orbital speed). Both are solved in UT milliseconds, so the host time zone
  // never enters the calculation.
  const birthUtMs = localToUtcMs(year, month, day, birthHour, timezone);
  const designUtMs = findSolarArcInstant(birthUtMs, 88);
  const personalityPos = calculatePositionsAtUtc(birthUtMs, null, null, options);
  const designPos = calculatePositionsAtUtc(designUtMs, null, null, options);

  // Design moment as local wall time at the birth offset, to the minute.
  const designLocal = new Date(Math.round((designUtMs + timezone * 3600000) / 60000) * 60000).toISOString();

  // Build gate activations for all planets
  const personalityGates = {
    sun: planetToGateActivation('sun', personalityPos.sun.longitude),
    earth: planetToGateActivation('earth', (personalityPos.sun.longitude + 180) % 360),
    moon: planetToGateActivation('moon', personalityPos.moon.longitude),
    northNode: planetToGateActivation('northNode', personalityPos.northNode.longitude),
    southNode: planetToGateActivation('southNode', personalityPos.southNode.longitude),
    mercury: planetToGateActivation('mercury', personalityPos.mercury.longitude),
    venus: planetToGateActivation('venus', personalityPos.venus.longitude),
    mars: planetToGateActivation('mars', personalityPos.mars.longitude),
    jupiter: planetToGateActivation('jupiter', personalityPos.jupiter.longitude),
    saturn: planetToGateActivation('saturn', personalityPos.saturn.longitude),
    uranus: planetToGateActivation('uranus', personalityPos.uranus.longitude),
    neptune: planetToGateActivation('neptune', personalityPos.neptune.longitude),
    pluto: planetToGateActivation('pluto', personalityPos.pluto.longitude)
  };

  const designGates = {
    sun: planetToGateActivation('sun', designPos.sun.longitude),
    earth: planetToGateActivation('earth', (designPos.sun.longitude + 180) % 360),
    moon: planetToGateActivation('moon', designPos.moon.longitude),
    northNode: planetToGateActivation('northNode', designPos.northNode.longitude),
    southNode: planetToGateActivation('southNode', designPos.southNode.longitude),
    mercury: planetToGateActivation('mercury', designPos.mercury.longitude),
    venus: planetToGateActivation('venus', designPos.venus.longitude),
    mars: planetToGateActivation('mars', designPos.mars.longitude),
    jupiter: planetToGateActivation('jupiter', designPos.jupiter.longitude),
    saturn: planetToGateActivation('saturn', designPos.saturn.longitude),
    uranus: planetToGateActivation('uranus', designPos.uranus.longitude),
    neptune: planetToGateActivation('neptune', designPos.neptune.longitude),
    pluto: planetToGateActivation('pluto', designPos.pluto.longitude)
  };

  // Collect all active gates from all planets
  const activeGates = new Set();
  Object.values(personalityGates).forEach(g => { if (g) activeGates.add(g.gate); });
  Object.values(designGates).forEach(g => { if (g) activeGates.add(g.gate); });

  // Profile from Sun lines
  const personalitySunLine = personalityGates.sun?.line || 1;
  const designSunLine = designGates.sun?.line || 1;
  const profile = `${personalitySunLine}/${designSunLine}`;
  const profileInfo = getProfileInfo(personalitySunLine, designSunLine);

  // Find active channels
  const activeChannels = CHANNELS.filter(channel =>
    activeGates.has(channel.gates[0]) && activeGates.has(channel.gates[1])
  );

  // Determine defined centers from active channels
  const definedCenters = new Set();
  activeChannels.forEach(channel => {
    channel.centers.forEach(center => definedCenters.add(center));
  });

  // Determine Type based on defined centers
  let type = 'projector'; // Default
  const hasSacral = definedCenters.has('sacral');
  const hasMotorToThroat = checkMotorToThroat(activeChannels);

  if (!hasSacral && hasMotorToThroat) {
    type = 'manifestor';
  } else if (hasSacral) {
    if (hasMotorToThroat) {
      type = 'manifestingGenerator';
    } else {
      type = 'generator';
    }
  } else if (definedCenters.size === 0) {
    type = 'reflector';
  }

  // Determine Authority
  const authority = determineAuthority(definedCenters, hasSacral);

  // Incarnation Cross (from Sun/Earth gates)
  const personalitySunGate = personalityGates.sun?.gate;
  const personalityEarthGate = personalityGates.earth?.gate;
  const designSunGate = designGates.sun?.gate;
  const designEarthGate = designGates.earth?.gate;

  // Get proper Incarnation Cross name based on Personality Sun and Profile
  const crossGates = [personalitySunGate, personalityEarthGate, designSunGate, designEarthGate];
  const crossInfo = getIncarnationCross(personalitySunGate, profile, crossGates);

  const incarnationCross = {
    ...crossInfo,
    gates: crossGates,
    gateNames: [
      GATES[personalitySunGate]?.name,
      GATES[personalityEarthGate]?.name,
      GATES[designSunGate]?.name,
      GATES[designEarthGate]?.name
    ]
  };

  // Determine definition type based on center connectivity groups
  const definitionType = determineDefinitionType(activeChannels, definedCenters);

  // Classify undefined centers as "undefined" (has gates) vs "open" (no gates)
  const undefinedCenterDetails = Object.keys(CENTERS)
    .filter(c => !definedCenters.has(c))
    .map(c => {
      // Check if any gates in this center are activated
      const centerGates = Object.entries(GATES)
        .filter(([, g]) => g.center === c)
        .map(([num]) => parseInt(num));
      const hasGates = centerGates.some(g => activeGates.has(g));
      return {
        ...CENTERS[c],
        key: c,
        status: hasGates ? 'undefined' : 'open',
        activatedGates: centerGates.filter(g => activeGates.has(g))
      };
    });

  // Circuit analysis: count channels per circuit
  const circuitAnalysis = {
    individual: { channels: 0, names: [] },
    tribal: { channels: 0, names: [] },
    collective: { channels: 0, names: [] },
    integration: { channels: 0, names: [] }
  };
  activeChannels.forEach(ch => {
    if (ch.circuit && circuitAnalysis[ch.circuit]) {
      circuitAnalysis[ch.circuit].channels++;
      circuitAnalysis[ch.circuit].names.push(ch.name);
    }
  });
  const dominantCircuit = Object.entries(circuitAnalysis)
    .filter(([, v]) => v.channels > 0)
    .sort((a, b) => b[1].channels - a[1].channels)[0];

  // Calculate Variable (Four Arrows): type from Color, direction from Tone
  const variable = calculateVariable(personalityPos, designPos);

  return {
    type: TYPES[type],
    authority: AUTHORITIES[authority],
    profile: {
      numbers: profile,
      ...profileInfo
    },
    definition: definitionType,
    incarnationCross,
    centers: {
      defined: Array.from(definedCenters).map(c => ({ ...CENTERS[c], key: c })),
      undefined: undefinedCenterDetails.filter(c => c.status === 'undefined'),
      open: undefinedCenterDetails.filter(c => c.status === 'open'),
      definedNames: Array.from(definedCenters),
      undefinedNames: undefinedCenterDetails.filter(c => c.status === 'undefined').map(c => c.key),
      openNames: undefinedCenterDetails.filter(c => c.status === 'open').map(c => c.key),
      allUndefinedNames: Object.keys(CENTERS).filter(c => !definedCenters.has(c))
    },
    gates: {
      personality: personalityGates,
      design: designGates,
      all: Array.from(activeGates)
    },
    channels: activeChannels,
    circuitAnalysis: {
      ...circuitAnalysis,
      dominant: dominantCircuit ? {
        name: dominantCircuit[0],
        ...CIRCUIT_GROUPS[dominantCircuit[0]],
        channelCount: dominantCircuit[1].channels
      } : null
    },
    variable,
    // Reproducibility metadata — everything needed to re-derive or compare
    meta: {
      birthDate,
      birthHour,
      timezone,
      nodeType: personalityPos.nodeType || 'true',
      ephemeris: 'astronomy-engine (VSOP87)',
      designSolarArc: 88
    },
    // Raw planetary positions for advanced users
    positions: {
      personality: {
        date: birthDate,
        utc: new Date(birthUtMs).toISOString(),
        sun: personalityPos.sun,
        earth: personalityPos.earth,
        moon: personalityPos.moon,
        northNode: personalityPos.northNode,
        southNode: personalityPos.southNode,
        mercury: personalityPos.mercury,
        venus: personalityPos.venus,
        mars: personalityPos.mars,
        jupiter: personalityPos.jupiter,
        saturn: personalityPos.saturn,
        uranus: personalityPos.uranus,
        neptune: personalityPos.neptune,
        pluto: personalityPos.pluto
      },
      design: {
        date: designLocal.slice(0, 10),
        // Local time (birth timezone) of the exact 88°-solar-arc moment
        dateTime: designLocal.slice(0, 16),
        utc: new Date(designUtMs).toISOString(),
        sun: designPos.sun,
        earth: designPos.earth,
        moon: designPos.moon,
        northNode: designPos.northNode,
        southNode: designPos.southNode,
        mercury: designPos.mercury,
        venus: designPos.venus,
        mars: designPos.mars,
        jupiter: designPos.jupiter,
        saturn: designPos.saturn,
        uranus: designPos.uranus,
        neptune: designPos.neptune,
        pluto: designPos.pluto
      }
    },
    useEphemeris: true,
    summary: `${TYPES[type].name} with ${AUTHORITIES[authority].name}, ${profileInfo.name} Profile`,
    note: 'Calculated with astronomy-engine (VSOP87) — all 13 activation points, design at exactly 88° solar arc'
  };
}

/**
 * Determine definition type using graph connectivity analysis
 * Counts the number of connected components among defined centers
 */
function determineDefinitionType(channels, definedCenters) {
  if (definedCenters.size === 0) return 'No Definition';
  if (channels.length === 0) return 'No Definition';

  // Build adjacency graph
  const adj = new Map();
  for (const c of definedCenters) adj.set(c, new Set());
  channels.forEach(ch => {
    const [c1, c2] = ch.centers;
    if (adj.has(c1) && adj.has(c2)) {
      adj.get(c1).add(c2);
      adj.get(c2).add(c1);
    }
  });

  // Count connected components via BFS
  const visited = new Set();
  let components = 0;
  for (const center of definedCenters) {
    if (visited.has(center)) continue;
    components++;
    const queue = [center];
    visited.add(center);
    while (queue.length > 0) {
      const current = queue.shift();
      for (const neighbor of (adj.get(current) || [])) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
  }

  if (components === 1) return 'Single Definition';
  if (components === 2) return 'Split Definition';
  if (components === 3) return 'Triple Split Definition';
  return 'Quadruple Split Definition';
}

// Variable / Four Arrows calculation
// Each arrow's type is the Color (1-6) and its direction the Tone (1-3 left, 4-6 right)
// of specific planetary positions
// Color is the sub-line level: each Line spans 0.9375°, each Color spans 0.15625° (0.9375/6)
const DETERMINATION_TYPES = {
  1: { name: 'Appetite', description: 'Eat simple, one thing at a time. Consecutive diet.' },
  2: { name: 'Taste', description: 'Sensitive palate. Open or closed taste preferences.' },
  3: { name: 'Thirst', description: 'Temperature sensitivity. Hot or cold food/drink.' },
  4: { name: 'Touch', description: 'Environment affects digestion. Calm surroundings needed.' },
  5: { name: 'Sound', description: 'Acoustic environment matters. Sound affects metabolism.' },
  6: { name: 'Light', description: 'Light conditions affect eating. Direct or indirect light.' }
};

const ENVIRONMENT_TYPES = {
  1: { name: 'Caves', description: 'Enclosed, protected, selective spaces. Privacy and shelter.' },
  2: { name: 'Markets', description: 'Places of exchange and gathering. Commercial, busy spaces.' },
  3: { name: 'Kitchens', description: 'Transformative spaces. Where things are heated and prepared.' },
  4: { name: 'Mountains', description: 'Elevated spaces. Higher altitude, views, expansive.' },
  5: { name: 'Valleys', description: 'Acoustically rich environments. Sounds and resonance.' },
  6: { name: 'Shores', description: 'Transitional spaces. Edges, boundaries, thresholds.' }
};

const PERSPECTIVE_TYPES = {
  1: { name: 'Survival', description: 'Awareness focused on security and self-preservation.' },
  2: { name: 'Possibility', description: 'Open, optimistic view. Sees potential everywhere.' },
  3: { name: 'Power', description: 'Focused on influence and impact. Sees dynamics of control.' },
  4: { name: 'Wanting', description: 'Driven by desire. Sees what is needed or missing.' },
  5: { name: 'Probability', description: 'Analytical, practical view. Calculates odds and outcomes.' },
  6: { name: 'Personal', description: 'Introspective, self-reflective view. Deeply personal lens.' }
};

const MOTIVATION_TYPES = {
  1: { name: 'Fear', description: 'Motivated to understand the unknown. Natural researcher and learner.' },
  2: { name: 'Hope', description: 'Motivated by patience and trust. Waits and observes before acting.' },
  3: { name: 'Desire', description: 'Motivated to move and organize. Initiates with purpose.' },
  4: { name: 'Need', description: 'Motivated by service. Identifies what must be done for the collective.' },
  5: { name: 'Guilt', description: 'Motivated by deep responsibility. Driven to fix and manage.' },
  6: { name: 'Innocence', description: 'Motivated by non-doing. Shows up without agenda or expectation.' }
};

const COGNITION_TYPES = {
  1: { name: 'Smell', description: 'Information processed through scent and atmospheric frequencies.' },
  2: { name: 'Taste', description: 'Information processed through the mouth and palate.' },
  3: { name: 'Outer Vision', description: 'Aesthetically oriented. Processes through what is seen externally.' },
  4: { name: 'Inner Vision', description: 'Visualization and imagination. Sees beyond the physical.' },
  5: { name: 'Feeling', description: 'Sensing vibes and subtle energies. Processes through touch and feel.' },
  6: { name: 'Touch', description: 'Information through hands and physical contact. Tactile intelligence.' }
};

/**
 * Get the Color (1-6) from a zodiac longitude
 * Each gate = 5.625°, each line = 0.9375°, each color = 0.15625°
 */
function longitudeToColor(longitude) {
  const normalizedLong = ((longitude % 360) + 360) % 360;
  const adjustedLong = ((normalizedLong - GATE_WHEEL_OFFSET + 360) % 360);
  const withinGate = adjustedLong % 5.625;
  const withinLine = withinGate % 0.9375;
  const color = Math.floor(withinLine / 0.15625) + 1;
  return Math.min(color, 6);
}

/**
 * Get the Tone (1-6) from a zodiac longitude
 * Each color = 0.15625°, each tone = 0.026041667°
 */
function longitudeToTone(longitude) {
  const normalizedLong = ((longitude % 360) + 360) % 360;
  const adjustedLong = ((normalizedLong - GATE_WHEEL_OFFSET + 360) % 360);
  const withinGate = adjustedLong % 5.625;
  const withinLine = withinGate % 0.9375;
  const withinColor = withinLine % 0.15625;
  const tone = Math.floor(withinColor / 0.026041667) + 1;
  return Math.min(tone, 6);
}

/**
 * Get the Base (1-5) from a zodiac longitude.
 * Note the 6/6/6/5 subdivision: each tone divides into FIVE bases
 * (0.026041667° / 5 = 0.005208333°), giving 1,080 positions per gate.
 */
function longitudeToBase(longitude) {
  const normalizedLong = ((longitude % 360) + 360) % 360;
  const adjustedLong = ((normalizedLong - GATE_WHEEL_OFFSET + 360) % 360);
  const withinGate = adjustedLong % 5.625;
  const withinLine = withinGate % 0.9375;
  const withinColor = withinLine % 0.15625;
  const withinTone = withinColor % 0.026041667;
  const base = Math.floor(withinTone / 0.005208333) + 1;
  return Math.min(base, 5);
}

/**
 * Calculate Variable (Four Arrows)
 *
 * Canonical mapping (verified against multiple PHS/Rave Psychology sources):
 * - Top Left (Determination / Digestion): DESIGN SUN — Color selects the
 *   digestion type; Tone gives the arrow direction and the Cognition.
 * - Bottom Left (Environment): DESIGN NODES — Color selects the environment
 *   type; Tone gives the arrow direction.
 * - Top Right (Motivation): PERSONALITY SUN — Color selects the motivation
 *   type; Tone gives the arrow direction.
 * - Bottom Right (Perspective / View): PERSONALITY NODES — Color selects the
 *   view type; Tone gives the arrow direction.
 *
 * Arrow direction comes from the TONE: tones 1-3 → left (active, focused,
 * strategic), tones 4-6 → right (passive, receptive, peripheral).
 * Color does NOT determine direction.
 */
function calculateVariable(personalityPos, designPos) {
  const personalitySunLong = personalityPos.sun.longitude;
  const designSunLong = designPos.sun.longitude;
  const personalityNodeLong = personalityPos.northNode.longitude;
  const designNodeLong = designPos.northNode.longitude;

  const determinationColor = longitudeToColor(designSunLong);
  const environmentColor = longitudeToColor(designNodeLong);
  const motivationColor = longitudeToColor(personalitySunLong);
  const perspectiveColor = longitudeToColor(personalityNodeLong);

  const determinationTone = longitudeToTone(designSunLong);
  const environmentTone = longitudeToTone(designNodeLong);
  const motivationTone = longitudeToTone(personalitySunLong);
  const perspectiveTone = longitudeToTone(personalityNodeLong);

  // Direction from TONE: 1-3 = left (active/strategic), 4-6 = right (receptive)
  const isLeft = (tone) => tone <= 3;

  const arrows = {
    determination: {
      arrow: isLeft(determinationTone) ? 'left' : 'right',
      color: determinationColor,
      tone: determinationTone,
      ...DETERMINATION_TYPES[determinationColor],
      cognition: COGNITION_TYPES[determinationTone]
    },
    environment: {
      arrow: isLeft(environmentTone) ? 'left' : 'right',
      color: environmentColor,
      tone: environmentTone,
      ...ENVIRONMENT_TYPES[environmentColor]
    },
    motivation: {
      arrow: isLeft(motivationTone) ? 'left' : 'right',
      color: motivationColor,
      tone: motivationTone,
      ...MOTIVATION_TYPES[motivationColor]
    },
    perspective: {
      arrow: isLeft(perspectiveTone) ? 'left' : 'right',
      color: perspectiveColor,
      tone: perspectiveTone,
      ...PERSPECTIVE_TYPES[perspectiveColor]
    }
  };

  // Four-arrow notation in display order:
  // [Determination, Environment] (left/Design column), [Motivation, Perspective] (right/Personality column)
  const notation = `${arrows.determination.arrow[0].toUpperCase()}${arrows.environment.arrow[0].toUpperCase()} ${arrows.motivation.arrow[0].toUpperCase()}${arrows.perspective.arrow[0].toUpperCase()}`;

  return {
    ...arrows,
    notation,
    digestiveType: arrows.determination.name,
    environmentType: arrows.environment.name,
    perspectiveType: arrows.perspective.name,
    motivationType: arrows.motivation.name
  };
}

/**
 * Check if there's a motor center connected to throat (directly or indirectly)
 * Uses breadth-first search through the defined channel network
 */
function checkMotorToThroat(channels) {
  const motorCenters = ['sacral', 'heart', 'solar', 'root'];

  // Build adjacency map of connected centers
  const connections = new Map();
  channels.forEach(channel => {
    const [c1, c2] = channel.centers;
    if (!connections.has(c1)) connections.set(c1, new Set());
    if (!connections.has(c2)) connections.set(c2, new Set());
    connections.get(c1).add(c2);
    connections.get(c2).add(c1);
  });

  // If throat is not defined, no motor can connect to it
  if (!connections.has('throat')) return false;

  // BFS from throat to find any motor center
  const visited = new Set(['throat']);
  const queue = ['throat'];

  while (queue.length > 0) {
    const current = queue.shift();

    // Check if current center is a motor
    if (motorCenters.includes(current)) {
      return true;
    }

    // Add unvisited neighbors to queue
    const neighbors = connections.get(current) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return false;
}

/**
 * Determine authority based on defined centers
 */
function determineAuthority(definedCenters, hasSacral) {
  if (definedCenters.has('solar')) return 'emotional';
  if (hasSacral) return 'sacral';
  if (definedCenters.has('spleen')) return 'splenic';
  if (definedCenters.has('heart')) return 'ego';
  if (definedCenters.has('g')) return 'self';
  if (definedCenters.size === 0) return 'lunar';
  return 'mental';
}

/**
 * Complete Gene Keys Shadow/Gift/Siddhi spectrum for all 64 keys
 * Source: Gene Keys by Richard Rudd
 */
export const GENE_KEY_SPECTRUM = {
  1: ['Entropy', 'Freshness', 'Beauty'],
  2: ['Dislocation', 'Orientation', 'Unity'],
  3: ['Chaos', 'Innovation', 'Innocence'],
  4: ['Intolerance', 'Understanding', 'Forgiveness'],
  5: ['Impatience', 'Patience', 'Timelessness'],
  6: ['Conflict', 'Diplomacy', 'Peace'],
  7: ['Division', 'Guidance', 'Virtue'],
  8: ['Mediocrity', 'Style', 'Exquisiteness'],
  9: ['Inertia', 'Determination', 'Invincibility'],
  10: ['Self-Obsession', 'Naturalness', 'Being'],
  11: ['Obscurity', 'Idealism', 'Light'],
  12: ['Vanity', 'Discrimination', 'Purity'],
  13: ['Discord', 'Discernment', 'Empathy'],
  14: ['Compromise', 'Competence', 'Bounteousness'],
  15: ['Dullness', 'Magnetism', 'Florescence'],
  16: ['Indifference', 'Versatility', 'Mastery'],
  17: ['Opinion', 'Far-Sightedness', 'Omniscience'],
  18: ['Judgement', 'Integrity', 'Perfection'],
  19: ['Co-Dependence', 'Sensitivity', 'Sacrifice'],
  20: ['Superficiality', 'Self-Assurance', 'Presence'],
  21: ['Control', 'Authority', 'Valour'],
  22: ['Dishonour', 'Graciousness', 'Grace'],
  23: ['Complexity', 'Simplicity', 'Quintessence'],
  24: ['Addiction', 'Invention', 'Silence'],
  25: ['Constriction', 'Acceptance', 'Universal Love'],
  26: ['Pride', 'Artfulness', 'Invisibility'],
  27: ['Selfishness', 'Altruism', 'Selflessness'],
  28: ['Purposelessness', 'Totality', 'Immortality'],
  29: ['Half-Heartedness', 'Commitment', 'Devotion'],
  30: ['Desire', 'Lightness', 'Rapture'],
  31: ['Arrogance', 'Leadership', 'Humility'],
  32: ['Failure', 'Preservation', 'Veneration'],
  33: ['Forgetting', 'Mindfulness', 'Revelation'],
  34: ['Force', 'Strength', 'Majesty'],
  35: ['Hunger', 'Adventure', 'Boundlessness'],
  36: ['Turbulence', 'Humanity', 'Compassion'],
  37: ['Weakness', 'Equality', 'Tenderness'],
  38: ['Struggle', 'Perseverance', 'Honour'],
  39: ['Provocation', 'Dynamism', 'Liberation'],
  40: ['Exhaustion', 'Resolve', 'Divine Will'],
  41: ['Fantasy', 'Anticipation', 'Emanation'],
  42: ['Expectation', 'Detachment', 'Celebration'],
  43: ['Deafness', 'Insight', 'Epiphany'],
  44: ['Interference', 'Teamwork', 'Synarchy'],
  45: ['Dominance', 'Synergy', 'Communion'],
  46: ['Seriousness', 'Delight', 'Ecstasy'],
  47: ['Oppression', 'Transmutation', 'Transfiguration'],
  48: ['Inadequacy', 'Resourcefulness', 'Wisdom'],
  49: ['Reaction', 'Revolution', 'Rebirth'],
  50: ['Corruption', 'Equilibrium', 'Harmony'],
  51: ['Agitation', 'Initiative', 'Awakening'],
  52: ['Stress', 'Restraint', 'Stillness'],
  53: ['Immaturity', 'Expansion', 'Superabundance'],
  54: ['Greed', 'Aspiration', 'Ascension'],
  55: ['Victimisation', 'Freedom', 'Freedom'],
  56: ['Distraction', 'Enrichment', 'Intoxication'],
  57: ['Unease', 'Intuition', 'Clarity'],
  58: ['Dissatisfaction', 'Vitality', 'Bliss'],
  59: ['Dishonesty', 'Intimacy', 'Transparency'],
  60: ['Limitation', 'Realism', 'Justice'],
  61: ['Psychosis', 'Inspiration', 'Sanctity'],
  62: ['Intellect', 'Precision', 'Impeccability'],
  63: ['Doubt', 'Inquiry', 'Truth'],
  64: ['Confusion', 'Imagination', 'Illumination']
};

/**
 * Calculate Gene Keys Hologenetic Profile from Human Design data
 *
 * The Gene Keys profile uses the same planetary positions as Human Design
 * but interprets them through the Shadow/Gift/Siddhi spectrum.
 *
 * Activation Sequence (4 Prime Gifts):
 * - Life's Work: Natal Sun (conscious purpose)
 * - Evolution: Natal Earth (life's challenge)
 * - Radiance: Design Sun (health and wellbeing)
 * - Purpose: Design Earth (hidden gift)
 *
 * Venus Sequence (relationships):
 * - Attraction: Design Moon
 * - IQ: Natal Venus
 * - EQ: Natal Mars
 * - SQ: Design Venus
 *
 * Pearl Sequence (prosperity):
 * - Vocation: Design Mars
 * - Culture: Design Jupiter
 * - Pearl: Natal Jupiter
 *
 * Source: https://genekeys.com/docs/what-planets-does-each-sphere-of-the-golden-path-profile-correlate-to/
 */
export function calculateGeneKeys(humanDesignResult) {
  const { personality, design } = humanDesignResult.gates;

  // Helper to create sphere data (now includes line number)
  const createSphere = (gateData, sphereName) => {
    const gate = gateData?.gate || gateData;
    const line = gateData?.line || null;
    return {
      key: gate,
      line: line,
      keyLine: line ? `${gate}.${line}` : String(gate),
      name: GATES[gate]?.name || `Gate ${gate}`,
      sphere: sphereName,
      shadow: GENE_KEY_SPECTRUM[gate]?.[0] || 'Shadow',
      gift: GENE_KEY_SPECTRUM[gate]?.[1] || 'Gift',
      siddhi: GENE_KEY_SPECTRUM[gate]?.[2] || 'Siddhi',
      spectrum: GENE_KEY_SPECTRUM[gate] || ['Shadow', 'Gift', 'Siddhi']
    };
  };

  // ACTIVATION SEQUENCE - The 4 Prime Gifts
  const activationSequence = {
    lifeWork: createSphere(personality.sun, "Life's Work"),
    evolution: createSphere(personality.earth, "Evolution"),
    radiance: createSphere(design.sun, "Radiance"),
    purpose: createSphere(design.earth, "Purpose")
  };

  // VENUS SEQUENCE - Relationships
  const venusSequence = {
    attraction: createSphere(design.moon, "Attraction"),
    iq: createSphere(personality.venus, "IQ"),
    eq: createSphere(personality.mars, "EQ"),
    sq: createSphere(design.venus, "SQ")
  };

  // PEARL SEQUENCE - Prosperity
  const pearlSequence = {
    vocation: createSphere(design.mars, "Vocation"),
    culture: createSphere(design.jupiter, "Culture"),
    pearl: createSphere(personality.jupiter, "Pearl")
  };

  // Calculate the 3 Pathways of the Activation Sequence
  const pathways = {
    challenge: `${activationSequence.lifeWork.key} → ${activationSequence.evolution.key}`,
    breakthrough: `${activationSequence.evolution.key} → ${activationSequence.radiance.key}`,
    coreStability: `${activationSequence.radiance.key} → ${activationSequence.purpose.key}`
  };

  // Core is the same Gene Key as Vocation (Design Mars) - viewed through Venus Sequence lens
  const core = createSphere(design.mars, "Core");

  // Brand is the same Gene Key as Life's Work (Personality Sun) - viewed through Pearl Sequence lens
  const brand = createSphere(personality.sun, "Brand");

  // All unique Gene Keys in the profile (11 total, but some spheres share keys)
  const allKeys = [
    activationSequence.lifeWork,
    activationSequence.evolution,
    activationSequence.radiance,
    activationSequence.purpose,
    venusSequence.attraction,
    venusSequence.iq,
    venusSequence.eq,
    venusSequence.sq,
    pearlSequence.vocation, // Same as Core
    pearlSequence.culture,
    pearlSequence.pearl
  ];

  return {
    // Activation Sequence (primary)
    ...activationSequence,

    // Full sequences
    activationSequence,
    venusSequence,
    pearlSequence,

    // Shared spheres (same Gene Key, different lens)
    core, // Same as vocation
    brand, // Same as lifeWork

    // Pathways
    pathways,

    // All Gene Keys in profile
    allKeys,

    // Summary
    primeGifts: [
      activationSequence.lifeWork.gift,
      activationSequence.evolution.gift,
      activationSequence.radiance.gift,
      activationSequence.purpose.gift
    ],

    summary: `Life's Work: ${activationSequence.lifeWork.keyLine} (${activationSequence.lifeWork.gift}), ` +
             `Evolution: ${activationSequence.evolution.keyLine} (${activationSequence.evolution.gift}), ` +
             `Radiance: ${activationSequence.radiance.keyLine} (${activationSequence.radiance.gift}), ` +
             `Purpose: ${activationSequence.purpose.keyLine} (${activationSequence.purpose.gift})`,

    note: 'Gene Keys profile calculated from Human Design planetary positions'
  };
}

export { GATES, CHANNELS, CENTERS, TYPES, PROFILES, AUTHORITIES, CIRCUIT_GROUPS, LINE_NAMES, longitudeToGate, longitudeToLine, longitudeToColor, longitudeToTone, longitudeToBase };
export default calculateHumanDesign;
