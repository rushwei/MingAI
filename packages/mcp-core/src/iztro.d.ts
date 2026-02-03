declare module 'iztro' {
  export interface Star {
    name: string;
    brightness?: string;
    mutagen?: string;
  }

  export interface Decadal {
    range?: [number, number];
    heavenlyStem?: string;
    earthlyBranch?: string;
  }

  export interface Palace {
    name: string;
    heavenlyStem: string;
    earthlyBranch: string;
    isBodyPalace: boolean;
    majorStars: Star[];
    minorStars: Star[];
    adjectiveStars?: Star[];
    adjStars?: Star[];
    decadal?: Decadal;
  }

  export interface Astrolabe {
    palaces: Palace[];
    chineseDate?: string;
    solarDate?: string;
    lunarDate?: string;
    sign?: string;
    zodiac?: string;
    earthlyBranchOfSoulPalace?: string;
    earthlyBranchOfBodyPalace?: string;
    soul?: string;
    body?: string;
    fiveElementsClass?: string;
  }

  export const astro: {
    bySolar(
      dateStr: string,
      timeIndex: number,
      gender: string,
      fixLeap?: boolean,
      language?: string
    ): Astrolabe;
    byLunar(
      dateStr: string,
      timeIndex: number,
      gender: string,
      isLeapMonth?: boolean,
      fixLeap?: boolean,
      language?: string
    ): Astrolabe;
  };
}
