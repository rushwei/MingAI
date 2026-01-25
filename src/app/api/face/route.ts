/**
 * 面相分析 API 路由
 * 
 * 提供面相图片分析、历史记录等功能
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/api-utils';
import { useCredit, hasCredits, addCredits } from '@/lib/credits';
import { DEFAULT_VISION_MODEL_ID } from '@/lib/ai-config';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import { resolveModelAccess } from '@/lib/ai-access';
import { getProvider } from '@/lib/ai-providers';
import type { VisionProviderOptions } from '@/lib/ai-providers';
import {
    FACE_ANALYSIS_TYPES,
    buildFaceSystemPrompt,
    buildFaceUserPrompt,
    generateFaceTitle,
    FACE_DISCLAIMER
} from '@/lib/face';
import { requireBearerUser } from '@/lib/api-utils';

// 请求类型
interface FaceRequest {
    action: 'analyze' | 'list-types' | 'disclaimer';
    imageBase64?: string;        // Base64 图片数据（不含前缀）
    imageMimeType?: string;      // 图片 MIME 类型
    analysisType?: string;       // 分析类型
    question?: string;           // 用户问题
    modelId?: string;
    reasoning?: boolean;
}

// 响应类型
interface FaceResponse {
    success: boolean;
    data?: {
        types?: typeof FACE_ANALYSIS_TYPES;
        disclaimer?: string;
        analysis?: string;
        reasoning?: string;
        readingId?: string | null;
        conversationId?: string | null;
    };
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<FaceResponse>> {
    try {
        const body: FaceRequest = await request.json();
        const {
            action,
            imageBase64,
            imageMimeType = 'image/jpeg',
            analysisType = 'full',
            question,
            modelId,
            reasoning
        } = body;

        switch (action) {
            // 获取分析类型列表
            case 'list-types':
                return NextResponse.json({
                    success: true,
                    data: { types: FACE_ANALYSIS_TYPES }
                });

            // 获取免责声明
            case 'disclaimer':
                return NextResponse.json({
                    success: true,
                    data: { disclaimer: FACE_DISCLAIMER }
                });

            // AI 分析面相
            case 'analyze': {
                if (!imageBase64) {
                    return NextResponse.json({
                        success: false,
                        error: '请上传面部照片'
                    }, { status: 400 });
                }

                // 检查用户认证
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return NextResponse.json({
                        success: false,
                        error: authResult.error.message
                    }, { status: authResult.error.status });
                }
                const { user } = authResult;

                // 检查用户积分
                const hasEnoughCredits = await hasCredits(user.id);
                if (!hasEnoughCredits) {
                    return NextResponse.json({
                        success: false,
                        error: '积分不足，请充值后使用'
                    }, { status: 403 });
                }

                // 检查模型权限
                const membershipType = await getEffectiveMembershipType(user.id);
                const access = resolveModelAccess(modelId, DEFAULT_VISION_MODEL_ID, membershipType, reasoning, {
                    requireVision: true,
                    membershipDeniedMessage: '面相分析需要 Plus 会员或以上'
                });
                if ('error' in access) {
                    return NextResponse.json({
                        success: false,
                        error: access.error
                    }, { status: access.status });
                }
                const { modelId: requestedModelId, modelConfig, reasoningEnabled } = access;

                // 构建提示词
                const systemPrompt = buildFaceSystemPrompt(analysisType);
                const userPrompt = buildFaceUserPrompt(analysisType, question);

                const remainingCredits = await useCredit(user.id);
                if (remainingCredits === null) {
                    console.error('[face] 扣除积分失败');
                    return NextResponse.json({
                        success: false,
                        error: '积分扣减失败，请稍后重试'
                    }, { status: 500 });
                }

                try {
                    const provider = getProvider(modelConfig);
                    const visionOptions: VisionProviderOptions = {
                        reasoning: reasoningEnabled,
                        temperature: 0.7,
                        imageBase64,
                        imageMimeType,
                    };

                    const analysisResult = await provider.chat(
                        [{ role: 'user', content: userPrompt }],
                        systemPrompt,
                        modelConfig,
                        visionOptions
                    );

                    // 保存 AI 分析到 conversations 表
                    let conversationId: string | null = null;
                    try {
                        const { createAIAnalysisConversation } = await import('@/lib/ai-analysis');
                        conversationId = await createAIAnalysisConversation({
                            userId: user.id,
                            sourceType: 'face',
                            sourceData: {
                                analysis_type: analysisType,
                                question: question || null,
                                model_id: requestedModelId,
                                reasoning: reasoningEnabled,
                            },
                            title: generateFaceTitle(analysisType),
                            aiResponse: analysisResult,
                        });
                    } catch (convError) {
                        console.error('[face] 创建 AI 分析对话失败:', convError);
                        // 继续执行，但不保存对话 - 用户仍可看到结果
                    }

                    // 保存分析记录
                    let readingId: string | null = null;
                    if (conversationId) {
        const serviceClient = getServiceRoleClient();
                        const { data: insertedReading, error: insertError } = await serviceClient
                            .from('face_readings')
                            .insert({
                                user_id: user.id,
                                analysis_type: analysisType,
                                conversation_id: conversationId,
                            })
                            .select('id')
                            .single();

                        if (insertError) {
                            console.error('[face] 保存分析记录失败:', insertError.message);
                        } else {
                            readingId = insertedReading?.id || null;
                        }
                    }

                    return NextResponse.json({
                        success: true,
                        data: {
                            analysis: analysisResult,
                            readingId,
                            conversationId,
                        }
                    });

                } catch (aiError) {
                    await addCredits(user.id, 1);
                    console.error('AI 分析失败:', aiError);
                    return NextResponse.json({
                        success: false,
                        error: 'AI 分析失败，请稍后重试'
                    }, { status: 500 });
                }
            }

            default:
                return NextResponse.json({
                    success: false,
                    error: '未知的操作类型'
                }, { status: 400 });
        }
    } catch (error) {
        console.error('面相分析 API 错误:', error);
        return NextResponse.json({
            success: false,
            error: '服务器错误'
        }, { status: 500 });
    }
}

// GET 方法 - 获取分析类型列表
export async function GET(): Promise<NextResponse<FaceResponse>> {
    return NextResponse.json({
        success: true,
        data: {
            types: FACE_ANALYSIS_TYPES,
            disclaimer: FACE_DISCLAIMER
        }
    });
}
