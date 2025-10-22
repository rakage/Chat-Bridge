-- Fix the match_documents function to use correct column names (quoted identifiers)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  company_id text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks."id",
    document_chunks."content",
    document_chunks."metadata",
    1 - (document_chunks."embedding" <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE 
    document_chunks."companyId" = company_id
    AND document_chunks."embedding" IS NOT NULL
    AND 1 - (document_chunks."embedding" <=> query_embedding) > match_threshold
  ORDER BY document_chunks."embedding" <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Fix other functions too
CREATE OR REPLACE FUNCTION delete_company_documents(company_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM document_chunks WHERE "companyId" = company_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_document_chunks_by_document(document_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM document_chunks WHERE "documentId" = document_id;
END;
$$;
