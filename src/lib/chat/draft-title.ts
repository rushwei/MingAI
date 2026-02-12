export function buildDraftTitle(text: string): string {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '新对话';
    return normalized.slice(0, 15);
}

