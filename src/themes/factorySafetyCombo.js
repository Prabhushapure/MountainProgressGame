const PARTNER_LICENSE_URL = 'https://antiz-digital.com/GamifiedLearning/partner/license'
const PLATFORM_PLAY_URL = 'https://antiz-digital.com/GamifiedLearning/play'
const PLAY_COMPLETE_API_URL = 'https://antiz-digital.com/GamifiedLearning/api/play/complete'

const FACTORY_ASSET = (name) => `assets/factory-safety/${name}`

/** @type {import('./index').ComboTheme} */
export const factorySafetyComboTheme = {
  id: 'Factory_safety_combo',
  storagePrefix: 'Factory_safety_comboProgress',
  deployPath: '/Factory_safety_combo/',
  themeClass: 'theme-factory-safety',
  layoutMode: 'safety-basics-path',
  brand: {
    useFireShieldHeader: false,
    pageTitle: 'SAFETY BASICS',
    hudTitle: 'SAFETY BASICS',
    hudSubtitle: 'Factory Safety Training',
    instructionTitleAccent: 'SAFETY',
    instructionTitleRest: 'BASICS',
    instructionTagline: 'Gamified Factory Safety Training for Industry',
  },
  copy: {
    stopLabel: 'Module',
    goalLabel: 'Assessment',
    mapAlt: 'Safety basics learning path',
    passCongrats:
      'You have completed all six modules and passed the Assessment.',
    incompleteNote: 'Complete all six modules to unlock and pass the Assessment.',
    instructionIntro:
      'Complete & PASS all Activities to finish the Safety Basics journey.\nCompleting a module unlocks the next module.\nYou can replay unlocked modules as many times as you wish.\nPass all six modules including the Assessment to complete the combo.\nYou can complete the journey across multiple sittings.',
    instructionActivities: [
      'Module 1: Introduction to Safety Induction',
      'Module 2: Safety Orientation',
      'Module 3: Safety Practices',
      'Module 4: Safety Management System',
      'Module 5: Employee Responsibilities',
      'Module 6: Assessment',
    ],
  },
  assets: {
    map: FACTORY_ASSET('skin-background.png'),
    markerActive: FACTORY_ASSET('station-1-induction.png'),
    markerLocked: FACTORY_ASSET('station-1-induction.png'),
    markerCompleted: FACTORY_ASSET('station-6-assessment.png'),
    goalRed: FACTORY_ASSET('station-6-assessment.png'),
    goalGreen: FACTORY_ASSET('station-6-assessment.png'),
    passIcon: FACTORY_ASSET('station-6-assessment.png'),
    splashVideo: 'assets/video.mp4',
    mascot: FACTORY_ASSET('worker-mascot.png'),
  },
  layout: {
    positions: [
      { top: '84%', left: '15%' },
      { top: '80%', left: '29%' },
      { top: '71%', left: '44%' },
      { top: '57%', left: '60%' },
      { top: '38%', left: '77%' },
      { top: '14%', left: '94%' },
    ],
    goalPosition: { top: '14%', left: '94%' },
    goalFlagOffset: { left: 0, top: 0 },
    mapScale: { x: 1, y: 1, offsetY: 0 },
    firstMarkerLarge: false,
    labelLeftIds: [],
    labelClassById: {},
  },
  levels: [
    {
      id: 1,
      title: 'Module 1',
      activityLabel: 'Introduction to Safety Induction',
      status: 'active',
      icon: FACTORY_ASSET('station-1-induction.png'),
      url: 'https://antiz-digital.com/safety-basics-learn/?video=introduction-to-safety-induction',
      maxPoints: 100,
    },
    {
      id: 2,
      title: 'Module 2',
      activityLabel: 'Safety Orientation',
      status: 'locked',
      icon: FACTORY_ASSET('station-2-orientation.png'),
      url: 'https://antiz-digital.com/safety-basics-learn/?video=safety-orientation',
      maxPoints: 200,
    },
    {
      id: 3,
      title: 'Module 3',
      activityLabel: 'Safety Practices',
      status: 'locked',
      icon: FACTORY_ASSET('station-3-practices.png'),
      url: 'https://antiz-digital.com/safety-basics-learn/?video=safety-practices',
      maxPoints: 200,
    },
    {
      id: 4,
      title: 'Module 4',
      activityLabel: 'Safety Management System',
      status: 'locked',
      icon: FACTORY_ASSET('station-4-management.png'),
      url: 'https://antiz-digital.com/safety-basics-learn/?video=safety-management-system',
      maxPoints: 200,
    },
    {
      id: 5,
      title: 'Module 5',
      activityLabel: 'Employee Responsibilities',
      status: 'locked',
      icon: FACTORY_ASSET('station-5-responsibilities.png'),
      url: 'https://antiz-digital.com/safety-basics-learn/?video=employee-responsibilities',
      maxPoints: 200,
    },
    {
      id: 6,
      title: 'Module 6',
      activityLabel: 'Assessment',
      status: 'locked',
      icon: FACTORY_ASSET('station-6-assessment.png'),
      url: 'https://antiz-digital.com/hazard-hunt/',
      maxPoints: 300,
    },
  ],
  urls: {
    partnerLicense: PARTNER_LICENSE_URL,
    platformPlay: PLATFORM_PLAY_URL,
    playCompleteApi: PLAY_COMPLETE_API_URL,
  },
}
