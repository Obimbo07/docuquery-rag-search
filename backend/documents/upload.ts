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
      // Set CORS headers for browser requests
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
      }

      // Get the raw request body for multipart parsing
      const bufferChunks: Buffer[] = [];
      
      for await (const chunk of request) {
        bufferChunks.push(chunk);
      }
      
      const buffer = Buffer.concat(bufferChunks);
      const contentType = request.headers['content-type'] || '';
      const boundary = contentType.split('boundary=')[1];
      
      if (!boundary) {
        throw APIError.invalidArgument("No multipart boundary found in Content-Type header");
      }

      // Parse multipart form data
      const boundaryBuffer = Buffer.from(`--${boundary}`);
      const endBoundaryBuffer = Buffer.from(`--${boundary}--`);
      
      let fileBuffer: Buffer | null = null;
      let filename = "unknown.pdf";

      // Find the start of the first part
      let currentIndex = buffer.indexOf(boundaryBuffer);
      if (currentIndex === -1) {
        throw APIError.invalidArgument("Invalid multipart format");
      }

      while (currentIndex !== -1) {
        // Find the next boundary or end boundary
        const nextBoundaryIndex = buffer.indexOf(boundaryBuffer, currentIndex + boundaryBuffer.length);
        const endBoundaryIndex = buffer.indexOf(endBoundaryBuffer, currentIndex);
        
        let partEnd = nextBoundaryIndex;
        if (endBoundaryIndex !== -1 && (nextBoundaryIndex === -1 || endBoundaryIndex < nextBoundaryIndex)) {
          partEnd = endBoundaryIndex;
        }
        
        if (partEnd === -1) break;

        // Extract this part
        const partStart = currentIndex + boundaryBuffer.length;
        const partBuffer = buffer.slice(partStart, partEnd);
        
        // Find headers end (\r\n\r\n)
        const headersEnd = partBuffer.indexOf('\r\n\r\n');
        if (headersEnd !== -1) {
          const headers = partBuffer.slice(0, headersEnd).toString();
          const content = partBuffer.slice(headersEnd + 4);
          
          // Remove trailing \r\n if present
          const cleanContent = content.slice(0, content.length - 2);
          
          if (headers.includes('name="file"') && headers.includes('filename=')) {
            fileBuffer = cleanContent;
            
            // Extract filename from Content-Disposition header
            const filenameMatch = headers.match(/filename="([^"]+)"/);
            if (filenameMatch) {
              filename = filenameMatch[1];
            }
            break;
          }
        }
        
        currentIndex = nextBoundaryIndex;
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        throw APIError.invalidArgument("No file provided or file is empty");
      }

      // Validate file type
      if (!filename.toLowerCase().endsWith('.pdf')) {
        throw APIError.invalidArgument("Only PDF files are supported");
      }

      // Check if it's actually a PDF by looking at the file header
      const pdfHeader = fileBuffer.slice(0, 4).toString();
      if (pdfHeader !== '%PDF') {
        throw APIError.invalidArgument("Invalid PDF file format");
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
