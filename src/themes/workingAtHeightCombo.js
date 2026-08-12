const PARTNER_LICENSE_URL = 'https://antiz-digital.com/GamifiedLearning/partner/license'
const PLATFORM_PLAY_URL = 'https://antiz-digital.com/GamifiedLearning/play'
const PLAY_COMPLETE_API_URL = 'https://antiz-digital.com/GamifiedLearning/api/play/complete'

const FACTORY_ASSET = (name) => `assets/factory-safety/${name}`
const HEIGHT_ASSET = (name) => `assets/working-at-height/${name}`

/** @type {import('./index').ComboTheme} */
export const workingAtHeightComboTheme = {
  id: 'working_at_height_combo',
  storagePrefix: 'working_at_height_comboProgress',
  deployPath: '/working_at_height_combo/',
  themeClass: 'theme-working-at-height-combo',
  layoutMode: 'chemical-safety-path',
  brand: {
    useFireShieldHeader: false,
    pageTitle: 'WORKING AT HEIGHT',
    hudTitle: 'WORKING AT HEIGHT',
    hudSubtitle: 'Working at Height Training',
    instructionTitleAccent: 'WORKING AT',
    instructionTitleRest: 'HEIGHT',
    instructionTagline: 'Gamified Safety Training for Working at Height',
  },
  copy: {
    stopLabel: 'Module',
    goalLabel: 'Assessment',
    mapAlt: 'Working at height learning path',
    passCongrats:
      'You have completed all four modules and earned your Working at Height certificate.',
    incompleteNote: 'Complete all four modules to finish the Working at Height journey.',
    instructionIntro:
      'Complete & PASS all Activities to finish the Working at Height journey.\nCompleting a module unlocks the next module.\nYou can replay unlocked modules as many times as you wish.\nPass all four modules to complete the combo.\nYou can complete the journey across multiple sittings.',
    instructionActivities: [
      'Module 1: Safety Guideline Video',
      'Module 2: Picture Quiz',
      'Module 3: PPE Requirement',
      'Module 4: Hazard Identification & Corrective Action',
    ],
    documentPillLabel: 'Safety Guideline Document',
  },
  assets: {
    map: HEIGHT_ASSET('working-at-height-skin.png'),
    iconLock: FACTORY_ASSET('icon-lock.png'),
    iconUnlock: FACTORY_ASSET('icon-unlock.png'),
    markerActive: FACTORY_ASSET('station-4-management.png'),
    markerLocked: FACTORY_ASSET('station-4-management.png'),
    markerCompleted: FACTORY_ASSET('station-6-assessment.png'),
    goalRed: FACTORY_ASSET('station-6-assessment.png'),
    goalGreen: FACTORY_ASSET('station-6-assessment.png'),
    passIcon: 'assets/result-pass.png',
    splashVideo: HEIGHT_ASSET('working-at-height-splash.mp4'),
    mascot: FACTORY_ASSET('worker-mascot.png'),
    headerIcon: HEIGHT_ASSET('working-at-height-icon.png'),
    favicon: HEIGHT_ASSET('working-at-height-icon.png'),
    helpPdf: HEIGHT_ASSET('working-at-height-guideline.pdf'),
  },
  layout: {
    goalPosition: { top: '17%', left: '50%' },
    goalFlagOffset: { left: 0, top: 0 },
    mapScale: { x: 1, y: 1, offsetY: 0 },
    firstMarkerLarge: false,
    labelLeftIds: [],
    labelClassById: {},
  },
  scoring: {
    fixedCompletionCampIds: [1],
    fixedCompletionPoints: 100,
  },
  levels: [
    {
      id: 1,
      title: 'Module 1',
      activityLabel: 'Safety Guideline Video',
      status: 'active',
      chevronColor: '#1E88B8',
      url: 'https://antiz-digital.com/safety_learn/?video=workingatheight',
      maxPoints: 100,
    },
    {
      id: 2,
      title: 'Module 2',
      activityLabel: 'Picture Quiz',
      status: 'locked',
      chevronColor: '#FF8A3D',
      url: 'https://antiz-digital.com/hazard-hunt/?topic=working-at-height',
      maxPoints: 100,
    },
    {
      id: 3,
      title: 'Module 3',
      activityLabel: 'PPE Requirement',
      status: 'locked',
      chevronColor: '#29B6F6',
      url: 'https://antiz-digital.com/ppe_scenario/?topic=working-at-height',
      maxPoints: 100,
    },
    {
      id: 4,
      title: 'Module 4',
      activityLabel: 'Hazard Identification &\nCorrective Action',
      status: 'locked',
      chevronColor: '#CE43C8',
      url: 'https://antiz-digital.com/video-hazard/?topic=working-at-height',
      maxPoints: 200,
    },
  ],
  urls: {
    partnerLicense: PARTNER_LICENSE_URL,
    platformPlay: PLATFORM_PLAY_URL,
    playCompleteApi: PLAY_COMPLETE_API_URL,
  },
}
