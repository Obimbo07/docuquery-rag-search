import { api, APIError } from "encore.dev/api";
import { documentsDB } from "./db";
import { generateEmbeddings } from "./utils/embeddings";
import type { SearchResponse } from "./types";

interface SearchRequest {
  query: string;
  limit?: number;
}

// Searches documents using semantic vector similarity.
export const search = api<SearchRequest, SearchResponse>(
  { expose: true, method: "POST", path: "/search" },
  async ({ query, limit = 10 }) => {
    try {
      if (!query.trim()) {
        throw APIError.invalidArgument("Query cannot be empty");
      }

      // Generate embedding for the query
      const queryEmbeddings = await generateEmbeddings([query]);
      const queryEmbedding = queryEmbeddings[0];

      // Try vector search first, fallback to text search
      let results;
      try {
        const embeddingArray = `[${queryEmbedding.join(',')}]`;
        results = await documentsDB.queryAll<{
          content: string;
          score: number;
          document_id: string;
          filename: string;
          chunk_id: string;
        }>`
          SELECT 
            dc.content,
            1 - (dc.embedding_vector <=> ${embeddingArray}::vector) as score,
            dc.document_id,
            d.filename,
            dc.id as chunk_id
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE dc.embedding_vector IS NOT NULL
          ORDER BY dc.embedding_vector <=> ${embeddingArray}::vector
          LIMIT ${limit}
        `;
      } catch (vectorError) {
        // Fallback to cosine similarity calculation in application
        const allChunks = await documentsDB.queryAll<{
          content: string;
          embedding: string;
          document_id: string;
          filename: string;
          chunk_id: string;
        }>`
          SELECT 
            dc.content,
            dc.embedding,
            dc.document_id,
            d.filename,
            dc.id as chunk_id
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE dc.embedding IS NOT NULL
        `;

        // Calculate cosine similarity in application
        const scoredResults = allChunks.map(chunk => {
          const chunkEmbedding = JSON.parse(chunk.embedding);
          const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
          return {
            content: chunk.content,
            score: similarity,
            document_id: chunk.document_id,
            filename: chunk.filename,
            chunk_id: chunk.chunk_id
          };
        });

        // Sort by similarity and take top results
        results = scoredResults
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      }

      const searchResults = results.map(row => ({
        content: row.content,
        score: parseFloat(row.score.toString()),
        documentId: row.document_id,
        filename: row.filename,
        chunkId: row.chunk_id
      }));

      return {
        results: searchResults,
        totalResults: searchResults.length
      };

    } catch (error) {
      console.error("Search error:", error);
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to search documents", error);
    }
  }
);

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
