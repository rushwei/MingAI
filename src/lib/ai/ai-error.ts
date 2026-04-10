/**
 * AI 错误提取工具
 *
 * 从 AI SDK 的错误对象中提取用户友好的中文错误提示。
 * 网关（NewAPI/Octopus）返回的错误通过 AI SDK 的 APICallError 自动抛出，
 * 此模块将 statusCode / 错误类型转换为对用户有意义的提示文案。
 */
import 'server-only';

// @ts-expect-error TS Cannot find module 'ai' due to Next.js 15 bundler resolution in CLI tsc
import { APICallError } from 'ai';

/**
 * 从 AI 调用错误中提取用户友好的中文提示。
 *
 * 优先识别 AI SDK 的 APICallError（携带 statusCode 等结构化信息），
 * 其次识别常见的 Error message 模式，最后回退到通用提示。
 */
export function extractAIErrorMessage(error: unknown): string {
    // AI SDK 结构化错误
    if (APICallError.isInstance(error)) {
        const statusCode: number | undefined = (error as { statusCode?: number }).statusCode;
        const responseBody: string | undefined = (error as { responseBody?: string }).responseBody;

        if (statusCode === 429) {
            return '模型请求繁忙，请稍后重试';
        }

        if (statusCode === 403) {
            const body = (responseBody ?? '').toLowerCase();
            if (body.includes('filter') || body.includes('safety') || body.includes('content')) {
                return '内容被安全过滤，请调整问题后重试';
            }
return '模型访问被拒绝，请联系管理员';
        }

        if (statusCode === 401) {
            return '模型认证失败，请联系管理员';
        }

        if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
            return '当前模型暂时不可用，请稍后重试或切换模型';
        }

        if (statusCode != null) {
            return `AI 服务异常（${statusCode}），请稍后重试`;
        }
    }

    // 超时
    if (error instanceof Error) {
if (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
            return '请求超时，请重试';
        }

        if (error.message.includes('API key not configured')) {
            return '模型未配置，请联系管理员';
        }

        if (error.message.includes('Unknown model')) {
            return '请求的模型不存在，请切换模型后重试';
        }

        if (error.message.includes('No AI sources configured') || error.message.includes('No available AI sources')) {
            return '当前模型暂无可用通道，请稍后重试或切换模型';
        }
    }

    return '服务暂时不可用，请稍后重试';
}
