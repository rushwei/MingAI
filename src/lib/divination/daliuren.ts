import type { DaliurenOutput } from '@mingai/core/daliuren';
import { renderDaliurenCanonicalText } from '@mingai/core/text';

export function generateDaliurenResultText(result: DaliurenOutput): string {
    return renderDaliurenCanonicalText(result);
}
