import type { ToolListPayload, ToolResponseFormat } from '@mingai/core/mcp';

const AMAP_GEOCODE_ENDPOINT = 'https://restapi.amap.com/v3/geocode/geo';
const PLACE_RESOLUTION_TOOLS = new Set([
  'bazi_calculate',
  'ziwei_calculate',
  'ziwei_horoscope',
  'ziwei_flying_star',
]);

export type RuntimePlaceResolutionFallbackReason =
  | 'no_birth_place'
  | 'geocoder_disabled'
  | 'geocode_failed'
  | 'precision_too_low'
  | 'invalid_location';

export type RuntimePlaceResolutionInfo = {
  requestedPlace?: string;
  resolved: boolean;
  provider?: 'amap';
  level?: string;
  formattedAddress?: string;
  adcode?: string;
  usedLongitude?: number;
  source: 'manual_longitude' | 'birth_place' | 'fallback';
  fallbackReason?: RuntimePlaceResolutionFallbackReason;
  trueSolarTimeApplied: boolean;
};

type PreparedToolArgs = {
  toolArgs: unknown;
  placeResolutionInfo?: RuntimePlaceResolutionInfo;
};

type AmapGeocodeRecord = {
  formatted_address?: string;
  location?: string;
  adcode?: string;
  level?: string;
};

type AmapGeocodeResponse = {
  status?: string;
  info?: string;
  geocodes?: AmapGeocodeRecord[];
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isPlaceResolutionTool(toolName: string): boolean {
  return PLACE_RESOLUTION_TOOLS.has(toolName);
}

function parseLongitude(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= -180 && value <= 180 ? value : undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= -180 && parsed <= 180 ? parsed : undefined;
}

function isAmapPrecisionSufficient(level?: string): boolean {
  const normalized = level?.trim().toLowerCase();
  if (!normalized) return false;

  const insufficientLevels = new Set([
    'province',
    '省',
    '自治区',
    '特别行政区',
    '国家',
  ]);

  return !insufficientLevels.has(normalized);
}

function buildFallbackInfo(
  requestedPlace: string | undefined,
  reason: RuntimePlaceResolutionFallbackReason,
): RuntimePlaceResolutionInfo {
  return {
    requestedPlace,
    resolved: false,
    source: 'fallback',
    fallbackReason: reason,
    trueSolarTimeApplied: false,
  };
}

function parseCoordinate(location?: string): { longitude: number; latitude: number } | null {
  if (!location) return null;
  const [longitudeRaw, latitudeRaw] = location.split(',');
  const longitude = Number(longitudeRaw);
  const latitude = Number(latitudeRaw);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }
  return { longitude, latitude };
}

