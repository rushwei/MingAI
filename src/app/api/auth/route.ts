import { signIn, signUp, getUserById, refreshSession, signOut } from '@/lib/auth/local-auth';
import { verifyToken } from '@/lib/auth/jwt';
import { NextResponse } from 'next/server';

function jsonResponse(data: unknown, status: number = 200) {
    return new NextResponse(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

type AuthAction = 'signInWithPassword' | 'signUp' | 'signOut' | 'getUser' | 'updateUser' | 'resetPasswordForEmail' | 'signInWithOtp' | 'verifyOtp' | 'checkLoginAttempts' | 'recordLoginAttempt' | 'resetPasswordWithOtp';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        console.log('[auth] GET /api/auth called');
        console.log('[auth] Authorization header:', authHeader ? 'Present' : 'Missing');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('[auth] No valid Authorization header, returning null session');
            return jsonResponse({ data: { session: null, user: null }, error: null });
        }

        const token = authHeader.substring(7);
        console.log('[auth] Token received (first 50 chars):', token.substring(0, 50));
        
        const payload = verifyToken(token);
        console.log('[auth] Token payload:', payload ? JSON.stringify(payload) : 'null');

        if (!payload) {
            console.log('[auth] Token verification failed');
            return jsonResponse({ data: { session: null, user: null }, error: { message: 'Invalid token', code: 'invalid_token' } }, 401);
        }

        const user = await getUserById(payload.userId);
        console.log('[auth] User found:', user ? user.email : 'null');

        if (!user) {
            console.log('[auth] User not found');
            return jsonResponse({ data: { session: null, user: null }, error: null });
        }

        return jsonResponse({
            data: {
                session: {
                    access_token: token,
                    refresh_token: '',
                    expires_at: Math.floor(Date.now() / 1000) + 3600,
                    token_type: 'bearer',
                    user: {
                        id: user.id,
                        email: user.email,
                        email_confirmed_at: new Date().toISOString(),
                        phone_confirmed_at: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        app_metadata: {},
                        user_metadata: {
                            nickname: user.nickname,
                        },
                    },
                },
                user: {
                    id: user.id,
                    email: user.email,
                    email_confirmed_at: new Date().toISOString(),
                    phone_confirmed_at: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    app_metadata: {},
                    user_metadata: {
                        nickname: user.nickname,
                    },
                },
            },
            error: null,
        });
    } catch (error) {
        console.error('Auth GET error:', error);
        return jsonResponse({ data: { session: null, user: null }, error: null });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const action = body.action as AuthAction;

        console.log('Auth action:', action);
        console.log('Body:', JSON.stringify(body));

        switch (action) {
            case 'signInWithPassword': {
                const { email, password } = body;
                console.log('Attempting sign in for:', email);
                
                try {
                    const session = await signIn(email, password);
                    
                    if (!session) {
                        return jsonResponse({
                            data: { session: null, user: null },
                            error: { message: 'Invalid login credentials', code: 'Invalid login credentials' },
                        });
                    }

                    return jsonResponse({
                        data: {
                            session: {
                                access_token: session.accessToken,
                                refresh_token: session.refreshToken,
                                expires_at: session.expiresAt,
                                token_type: 'bearer',
                                user: {
                                    id: session.user.id,
                                    email: session.user.email,
                                    email_confirmed_at: new Date().toISOString(),
                                    phone_confirmed_at: null,
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                    app_metadata: {},
                                    user_metadata: {
                                        nickname: session.user.nickname,
                                    },
                                },
                            },
                            user: {
                                id: session.user.id,
                                email: session.user.email,
                                email_confirmed_at: new Date().toISOString(),
                                phone_confirmed_at: null,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                app_metadata: {},
                                user_metadata: {
                                    nickname: session.user.nickname,
                                },
                            },
                        },
                        error: null,
                    });
                } catch (signInError) {
                    console.error('Sign in error:', signInError);
                    return jsonResponse({
                        data: { session: null, user: null },
                        error: { message: 'Internal server error', code: 'internal_error' },
                    });
                }
            }

            case 'signUp': {
                const { email, password } = body;
                
                try {
                    const session = await signUp(email, password);
                    
                    if (!session) {
                        return jsonResponse({
                            data: { session: null, user: null },
                            error: { message: 'User already registered', code: 'User already registered' },
                        });
                    }

                    return jsonResponse({
                        data: {
                            session: {
                                access_token: session.accessToken,
                                refresh_token: session.refreshToken,
                                expires_at: session.expiresAt,
                                token_type: 'bearer',
                                user: {
                                    id: session.user.id,
                                    email: session.user.email,
                                    email_confirmed_at: new Date().toISOString(),
                                    phone_confirmed_at: null,
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                    app_metadata: {},
                                    user_metadata: {
                                        nickname: session.user.nickname,
                                    },
                                },
                            },
                            user: {
                                id: session.user.id,
                                email: session.user.email,
                                email_confirmed_at: new Date().toISOString(),
                                phone_confirmed_at: null,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                app_metadata: {},
                                user_metadata: {
                                    nickname: session.user.nickname,
                                },
                            },
                        },
                        error: null,
                    });
                } catch (signUpError) {
                    console.error('Sign up error:', signUpError);
                    return jsonResponse({
                        data: { session: null, user: null },
                        error: { message: 'Internal server error', code: 'internal_error' },
                    });
                }
            }

            case 'signOut': {
                const authHeader = request.headers.get('Authorization');
                if (authHeader?.startsWith('Bearer ')) {
                    const token = authHeader.substring(7);
                    const payload = verifyToken(token);
                    if (payload) {
                        await signOut('');
                    }
                }
                return jsonResponse({ data: { signedOut: true }, error: null });
            }

            case 'getUser': {
                const { token } = body;
                if (!token) {
                    return jsonResponse({ data: { user: null }, error: null });
                }

                const payload = verifyToken(token);
                if (!payload) {
                    return jsonResponse({ data: { user: null }, error: null });
                }

                try {
                    const user = await getUserById(payload.userId);
                    if (!user) {
                        return jsonResponse({ data: { user: null }, error: null });
                    }

                    return jsonResponse({
                        data: {
                            user: {
                                id: user.id,
                                email: user.email,
                                email_confirmed_at: new Date().toISOString(),
                                phone_confirmed_at: null,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                app_metadata: {},
                                user_metadata: {
                                    nickname: user.nickname,
                                },
                            },
                        },
                        error: null,
                    });
                } catch (getUserError) {
                    console.error('Get user error:', getUserError);
                    return jsonResponse({ data: { user: null }, error: null });
                }
            }

            case 'updateUser': {
                const { attributes } = body;
                return jsonResponse({
                    data: {
                        user: {
                            id: 'temp',
                            email: '',
                            email_confirmed_at: new Date().toISOString(),
                            phone_confirmed_at: null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            app_metadata: {},
                            user_metadata: attributes.data || {},
                        },
                    },
                    error: null,
                });
            }

            case 'resetPasswordForEmail': {
                const { email } = body;
                console.log('Reset password for:', email);
                return jsonResponse({ data: null, error: null });
            }

            case 'signInWithOtp': {
                return jsonResponse({ data: null, error: null });
            }

            case 'verifyOtp': {
                return jsonResponse({
                    data: { session: null, user: null },
                    error: null,
                });
            }

            case 'checkLoginAttempts': {
                const { email } = body;
                console.log('Check login attempts for:', email);
                return jsonResponse({
                    data: { blocked: false, remainingAttempts: 5 },
                    error: null,
                });
            }

            case 'recordLoginAttempt': {
                const { email, success } = body;
                console.log('Record login attempt:', email, success);
                return jsonResponse({ data: { success: true }, error: null });
            }

            case 'resetPasswordWithOtp': {
                return jsonResponse({ data: { success: true }, error: null });
            }

            default:
                console.log('Unknown action:', action);
                return jsonResponse({ data: null, error: { message: 'Unknown action', code: 'unknown_action' } });
        }
    } catch (error) {
        console.error('Auth POST error:', error);
        return jsonResponse({ data: null, error: { message: 'Internal server error', code: 'internal_error' } });
    }
}