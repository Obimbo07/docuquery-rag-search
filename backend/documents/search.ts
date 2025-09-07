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

      // Check if database is accessible
      try {
        await documentsDB.queryRow`SELECT 1`;
        console.log("Database connection verified for search");
      } catch (dbError) {
        console.error("Database connection failed:", dbError);
        throw APIError.internal("Database connection failed. Please ensure PostgreSQL is running and accessible.");
      }

      // Generate embedding for the query
      let queryEmbedding: number[] = [];
      try {
        const queryEmbeddings = await generateEmbeddings([query]);
        queryEmbedding = queryEmbeddings[0];
        console.log("Query embedding generated successfully");
      } catch (embeddingError) {
        console.error("Query embedding generation failed:", embeddingError);
        // Continue with text-based search as fallback
        console.log("Falling back to text-based search");
      }

      // Try vector search first, fallback to text search
      let results;
      try {
        if (queryEmbedding.length > 0) {
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
          console.log(`Vector search returned ${results.length} results`);
        } else {
          throw new Error("No query embedding available");
        }
      } catch (vectorError) {
        console.log("Vector search failed, falling back to cosine similarity calculation");
        
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

        if (queryEmbedding.length > 0) {
          // Calculate cosine similarity in application
          const scoredResults = allChunks
            .map(chunk => {
              try {
                const chunkEmbedding = JSON.parse(chunk.embedding);
                const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
                return {
                  content: chunk.content,
                  score: similarity,
                  document_id: chunk.document_id,
                  filename: chunk.filename,
                  chunk_id: chunk.chunk_id
                };
              } catch (parseError) {
                console.error("Failed to parse embedding for chunk:", chunk.chunk_id);
                return null;
              }
            })
            .filter(result => result !== null) as Array<{
              content: string;
              score: number;
              document_id: string;
              filename: string;
              chunk_id: string;
            }>;

          // Sort by similarity and take top results
          results = scoredResults
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        } else {
          // Final fallback to text-based search
          console.log("Using text-based search as final fallback");
          const textSearchResults = await documentsDB.queryAll<{
            content: string;
            document_id: string;
            filename: string;
            chunk_id: string;
          }>`
            SELECT 
              dc.content,
              dc.document_id,
              d.filename,
              dc.id as chunk_id
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE LOWER(dc.content) LIKE LOWER(${'%' + query + '%'})
            ORDER BY dc.chunk_index
            LIMIT ${limit}
          `;
          
          results = textSearchResults.map(result => ({
            ...result,
            score: 0.5 // Default score for text search
          }));
        }
      }

      const searchResults = results.map(row => ({
        content: row.content,
        score: parseFloat(row.score.toString()),
        documentId: row.document_id,
        filename: row.filename,
        chunkId: row.chunk_id
      }));

      console.log(`Search completed with ${searchResults.length} results`);

      return {
        results: searchResults,
        totalResults: searchResults.length
      };

    } catch (error) {
      console.error("Search error:", error);
      if (error instanceof APIError) {
        throw error;
      }
      
      // Provide more specific error messages
      let errorMessage = "Failed to search documents";
      if (error instanceof Error) {
        if (error.message.includes("database") || error.message.includes("connection")) {
          errorMessage = "Database connection failed. Please ensure PostgreSQL is running.";
        } else if (error.message.includes("embedding")) {
          errorMessage = "AI model loading failed. Search may be limited to text-based results.";
        } else {
          errorMessage = error.message;
        }
      }
      
      throw APIError.internal(errorMessage, error);
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
