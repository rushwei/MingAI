import{
  obj,
  str,
  num,
  type OutputSchema,
} from '../../schema-builders.js';

export const xiaoliurenOutputSchema: OutputSchema = obj({
  monthStatus: str('月上起的状态'),
  dayStatus: str('日上起的状态'),
  hourStatus: str('时上起的最终状态'),
  result: obj({
    name: str('最终状态名称'),
    element: str('五行'),
    direction: str('方位'),
    nature: str('吉凶性质'),
    description: str('释义'),
    poem: str('诗诀'),
  }),
  input: obj({
    lunarMonth: num('农历月'),
    lunarDay: num('农历日'),
    hour: num('时辰序号'),
    shichen: str('时辰名称'),
  }),
  question: str('占问事项'),
});
