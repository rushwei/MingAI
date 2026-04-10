import type { XiaoliurenOutput } from './types.js';

export interface XiaoliurenCanonicalJSON {
  monthStatus: string;
  dayStatus: string;
  hourStatus: string;
  result: {
    name: string;
    element: string;
    direction: string;
    nature: string;
    description: string;
    poem: string;
  };
  input: {
    lunarMonth: number;
    lunarDay: number;
    hour: number;
    shichen: string;
  };
  question?: string;
}

export function toXiaoliurenJson(output: XiaoliurenOutput): XiaoliurenCanonicalJSON {
  return {
    monthStatus: output.monthStatus,
    dayStatus: output.dayStatus,
    hourStatus: output.hourStatus,
    result: {
      name: output.result.name,
      element: output.result.element,
      direction: output.result.direction,
      nature: output.result.nature,
      description: output.result.description,
      poem: output.result.poem,
    },
    input: { ...output.input },
    question: output.question,
  };
}
