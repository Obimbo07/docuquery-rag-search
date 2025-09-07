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
      console.log("Upload endpoint called");
      
      // Check if database is accessible
      try {
        await documentsDB.queryRow`SELECT 1`;
        console.log("Database connection verified");
      } catch (dbError) {
        console.error("Database connection failed:", dbError);
        throw APIError.internal("Database connection failed. Please ensure PostgreSQL is running and accessible.");
      }
      
      const contentType = request.headers.get('content-type') || '';
      console.log(`Content-Type: ${contentType}`);
      
      if (!contentType.includes('multipart/form-data')) {
        throw APIError.invalidArgument("Content-Type must be multipart/form-data");
      }

      // Parse multipart data using the Web API
      let formData: FormData;
      try {
        formData = await request.formData();
        console.log("FormData parsed successfully");
      } catch (error) {
        console.error("FormData parsing error:", error);
        throw APIError.invalidArgument("Failed to parse multipart form data");
      }

      const file = formData.get('file') as File;
      
      if (!file) {
        console.error("No file found in form data");
        throw APIError.invalidArgument("No file provided in form data");
      }

      console.log(`File received: ${file.name}, size: ${file.size}, type: ${file.type}`);

      if (!file.name.toLowerCase().endsWith('.pdf')) {
        throw APIError.invalidArgument("Only PDF files are supported");
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      console.log(`File buffer created, size: ${fileBuffer.length} bytes`);

      if (fileBuffer.length === 0) {
        throw APIError.invalidArgument("File is empty");
      }

      // Check if it's actually a PDF by looking at the file header
      const pdfHeader = fileBuffer.slice(0, 4).toString();
      if (pdfHeader !== '%PDF') {
        throw APIError.invalidArgument("Invalid PDF file format");
      }

      console.log("PDF header validated");

      // Extract text from PDF
      console.log("Starting PDF text extraction...");
      const extractedText = await extractTextFromPDF(fileBuffer);
      
      if (!extractedText.trim()) {
        throw APIError.invalidArgument("No text could be extracted from the PDF");
      }

      console.log(`Text extracted: ${extractedText.length} characters`);

      // Create document record
      console.log("Creating document record in database...");
      const documentId = await documentsDB.queryRow<{ id: string }>`
        INSERT INTO documents (filename, content, file_size)
        VALUES (${file.name}, ${extractedText}, ${fileBuffer.length})
        RETURNING id
      `;

      if (!documentId) {
        throw APIError.internal("Failed to create document record");
      }

      console.log(`Document created with ID: ${documentId.id}`);

      // Chunk the text
      console.log("Chunking text...");
      const textChunks = chunkText(extractedText);
      console.log(`Created ${textChunks.length} text chunks`);

      // Generate embeddings for chunks
      console.log("Generating embeddings...");
      let embeddings: number[][];
      try {
        embeddings = await generateEmbeddings(textChunks);
        console.log(`Generated ${embeddings.length} embeddings`);
      } catch (embeddingError) {
        console.error("Embedding generation failed:", embeddingError);
        // Continue without embeddings - store chunks with null embeddings
        embeddings = textChunks.map(() => []);
        console.log("Continuing without embeddings");
      }

      // Store chunks with embeddings
      console.log("Storing chunks in database...");
      const chunkPromises = textChunks.map(async (chunk, index) => {
        const embedding = embeddings[index];
        const embeddingJson = embedding.length > 0 ? JSON.stringify(embedding) : null;
        const embeddingArray = embedding.length > 0 ? `[${embedding.join(',')}]` : null;
        
        try {
          // Try to store with vector if available and embedding exists
          if (embeddingArray) {
            await documentsDB.exec`
              INSERT INTO document_chunks (document_id, content, chunk_index, embedding, embedding_vector)
              VALUES (${documentId.id}, ${chunk}, ${index}, ${embeddingJson}, ${embeddingArray}::vector)
            `;
            console.log(`Stored chunk ${index + 1}/${textChunks.length} with vector`);
          } else {
            throw new Error("No embedding available");
          }
        } catch (vectorError) {
          console.log(`Vector storage failed for chunk ${index + 1}, falling back to text storage`);
          // Fallback to text storage
          await documentsDB.exec`
            INSERT INTO document_chunks (document_id, content, chunk_index, embedding)
            VALUES (${documentId.id}, ${chunk}, ${index}, ${embeddingJson})
          `;
          console.log(`Stored chunk ${index + 1}/${textChunks.length} as text`);
        }
      });

      await Promise.all(chunkPromises);
      console.log("All chunks stored successfully");

      // Update document with chunk count
      await documentsDB.exec`
        UPDATE documents 
        SET chunk_count = ${textChunks.length}
        WHERE id = ${documentId.id}
      `;

      console.log("Document chunk count updated");

      const response = {
        id: documentId.id,
        filename: file.name,
        chunks: textChunks.length,
        processed: true
      };

      console.log("Upload completed successfully:", response);
      return response;

    } catch (error) {
      console.error("Upload error:", error);
      if (error instanceof APIError) {
        throw error;
      }
      
      // Provide more specific error messages based on the error type
      let errorMessage = "Failed to process document";
      if (error instanceof Error) {
        if (error.message.includes("database") || error.message.includes("connection")) {
          errorMessage = "Database connection failed. Please ensure PostgreSQL is running.";
        } else if (error.message.includes("embedding")) {
          errorMessage = "AI model loading failed. This may be due to insufficient memory or network issues.";
        } else {
          errorMessage = error.message;
        }
      }
      
      throw APIError.internal(errorMessage, error);
    }
  }
);
