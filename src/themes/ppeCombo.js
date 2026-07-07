const PARTNER_LICENSE_URL = 'https://antiz-digital.com/GamifiedLearning/partner/license'
const PLATFORM_PLAY_URL = 'https://antiz-digital.com/GamifiedLearning/play'
const PLAY_COMPLETE_API_URL = 'https://antiz-digital.com/GamifiedLearning/api/play/complete'

const FACTORY_ASSET = (name) => `assets/factory-safety/${name}`

/** @type {import('./index').ComboTheme} */
export const ppeComboTheme = {
  id: 'PPE_Combo',
  storagePrefix: 'PPE_ComboProgress',
  deployPath: '/PPE_Combo/',
  themeClass: 'theme-factory-safety',
  layoutMode: 'safety-basics-path',
  brand: {
    useFireShieldHeader: false,
    pageTitle: 'PPE TRAINING',
    hudTitle: 'PPE TRAINING',
    hudSubtitle: 'Personal Protective Equipment',
    instructionTitleAccent: 'PPE',
    instructionTitleRest: 'TRAINING',
    instructionTagline: 'Gamified PPE Training for Industry',
  },
  copy: {
    stopLabel: 'Module',
    goalLabel: 'Assessment',
    mapAlt: 'PPE training path',
    passCongrats: 'You have completed all three modules and passed the Picture Quiz.',
    incompleteNote: 'Complete all three modules to finish the PPE training journey.',
    instructionIntro:
      'Complete & PASS all Activities to finish the PPE training journey.\nCompleting a module unlocks the next module.\nYou can replay unlocked modules as many times as you wish.\nPass all three modules including the Picture Quiz to complete the combo.\nYou can complete the journey across multiple sittings.',
    instructionActivities: [
      'Module 1: Learn Video',
      'Module 2: PPE Usage',
      'Module 3: Picture Quiz',
    ],
  },
  assets: {
    map: FACTORY_ASSET('skin-background.png'),
    iconLock: FACTORY_ASSET('icon-lock.png'),
    iconUnlock: FACTORY_ASSET('icon-unlock.png'),
    markerActive: FACTORY_ASSET('station-4-management.png'),
    markerLocked: FACTORY_ASSET('station-4-management.png'),
    markerCompleted: FACTORY_ASSET('station-6-assessment.png'),
    goalRed: FACTORY_ASSET('station-6-assessment.png'),
    goalGreen: FACTORY_ASSET('station-6-assessment.png'),
    passIcon: FACTORY_ASSET('station-6-assessment.png'),
    splashVideo: FACTORY_ASSET('flash-screen-video.mp4'),
    mascot: FACTORY_ASSET('worker-mascot.png'),
    headerIcon: FACTORY_ASSET('header-hard-hat.png'),
    helpPdf: FACTORY_ASSET('ppe-combo-help.pdf'),
    completedCharacterIcon: FACTORY_ASSET('man-7.png'),
  },
  layout: {
    stepLadder: {
      marginTop: 32,
      marginBottom: 36,
      marginRight: 24,
    },
    goalPosition: { top: '17%', left: '50%' },
    goalFlagOffset: { left: 0, top: 0 },
    mapScale: { x: 1, y: 1, offsetY: 0 },
    firstMarkerLarge: false,
    labelLeftIds: [],
    labelClassById: {},
  },
  scoring: {
    fixedCompletionCampIds: [1, 2],
    fixedCompletionPoints: 100,
  },
  levels: [
    {
      id: 1,
      title: 'Module 1',
      activityLabel: 'Learn Video',
      status: 'active',
      stepBackground: FACTORY_ASSET('step-4-factory-floor-background.png'),
      characterIcon: FACTORY_ASSET('man-4.png'),
      icon: FACTORY_ASSET('station-4-management.png'),
      url: 'https://antiz-digital.com/PPE_learn/?video=PPE_learn',
      maxPoints: 100,
    },
    {
      id: 2,
      title: 'Module 2',
      activityLabel: 'PPE Usage',
      status: 'locked',
      stepBackground: FACTORY_ASSET('step-5-assembly-line-background.png'),
      characterIcon: FACTORY_ASSET('man-5.png'),
      icon: FACTORY_ASSET('station-5-responsibilities.png'),
      url: 'https://antiz-digital.com/PPE-drag-drop/',
      maxPoints: 100,
    },
    {
      id: 3,
      title: 'Module 3',
      activityLabel: 'Picture Quiz',
      status: 'locked',
      characterIcon: FACTORY_ASSET('man-6.png'),
      icon: FACTORY_ASSET('station-6-assessment.png'),
      url: 'https://antiz-digital.com/hazard-hunt/?topic=ppe_safety',
      maxPoints: 200,
    },
  ],
  urls: {
    partnerLicense: PARTNER_LICENSE_URL,
    platformPlay: PLATFORM_PLAY_URL,
    playCompleteApi: PLAY_COMPLETE_API_URL,
  },
}