async function geocodeBirthPlace(place: string): Promise<RuntimePlaceResolutionInfo> {
  const key = process.env.AMAP_WEB_SERVICE_KEY?.trim();
  if (!key) {
    return buildFallbackInfo(place, 'geocoder_disabled');
  }

  try {
    const params = new URLSearchParams({
      key,
      address: place.trim(),
    });
    const response = await fetch(`${AMAP_GEOCODE_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      return buildFallbackInfo(place, 'geocode_failed');
    }

    const payload = await response.json() as AmapGeocodeResponse;
    if (payload.status !== '1') {
      return buildFallbackInfo(place, 'geocode_failed');
    }

    const geocode = payload.geocodes?.[0];
    if (!geocode) {
      return buildFallbackInfo(place, 'geocode_failed');
    }

    const coordinate = parseCoordinate(geocode.location);
    if (!coordinate) {
      return buildFallbackInfo(place, 'invalid_location');
    }

    if (!isAmapPrecisionSufficient(geocode.level)) {
      return {
        ...buildFallbackInfo(place, 'precision_too_low'),
        provider: 'amap',
        level: geocode.level,
        formattedAddress: geocode.formatted_address,
        adcode: geocode.adcode,
      };
    }

    return {
      requestedPlace: place,
      resolved: true,
      provider: 'amap',
      level: geocode.level,
      formattedAddress: geocode.formatted_address,
      adcode: geocode.adcode,
      usedLongitude: coordinate.longitude,
      source: 'birth_place',
      trueSolarTimeApplied: true,
    };
  } catch {
    return buildFallbackInfo(place, 'geocode_failed');
  }
}

function describeFallbackReason(reason?: RuntimePlaceResolutionFallbackReason): string {
  switch (reason) {
    case 'no_birth_place':
      return '未提供出生地点，未启用真太阳时';
    case 'geocoder_disabled':
      return '未配置高德地理编码，未启用真太阳时';
    case 'geocode_failed':
      return '出生地点解析失败，未启用真太阳时';
    case 'precision_too_low':
      return '出生地点精度不足，未启用真太阳时';
    case 'invalid_location':
      return '出生地点坐标无效，未启用真太阳时';
    default:
      return '未启用真太阳时';
  }
}

function withDescriptionSuffix(text: string | undefined, suffix: string): string {
  return text ? `${text} ${suffix}` : suffix;
}

function appendPlaceResolutionNote(markdown: string, info: RuntimePlaceResolutionInfo): string {
  const lines = ['## 出生地解析'];

  if (info.requestedPlace) {
    lines.push(`- **输入地点**: ${info.requestedPlace}`);
  }

  if (info.source === 'manual_longitude') {
    lines.push(`- **使用方式**: 显式经度优先（${info.usedLongitude}°）`);
    lines.push('- **真太阳时**: 已启用');
  } else if (info.resolved) {
    lines.push(`- **解析结果**: ${info.formattedAddress || info.requestedPlace || '-'}`);
    if (info.level) lines.push(`- **解析级别**: ${info.level}`);
    if (info.usedLongitude != null) lines.push(`- **使用经度**: ${info.usedLongitude}°`);
    lines.push('- **真太阳时**: 已启用');
  } else {
    lines.push(`- **解析状态**: ${describeFallbackReason(info.fallbackReason)}`);
    if (info.formattedAddress) {
      lines.push(`- **最近结果**: ${info.formattedAddress}`);
    }
  }

  return `${markdown}\n\n${lines.join('\n')}`;
}

export async function preprocessToolArgsForRuntimePlace(
  toolName: string,
  args: unknown,
): Promise<PreparedToolArgs> {
  if (!isPlainRecord(args)) {
    return { toolArgs: args };
  }

  const baseArgs = { ...args };
  if (!isPlaceResolutionTool(toolName)) {
    return { toolArgs: baseArgs };
  }

  const manualLongitude = parseLongitude(baseArgs.longitude);
  const requestedPlace = typeof baseArgs.birthPlace === 'string' && baseArgs.birthPlace.trim()
    ? baseArgs.birthPlace.trim()
    : undefined;

  if (manualLongitude != null) {
    return {
      toolArgs: baseArgs,
      placeResolutionInfo: {
        requestedPlace,
        resolved: true,
        usedLongitude: manualLongitude,
        source: 'manual_longitude',
        trueSolarTimeApplied: true,
      },
    };
  }

  if (!requestedPlace) {
    return {
      toolArgs: baseArgs,
      placeResolutionInfo: buildFallbackInfo(undefined, 'no_birth_place'),
    };
  }

  const placeResolutionInfo = await geocodeBirthPlace(requestedPlace);
  if (placeResolutionInfo.resolved && placeResolutionInfo.usedLongitude != null) {
    return {
      toolArgs: {
        ...baseArgs,
        longitude: placeResolutionInfo.usedLongitude,
      },
      placeResolutionInfo,
    };
  }

  return {
    toolArgs: baseArgs,
    placeResolutionInfo,
  };
}

export function decorateToolListPayloadForRuntime(payload: ToolListPayload): ToolListPayload {
  return {
    ...payload,
    tools: payload.tools.map((tool) => {
      if (!isPlaceResolutionTool(tool.name)) {
        return tool;
      }

      const inputProperties = { ...tool.inputSchema.properties };
      const outputProperties = { ...tool.outputSchema.properties };

      inputProperties.birthPlace = {
        type: 'string',
        description: '出生地点（可选。在线 MCP Server 会尝试通过高德把地点名解析为经度；解析失败时自动退化为不采用真太阳时）',
      };

      if (inputProperties.longitude && typeof inputProperties.longitude === 'object' && inputProperties.longitude !== null) {
        inputProperties.longitude = {
          ...inputProperties.longitude,
          description: withDescriptionSuffix(
            String((inputProperties.longitude as { description?: string }).description || ''),
            '若同时提供 longitude 和 birthPlace，优先使用 longitude；若只有地点名，在线 MCP Server 会先做地理编码。',
          ),
        };
      }

      outputProperties.placeResolutionInfo = {
        type: 'object',
        description: '出生地点解析与真太阳时启用信息（在线 MCP Server 运行时附加；core 纯算法本身不联网）',
        properties: {
          requestedPlace: { type: 'string', description: '原始地点输入' },
          resolved: { type: 'boolean', description: '是否解析成功' },
          provider: { type: 'string', description: '解析服务提供方' },
          level: { type: 'string', description: '解析级别，如 市 / 区县 / 省' },
          formattedAddress: { type: 'string', description: '高德返回的标准化地点文本' },
          adcode: { type: 'string', description: '行政区编码' },
          usedLongitude: { type: 'number', description: '本次实际用于真太阳时的经度' },
          source: { type: 'string', description: '经度来源：manual_longitude / birth_place / fallback' },
          fallbackReason: { type: 'string', description: '退化原因：no_birth_place / geocoder_disabled / geocode_failed / precision_too_low / invalid_location' },
          trueSolarTimeApplied: { type: 'boolean', description: '本次是否启用了真太阳时' },
        },
      };

      return {
        ...tool,
        description: withDescriptionSuffix(
          tool.description,
          '在线 MCP Server 支持仅传 birthPlace；若未显式提供 longitude，会尝试做地理编码并在失败时自动退化。',
        ),
        inputSchema: { ...tool.inputSchema, properties: inputProperties },
        outputSchema: { ...tool.outputSchema, properties: outputProperties },
      };
    }),
  };
}

export function attachPlaceResolutionInfoToResult(
  result: unknown,
  placeResolutionInfo?: RuntimePlaceResolutionInfo,
): unknown {
  if (!placeResolutionInfo || !isPlainRecord(result)) {
    return result;
  }
  return {
    ...result,
    placeResolutionInfo,
  };
}

export function attachPlaceResolutionNoteToPayload(
  payload: Record<string, unknown>,
  placeResolutionInfo: RuntimePlaceResolutionInfo | undefined,
  responseFormat: ToolResponseFormat,
): Record<string, unknown> {
  if (!placeResolutionInfo || responseFormat !== 'markdown') {
    return payload;
  }

  const content = payload.content;
  if (!Array.isArray(content) || content.length === 0) {
    return payload;
  }

  const first = content[0];
  if (!first || typeof first !== 'object' || (first as { type?: unknown }).type !== 'text') {
    return payload;
  }

  const text = String((first as { text?: unknown }).text || '');
  const nextContent = [...content];
  nextContent[0] = {
    ...(first as Record<string, unknown>),
    text: appendPlaceResolutionNote(text, placeResolutionInfo),
  };

  return {
    ...payload,
    content: nextContent,
  };
}
