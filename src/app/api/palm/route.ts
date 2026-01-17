/**
 * 手相分析 API 路由
 * 
 * 提供手相图片分析、历史记录等功能
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServiceClient } from '@/lib/supabase-server';
import { useCredit, hasCredits } from '@/lib/credits';
import { getModelConfig, DEFAULT_VISION_MODEL_ID } from '@/lib/ai-config';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import { isModelAllowedForMembership, isReasoningAllowedForMembership } from '@/lib/ai-access';
import { getProvider } from '@/lib/ai-providers';
import type { VisionProviderOptions } from '@/lib/ai-providers';
import {
    PALM_ANALYSIS_TYPES,
    buildPalmSystemPrompt,
    buildPalmUserPrompt,
    generatePalmTitle,
    type HandType
} from '@/lib/palm';

// 请求类型
interface PalmRequest {
    action: 'analyze' | 'list-types';
    imageBase64?: string;        // Base64 图片数据（不含前缀）
    imageMimeType?: string;      // 图片 MIME 类型
    analysisType?: string;       // 分析类型
    handType?: HandType;         // 左手/右手
    question?: string;           // 用户问题
    modelId?: string;
    reasoning?: boolean;
}

// 响应类型
interface PalmResponse {
    success: boolean;
    data?: {
        types?: typeof PALM_ANALYSIS_TYPES;
        analysis?: string;
        reasoning?: string;
        readingId?: string | null;
        conversationId?: string | null;
    };
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<PalmResponse>> {
    try {
        const body: PalmRequest = await request.json();
        const {
            action,
            imageBase64,
            imageMimeType = 'image/jpeg',
            analysisType = 'full',
            handType = 'left',
            question,
            modelId,
            reasoning
        } = body;

        switch (action) {
            // 获取分析类型列表
            case 'list-types':
                return NextResponse.json({
                    success: true,
                    data: { types: PALM_ANALYSIS_TYPES }
                });

            // AI 分析手相
            case 'analyze': {
                if (!imageBase64) {
                    return NextResponse.json({
                        success: false,
                        error: '请上传手相图片'
                    }, { status: 400 });
                }

                // 检查用户认证
                const authHeader = request.headers.get('authorization');
                if (!authHeader) {
                    return NextResponse.json({
                        success: false,
                        error: '请先登录'
                    }, { status: 401 });
                }

                const token = authHeader.replace('Bearer ', '');
                const { data: { user }, error: authError } = await supabase.auth.getUser(token);

                if (authError || !user) {
                    return NextResponse.json({
                        success: false,
                        error: '认证失败'
                    }, { status: 401 });
                }

                // 检查用户积分
                const hasEnoughCredits = await hasCredits(user.id);
                if (!hasEnoughCredits) {
                    return NextResponse.json({
                        success: false,
                        error: '积分不足，请充值后使用'
                    }, { status: 403 });
                }

                // 检查模型权限
                const requestedModelId = modelId || DEFAULT_VISION_MODEL_ID;
                const modelConfig = getModelConfig(requestedModelId);
                if (!modelConfig) {
                    return NextResponse.json({
                        success: false,
                        error: '模型不可用'
                    }, { status: 400 });
                }

                // 确保是视觉模型
                if (!modelConfig.supportsVision) {
                    return NextResponse.json({
                        success: false,
                        error: '请选择支持图像分析的模型'
                    }, { status: 400 });
                }

                const membershipType = await getEffectiveMembershipType(user.id);
                if (!isModelAllowedForMembership(modelConfig, membershipType)) {
                    return NextResponse.json({
                        success: false,
                        error: '手相分析需要 Plus 会员或以上'
                    }, { status: 403 });
                }

                const reasoningAllowed = isReasoningAllowedForMembership(modelConfig, membershipType);
                const reasoningEnabled = reasoningAllowed ? !!reasoning : false;

                // 构建提示词
                const systemPrompt = buildPalmSystemPrompt(analysisType);
                const userPrompt = buildPalmUserPrompt(analysisType, handType, question);

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

                    // 扣除积分
                    const remainingCredits = await useCredit(user.id);
                    if (remainingCredits === null) {
                        console.error('[palm] 扣除积分失败');
                        return NextResponse.json({
                            success: false,
                            error: '积分扣减失败，请稍后重试'
                        }, { status: 500 });
                    }

                    // 保存 AI 分析到 conversations 表
                    let conversationId: string | null = null;
                    try {
                        const { createAIAnalysisConversation } = await import('@/lib/ai-analysis');
                        conversationId = await createAIAnalysisConversation({
                            userId: user.id,
                            sourceType: 'palm',
                            sourceData: {
                                analysis_type: analysisType,
                                hand_type: handType,
                                question: question || null,
                                model_id: requestedModelId,
                                reasoning: reasoningEnabled,
                            },
                            title: generatePalmTitle(analysisType, handType),
                            aiResponse: analysisResult,
                        });
                    } catch (convError) {
                        console.error('[palm] 创建 AI 分析对话失败:', convError);
                        // 继续执行，但不保存对话 - 用户仍可看到结果
                    }

                    // 保存分析记录
                    let readingId: string | null = null;
                    if (conversationId) {
                        const serviceClient = getServiceClient();
                        const { data: insertedReading, error: insertError } = await serviceClient
                            .from('palm_readings')
                            .insert({
                                user_id: user.id,
                                analysis_type: analysisType,
                                hand_type: handType,
                                conversation_id: conversationId,
                            })
                            .select('id')
                            .single();

                        if (insertError) {
                            console.error('[palm] 保存分析记录失败:', insertError.message);
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
        console.error('手相分析 API 错误:', error);
        return NextResponse.json({
            success: false,
            error: '服务器错误'
        }, { status: 500 });
    }
}

// GET 方法 - 获取分析类型列表
export async function GET(): Promise<NextResponse<PalmResponse>> {
    return NextResponse.json({
        success: true,
        data: { types: PALM_ANALYSIS_TYPES }
    });
}
