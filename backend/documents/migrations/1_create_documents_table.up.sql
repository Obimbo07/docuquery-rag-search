CREATE TABLE documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  chunk_count INTEGER DEFAULT 0,
  file_size BIGINT DEFAULT 0
);

CREATE TABLE document_chunks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
