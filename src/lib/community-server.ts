export type CommunityAuthorProfile = {
    name: string;
    avatarUrl: string | null;
};

type UserProfileRow = {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
};

type UserLookupResult = {
    data: UserProfileRow[] | null;
    error: { message?: string } | null;
};

export type CommunityLookupClient = {
    from(table: 'users'): {
        select(columns: 'id, nickname, avatar_url'): {
            in(column: 'id', values: string[]): Promise<UserLookupResult>;
            eq(column: 'id', value: string): {
                maybeSingle(): Promise<{ data: UserProfileRow | null; error: { message?: string } | null }>;
            };
        };
    };
};

export function asCommunityLookupClient(client: unknown): CommunityLookupClient {
    return client as CommunityLookupClient;
}

const DEFAULT_COMMUNITY_AUTHOR_NAME = '命理爱好者';

export async function loadCommunityAuthorProfileMap(
    supabase: CommunityLookupClient,
    userIds: Array<string | null | undefined>,
) {
    const ids = Array.from(new Set(userIds.filter((value): value is string => typeof value === 'string' && value.length > 0)));
    const authorMap = new Map<string, CommunityAuthorProfile>();

    if (ids.length === 0) {
        return authorMap;
    }

    const { data, error } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .in('id', ids);

    if (error) {
        console.error('[community] failed to load author names:', error.message || error);
        return authorMap;
    }

    for (const row of data || []) {
        authorMap.set(row.id, normalizeCommunityAuthorProfile(row));
    }

    return authorMap;
}

export async function loadSingleCommunityAuthorProfile(
    supabase: CommunityLookupClient,
    userId: string,
) {
    const { data, error } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('[community] failed to load author name:', error.message || error);
        return {
            name: DEFAULT_COMMUNITY_AUTHOR_NAME,
            avatarUrl: null,
        };
    }

    return normalizeCommunityAuthorProfile(data);
}

export function normalizeCommunityAuthorName(name: string | null | undefined) {
    if (typeof name !== 'string') return DEFAULT_COMMUNITY_AUTHOR_NAME;
    const normalized = name.trim();
    return normalized || DEFAULT_COMMUNITY_AUTHOR_NAME;
}

function normalizeCommunityAuthorProfile(profile: Pick<UserProfileRow, 'nickname' | 'avatar_url'> | null | undefined): CommunityAuthorProfile {
    return {
        name: normalizeCommunityAuthorName(profile?.nickname ?? null),
        avatarUrl: typeof profile?.avatar_url === 'string' && profile.avatar_url.length > 0
            ? profile.avatar_url
            : null,
    };
}
