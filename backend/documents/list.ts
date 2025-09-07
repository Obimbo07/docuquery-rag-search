import { api, APIError } from "encore.dev/api";
import { documentsDB } from "./db";
import type { Document } from "./types";

interface ListResponse {
  documents: Document[];
}

// Lists all uploaded documents.
export const list = api<void, ListResponse>(
  { expose: true, method: "GET", path: "/documents" },
  async () => {
    try {
      // Check if database is accessible
      try {
        await documentsDB.queryRow`SELECT 1`;
        console.log("Database connection verified for list");
      } catch (dbError) {
        console.error("Database connection failed:", dbError);
        throw APIError.internal("Database connection failed. Please ensure PostgreSQL is running and accessible.");
      }

      const documents = await documentsDB.queryAll<{
        id: string;
        filename: string;
        content: string;
        upload_date: Date;
        chunk_count: number;
        file_size: number;
      }>`
        SELECT id, filename, content, upload_date, chunk_count, file_size
        FROM documents
        ORDER BY upload_date DESC
      `;

      console.log(`Retrieved ${documents.length} documents`);

      return {
        documents: documents.map(doc => ({
          id: doc.id,
          filename: doc.filename,
          content: doc.content,
          uploadDate: doc.upload_date,
          chunkCount: doc.chunk_count,
          fileSize: doc.file_size
        }))
      };
    } catch (error) {
      console.error("List documents error:", error);
      if (error instanceof APIError) {
        throw error;
      }
      
      // Provide more specific error messages
      let errorMessage = "Failed to retrieve documents";
      if (error instanceof Error) {
        if (error.message.includes("database") || error.message.includes("connection")) {
          errorMessage = "Database connection failed. Please ensure PostgreSQL is running.";
        } else {
          errorMessage = error.message;
        }
      }
      
      throw APIError.internal(errorMessage, error);
    }
  }
);
