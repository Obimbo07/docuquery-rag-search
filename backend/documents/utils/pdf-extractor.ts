import pdfParse from "pdf-parse";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Validate that we have a proper PDF buffer
    if (!buffer || buffer.length === 0) {
      throw new Error("Empty or invalid buffer provided");
    }

    // Check PDF header
    const header = buffer.slice(0, 4).toString();
    if (header !== '%PDF') {
      throw new Error("Invalid PDF file: missing PDF header");
    }

    const data = await pdfParse(buffer, {
      // Options for better text extraction
      normalizeWhitespace: true,
      disableCombineTextItems: false,
    });

    if (!data.text) {
      throw new Error("No text content found in PDF");
    }

    // Clean up the extracted text
    const cleanText = data.text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();

    return cleanText;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
