// src/constants.js
// ─────────────────────────────────────────────────────────
// All dropdown values live here. Edit freely.
// ─────────────────────────────────────────────────────────

export const PROGRAMMES = ['PE', 'PG', 'CH', 'NG', 'RP', 'Other'];

export const LEVELS = ['100', '200', '300', '400'];

export const HOSTELS = [
  'GOLDBELT', 'KIVIZ EXECUTIVE', 'KT HALL',
  'CHAMBER OF MINES HALL', 'GOLD REFINERY HALL', 'HILDA',
  'SME', 'OAK','GREEN AND WHITE','R&M', 'CAMP CITY',
  'OSBORN','THE POINT','AGNES MINKAH','PLATINUM','CRYSTAL','GRACE STAR','HEAVENS GATE','HOLY STANDARD','PC','KABIZ','OT', 'Off Campus', 'Other',
];

export const SUPPORT_LEVELS = ['Strong', 'Leaning', 'Neutral'];

export const CONTACT_STATUSES = [
  'Not Contacted',
  'Contacted',
  'Responded',
  'Volunteer',
  'Not Interested',
];

export const CHARACTER_TAGS = ['Influential', 'Interested', 'Rep', 'Calm'];

// ── Motivational targets shown on Member Home ──────────────
export const MEMBER_TARGETS = {
  contacts:   50,   // total contacts goal
  strong:     15,   // strong supporters goal
  volunteers:  5,   // volunteers goal
};

// ── Colour maps ────────────────────────────────────────────
export const STATUS_BADGE = {
  'Not Contacted': 'gray',
  'Contacted':     'blue',
  'Responded':     'purple',
  'Volunteer':     'green',
  'Not Interested':'red',
};

export const SUPPORT_BADGE = {
  'Strong':  'green',
  'Leaning': 'gold',
  'Neutral': 'gray',
};

export const CHART_COLOURS = [
  '#F0A500', '#00D084', '#3B82F6',
  '#8B5CF6', '#FF4D6D', '#06B6D4',
];