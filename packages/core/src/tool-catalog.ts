import { baziDayunManifest } from './domains/bazi-dayun/manifest.js';
import { baziPillarsResolveManifest } from './domains/bazi-pillars-resolve/manifest.js';
import { baziManifest } from './domains/bazi/manifest.js';
import { daliurenManifest } from './domains/daliuren/manifest.js';
import { almanacManifest } from './domains/fortune/manifest.js';
import { liuyaoManifest } from './domains/liuyao/manifest.js';
import { meihuaManifest } from './domains/meihua/manifest.js';
import { qimenManifest } from './domains/qimen/manifest.js';
import { tarotManifest } from './domains/tarot/manifest.js';
import { ziweiFlyingStarManifest } from './domains/ziwei-flying-star/manifest.js';
import { ziweiHoroscopeManifest } from './domains/ziwei-horoscope/manifest.js';
import { ziweiManifest } from './domains/ziwei/manifest.js';
import type { ToolContract } from './tool-contract.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toolCatalog: ToolContract<any, any>[] = [
  baziManifest,
  baziPillarsResolveManifest,
  ziweiManifest,
  ziweiHoroscopeManifest,
  ziweiFlyingStarManifest,
  liuyaoManifest,
  meihuaManifest,
  tarotManifest,
  almanacManifest,
  baziDayunManifest,
  qimenManifest,
  daliurenManifest,
];
