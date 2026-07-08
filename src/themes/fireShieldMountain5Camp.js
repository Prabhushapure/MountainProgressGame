const PARTNER_LICENSE_URL = 'https://antiz-digital.com/GamifiedLearning/partner/license'
const PLATFORM_PLAY_URL = 'https://antiz-digital.com/GamifiedLearning/play'
const PLAY_COMPLETE_API_URL = 'https://antiz-digital.com/GamifiedLearning/api/play/complete'

/** @type {import('./index').ComboTheme} */
export const fireShieldMountain5CampTheme = {
  id: 'fire-shield-combo-5',
  storagePrefix: 'mountainProgress5',
  deployPath: '/fire-shield-combo-5/',
  themeClass: 'theme-fire-shield theme-fire-shield-5',
  layoutMode: 'mountain-map',
  brand: {
    useFireShieldHeader: true,
    hudTitle: 'FIRE SHIELD 360',
    hudSubtitle: 'Fire Safety & Immediate Response',
    instructionTitleAccent: 'FIRE',
    instructionTitleRest: 'SHIELD 360',
    instructionTagline: 'Gamified Fire Safety Training for Corporates & Industry',
  },
  copy: {
    stopLabel: 'Camp',
    goalLabel: 'Summit',
    mapAlt: 'Mountain route',
    passCongrats:
      'You have completed all activities at the five Camps and have reached the Summit.',
    incompleteNote: 'Complete all activities at the five Camps to reach the Summit.',
    instructionIntro:
      'Complete & PASS all Activities to reach the Summit.\nCompleting the Activity at a Camp will unlock the next Camp.\nPlay Activities as many times as you wish at unlocked Camps.\nYou will reach the Summit on Passing Activities at all five Camps.\nYou can complete the journey across multiple sittings.',
    instructionActivities: [
      'Camp 1: Fire Safety Video.',
      'Camp 2: Fire Hazard Identification.',
      'Camp 3: Fire Extinguisher Usage.',
      'Camp 4: Emergency Evacuation',
      'Camp 5: Fire Safety MCQ Quiz',
    ],
  },
  assets: {
    map: 'assets/mountain.png',
    markerActive: 'assets/tent-yellow.png',
    markerLocked: 'assets/tent-red.png',
    markerCompleted: 'assets/tent-green.png',
    goalRed: 'assets/summit-flag-red.png',
    goalGreen: 'assets/summit-flag-green.png',
    passIcon: 'assets/result-pass.png',
    splashVideo: 'assets/flash-screen-final-2.mp4',
    helpPdf: 'assets/fireshield-5c-help.pdf',
  },
  layout: {
    positions: [
      { top: '97%', left: '40%' },
      { top: '83%', left: '48%' },
      { top: '70%', left: '55%' },
      { top: '50%', left: '58%' },
      { top: '30%', left: '62%' },
    ],
    goalPosition: { top: '8%', left: '70%' },
    goalFlagOffset: { left: -7, top: -1.6 },
    mapScale: { x: 0.95, y: 0.9, offsetY: 2 },
    firstMarkerLarge: true,
    labelLeftIds: [3, 5],
    labelClassById: {
      1: 'camp-label-camp-1',
      2: 'camp-label-camp-2',
      4: 'camp-label-camp-3',
      5: 'camp-label-camp-4',
    },
  },
  levels: [
    {
      id: 1,
      title: 'Camp 1',
      activityLabel: 'Fire Safety Video',
      status: 'active',
      url: 'https://antiz-digital.com/fire-safety-learn/',
      maxPoints: 100,
    },
    {
      id: 2,
      title: 'Camp 2',
      activityLabel: 'Fire Hazard Identification',
      status: 'locked',
      url: 'https://antiz-digital.com/hazard-hunt/?topic=Fire%20Safety%20Office%20Scenario',
      maxPoints: 200,
    },
    {
      id: 3,
      title: 'Camp 3',
      activityLabel: 'Fire Extinguisher Usage',
      status: 'locked',
      url: 'https://antiz-digital.com/fire-shield/',
      maxPoints: 500,
    },
    {
      id: 4,
      title: 'Camp 4',
      activityLabel: 'Emergency\nEvacuation',
      status: 'locked',
      url: 'https://antiz-digital.com/building-evacuation/',
      maxPoints: 740,
    },
    {
      id: 5,
      title: 'Camp 5',
      activityLabel: 'Fire Safety\nMCQ Quiz',
      status: 'locked',
      url: 'https://antiz-digital.com/snake/?topic=Fire%20Safety',
      maxPoints: 440,
    },
  ],
  urls: {
    partnerLicense: PARTNER_LICENSE_URL,
    platformPlay: PLATFORM_PLAY_URL,
    playCompleteApi: PLAY_COMPLETE_API_URL,
  },
}
