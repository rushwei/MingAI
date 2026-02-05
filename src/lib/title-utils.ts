export function sanitizePlainTitle(input: string): string {
    let title = typeof input === 'string' ? input : '';
    if (!title) return '';

    title = title
        // Remove common Markdown inline markers.
        .replace(/[`*_]/g, '')
        // Remove heading markers.
        .replace(/^\s*#{1,6}\s*/g, '')
        // Remove blockquote markers.
        .replace(/^\s*>\s*/g, '')
        // Remove list markers.
        .replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/g, '')
        // Remove common quotes/brackets.
        .replace(/[「」『』《》〈〉【】“”"']/g, '')
        // Normalize whitespace.
        .replace(/\s+/g, ' ')
        .trim();

    return title;
}

