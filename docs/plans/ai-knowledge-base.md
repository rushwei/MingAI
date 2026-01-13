# AI knowledge base plan

## Scope
- Build a Markdown-based knowledge base using Qwen embeddings.
- Keep the design compatible with a future user memory system.
- No code in this document; design and execution plan only.

## MVP data flow
1. Ingest: scan a target folder for .md files.
2. Parse: extract frontmatter (title/tags/summary/source_url) and heading hierarchy.
3. Chunk: split by heading sections, then cap by token length (400-800 tokens).
4. Embed: generate Qwen embeddings for each chunk.
5. Store: save document metadata, chunks, and embeddings.
6. Retrieve: vector top-k + keyword filters, then build the RAG prompt with citations.

## Data model (recommended)
- documents
  - id, title, source_path, source_type, content_hash
  - visibility (public/team/private), owner_id, team_id
  - created_at, updated_at
- chunks
  - id, document_id, chunk_index, section_path
  - text, token_count, content_hash, metadata (jsonb)
- embeddings
  - chunk_id, embedding, embedding_model, created_at
- optional
  - embedding_jobs (rebuild queue)
  - embedding_collections (versioned embedding sets)

## Embedding model changes
- pgvector columns have fixed dimension per table.
- Treat embedding models as versioned collections.
- When switching models:
  - create a new collection/table
  - rebuild embeddings in the background
  - switch the active collection when ready
  - retain old collection temporarily for rollback

## Markdown rules
- Preserve frontmatter fields: title/tags/summary/source_url.
- Keep code blocks as separate chunks.
- Store section_path from heading hierarchy for better citations.

## Retrieval and prompt
- Retrieve 8-12 candidates, then rerank and keep 4-6 chunks.
- Include citations: source_path + section_path + chunk index.
- Combine: user question + memory context + retrieved chunks.

## RLS and permissions
- Enforce visibility at the documents/chunks layer.
- Server-only ingestion and embedding to avoid key leakage.
- Public reads allowed only for visibility=public.

## User memory (future)
- Memory types: profile, preference, goal, constraint, project_context.
- After each conversation, extract structured facts with a memory extractor.
- Store memories with embedding + importance + last_used + expires_at.
- Retrieve memories by similarity and importance, then inject into system prompt.
- Provide UI to view/edit/delete memories.

## Quality and operations
- De-duplication via content_hash and chunk_hash.
- Maintain a fixed evaluation set (questions + expected answers).
- Track retrieval hit rate, citation accuracy, and user feedback.

## Phased delivery
- Phase 1: Markdown ingestion + embeddings + retrieval + citations.
- Phase 2: Incremental updates + evaluation dashboard.
- Phase 3: Long-term memory extraction and recall.
