export interface Document {
  id: string;
  filename: string;
  content: string;
  uploadDate: Date;
  chunkCount: number;
  fileSize: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  embedding?: number[];
  createdAt: Date;
}

export interface SearchResult {
  content: string;
  score: number;
  documentId: string;
  filename: string;
  chunkId: string;
}

export interface UploadResponse {
  id: string;
  filename: string;
  chunks: number;
  processed: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
}

export interface GenerateResponse {
  answer: string;
  sources: string[];
}
