export type MotionPreset = {
  /** Spring damping ratio in the range [0, 1+] where lower values bounce more. */
  damping: number;
  /** Spring stiffness coefficient where higher values settle faster. */
  stiffness: number;
};

export type EliteThemeContract = {
  surface: {
    background: string;
    foreground: string;
    layer1: string;
    layer2: string;
    contrastOutline: string;
  };
  accent: {
    primary: string;
    secondary: string;
    danger: string;
    positive: string;
  };
  typography: {
    displayScale: number;
    balanceWeightMin: number;
    balanceWeightMax: number;
  };
  motion: {
    sheetOpen: MotionPreset;
    sheetClose: MotionPreset;
    fabMorph: MotionPreset;
  };
};

export const eliteThemeDefaults: EliteThemeContract = {
  surface: {
    background: '#0B0B10',
    foreground: '#FFFFFF',
    layer1: '#15151D',
    layer2: '#1E1E29',
    contrastOutline: '#7A7A90',
  },
  accent: {
    primary: '#9A86FF',
    secondary: '#5FE1F2',
    danger: '#FF5A66',
    positive: '#4ADE80',
  },
  typography: {
    displayScale: 1,
    balanceWeightMin: 350,
    balanceWeightMax: 760,
  },
  motion: {
    sheetOpen: { damping: 0.75, stiffness: 300 },
    sheetClose: { damping: 1, stiffness: 400 },
    fabMorph: { damping: 0.72, stiffness: 340 },
  },
};
