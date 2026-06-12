const PARTNER_LICENSE_URL = 'https://antiz-digital.com/GamifiedLearning/partner/license'
const PLATFORM_PLAY_URL = 'https://antiz-digital.com/GamifiedLearning/play'
const PLAY_COMPLETE_API_URL = 'https://antiz-digital.com/GamifiedLearning/api/play/complete'

/** @type {import('./index').ComboTheme} */
export const fireShieldMountainTheme = {
  id: 'fire-shield-combo',
  storagePrefix: 'mountainProgress',
  deployPath: '/fire-shield-combo/',
  themeClass: 'theme-fire-shield',
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
      'Camp 1: Learn about Fire Safety and the correct responses.',
      'Camp 2: Fire Picture Quiz',
      'Camp 3: Answer a Quiz on Fire Safety',
      'Camp 4: Learn to use the right Extinguisher for different Classes of Fire',
      'Camp 5: Learn the right procedure for Emergency Building Evacuation',
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
    splashVideo: 'assets/video.mp4',
  },
  layout: {
    positions: [
      { top: '95%', left: '20%' },
      { top: '97%', left: '42%' },
      { top: '80%', left: '50%' },
      { top: '59%', left: '54%' },
      { top: '35%', left: '59%' },
    ],
    goalPosition: { top: '8%', left: '70%' },
    goalFlagOffset: { left: -6.6, top: -3.8 },
    mapScale: { x: 0.95, y: 0.9, offsetY: 2 },
    firstMarkerLarge: true,
    labelLeftIds: [3, 5],
    labelClassById: {
      1: 'camp-label-camp-1',
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
      activityLabel: 'Fire Picture Quiz',
      status: 'locked',
      url: 'https://antiz-digital.com/hazard-hunt/?topic=Fire%20Safety%20Office%20Scenario',
      maxPoints: 200,
    },
    {
      id: 3,
      title: 'Camp 3',
      activityLabel: 'Fire Safety Quiz',
      status: 'locked',
      url: 'https://antiz-digital.com/snake/?topic=Fire%20Safety',
      maxPoints: 440,
    },
    {
      id: 4,
      title: 'Camp 4',
      activityLabel: 'Fire Extinguisher\nTraining',
      status: 'locked',
      url: 'https://antiz-digital.com/fire-shield/',
      maxPoints: 500,
    },
    {
      id: 5,
      title: 'Camp 5',
      activityLabel: 'Emergency Evacuation\nTraining',
      status: 'locked',
      url: 'https://antiz-digital.com/building-evacuation/',
      maxPoints: 740,
    },
  ],
  urls: {
    partnerLicense: PARTNER_LICENSE_URL,
    platformPlay: PLATFORM_PLAY_URL,
    playCompleteApi: PLAY_COMPLETE_API_URL,
  },
}
