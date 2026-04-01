import 'server-only';

import { getSystemAdminClient } from '@/lib/api-utils';
import {
  resolveChartTextDetailLevel,
  type ChartTextDetailLevel,
  type ChartTextDetailTool,
} from '@/lib/divination/detail-level';

export async function loadResolvedChartPromptDetailLevel(
  userId: string,
  tool: ChartTextDetailTool,
): Promise<ChartTextDetailLevel> {
  try {
    const client = getSystemAdminClient();
    const { data } = await client
      .from('user_settings')
      .select('chart_prompt_detail_level')
      .eq('user_id', userId)
      .maybeSingle();
    const saved = data?.chart_prompt_detail_level === 'full'
      ? 'full'
      : data?.chart_prompt_detail_level === 'more'
        ? 'more'
        : 'default';
    return resolveChartTextDetailLevel(tool, saved);
  } catch {
    return resolveChartTextDetailLevel(tool, 'default');
  }
}
