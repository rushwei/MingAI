type QueryError = { message?: string } | null;

type UpdateQuery = {
  eq: (field: string, value: string) => {
    eq: (nextField: string, nextValue: string) => Promise<{ error: QueryError }>;
  };
};

type DeleteQuery = {
  eq: (field: string, value: string) => {
    eq: (nextField: string, nextValue: string) => Promise<{ error: QueryError }>;
  };
};

type ConversationDeleteClient = {
  from: (table: string) => {
    update?: (payload: Record<string, unknown>) => UpdateQuery;
    delete: () => DeleteQuery;
  };
};

function normalizeError(error: QueryError) {
  if (!error) return null;
  return { message: typeof error.message === 'string' ? error.message : 'Unknown error' };
}

export async function deleteConversationGraph(
  supabase: ConversationDeleteClient,
  userId: string,
  conversationId: string,
) {
  const { error: knowledgeEntriesError } = await supabase
    .from('knowledge_entries')
    .delete()
    .eq('source_type', 'conversation')
    .eq('source_id', conversationId);

  if (knowledgeEntriesError) {
    return { error: normalizeError(knowledgeEntriesError) };
  }

  const { error: archivedSourcesError } = await supabase
    .from('archived_sources')
    .delete()
    .eq('source_type', 'conversation')
    .eq('source_id', conversationId);

  if (archivedSourcesError) {
    return { error: normalizeError(archivedSourcesError) };
  }

  const { error: conversationError } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId);
  if (conversationError) {
    return { error: normalizeError(conversationError) };
  }

  return { error: null };
}
