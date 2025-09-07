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
      const contentType = request.headers.get('content-type') || '';
      
      if (!contentType.includes('multipart/form-data')) {
        throw APIError.invalidArgument("Content-Type must be multipart/form-data");
      }

      // Parse multipart data using the Web API
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch (error) {
        console.error("FormData parsing error:", error);
        throw APIError.invalidArgument("Failed to parse multipart form data");
      }

      const file = formData.get('file') as File;
      
      if (!file) {
        throw APIError.invalidArgument("No file provided in form data");
      }

      if (!file.name.toLowerCase().endsWith('.pdf')) {
        throw APIError.invalidArgument("Only PDF files are supported");
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      if (fileBuffer.length === 0) {
        throw APIError.invalidArgument("File is empty");
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
        VALUES (${file.name}, ${extractedText}, ${fileBuffer.length})
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
        filename: file.name,
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
