import { api } from "encore.dev/api";
import { documentsDB } from "./db";
import type { Document } from "./types";

interface ListResponse {
  documents: Document[];
}

// Lists all uploaded documents.
export const list = api<void, ListResponse>(
  { expose: true, method: "GET", path: "/documents" },
  async () => {
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
  }
);
