import { api, APIError } from "encore.dev/api";
import { documentsDB } from "./db";
import { extractTextFromPDF } from "./utils/pdf-extractor";
import { chunkText } from "./utils/text-chunker";
import { generateEmbeddings } from "./utils/embeddings";
import type { UploadResponse } from "./types";

// Uploads a PDF document and processes it for search.
export const upload = api<void, UploadResponse>(
  { expose: true, method: "POST", path: "/upload" },
  async (req, { request }) => {
    try {
      // Get the raw request body for multipart parsing
      const bufferChunks: Buffer[] = [];
      
      for await (const chunk of request) {
        bufferChunks.push(chunk);
      }
      
      const buffer = Buffer.concat(bufferChunks);
      const boundary = request.headers['content-type']?.split('boundary=')[1];
      
      if (!boundary) {
        throw APIError.invalidArgument("No multipart boundary found");
      }

      // Simple multipart parser for PDF files
      const boundaryBuffer = Buffer.from(`--${boundary}`);
      const parts = [];
      let start = 0;
      
      while (true) {
        const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
        if (boundaryIndex === -1) break;
        
        if (start !== 0) {
          parts.push(buffer.slice(start, boundaryIndex));
        }
        start = boundaryIndex + boundaryBuffer.length;
      }

      let fileBuffer: Buffer | null = null;
      let filename = "unknown.pdf";

      for (const part of parts) {
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;
        
        const headers = part.slice(0, headerEnd).toString();
        const content = part.slice(headerEnd + 4, part.length - 2); // Remove trailing \r\n
        
        if (headers.includes('name="file"')) {
          fileBuffer = content;
          
          // Extract filename from Content-Disposition header
          const filenameMatch = headers.match(/filename="([^"]+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
          break;
        }
      }

      if (!fileBuffer) {
        throw APIError.invalidArgument("No file provided");
      }

      // Validate file type
      if (!filename.toLowerCase().endsWith('.pdf')) {
        throw APIError.invalidArgument("Only PDF files are supported");
      }

      // Extract text from PDF
      const extractedText = await extractTextFromPDF(fileBuffer);
      
      if (!extractedText.trim()) {
        throw APIError.invalidArgument("No text could be extracted from the PDF");
      }

      // Create document record
      const documentId = await documentsDB.queryRow<{ id: string }>`
        INSERT INTO documents (filename, content, file_size)
        VALUES (${filename}, ${extractedText}, ${fileBuffer.length})
        RETURNING id
      `;

      if (!documentId) {
        throw APIError.internal("Failed to create document record");
      }

      // Chunk the text
      const textChunks = chunkText(extractedText);

      // Generate embeddings for chunks
      const embeddings = await generateEmbeddings(textChunks);

      // Store chunks with embeddings
      const chunkPromises = textChunks.map(async (chunk, index) => {
        const embedding = embeddings[index];
        const embeddingJson = JSON.stringify(embedding);
        const embeddingArray = `[${embedding.join(',')}]`;
        
        // Check if vector column exists, if not use text storage
        try {
          await documentsDB.exec`
            INSERT INTO document_chunks (document_id, content, chunk_index, embedding, embedding_vector)
            VALUES (${documentId.id}, ${chunk}, ${index}, ${embeddingJson}, ${embeddingArray}::vector)
          `;
        } catch (vectorError) {
          // Fallback to text storage if vector column doesn't exist
          await documentsDB.exec`
            INSERT INTO document_chunks (document_id, content, chunk_index, embedding)
            VALUES (${documentId.id}, ${chunk}, ${index}, ${embeddingJson})
          `;
        }
      });

      await Promise.all(chunkPromises);

      // Update document with chunk count
      await documentsDB.exec`
        UPDATE documents 
        SET chunk_count = ${textChunks.length}
        WHERE id = ${documentId.id}
      `;

      return {
        id: documentId.id,
        filename,
        chunks: textChunks.length,
        processed: true
      };

    } catch (error) {
      console.error("Upload error:", error);
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to process document", error);
    }
  }
);
