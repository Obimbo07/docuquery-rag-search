-- Add vector support if the extension is available
DO $$
BEGIN
  -- Try to create the extension
  CREATE EXTENSION IF NOT EXISTS vector;
  
  -- Add vector column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_chunks' 
    AND column_name = 'embedding_vector'
  ) THEN
    ALTER TABLE document_chunks ADD COLUMN embedding_vector vector(384);
  END IF;
  
  -- Create vector index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_document_chunks_embedding_vector'
  ) THEN
    CREATE INDEX idx_document_chunks_embedding_vector ON document_chunks USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  -- If vector extension is not available, just continue without it
  RAISE NOTICE 'Vector extension not available, continuing without vector support';
END $$;
