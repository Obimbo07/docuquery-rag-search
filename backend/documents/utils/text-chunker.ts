export function chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  // Split text into sentences first
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  const chunks: string[] = [];
  let currentChunk = "";
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    // If adding this sentence would exceed chunk size, finalize current chunk
    if (currentTokens + sentenceTokens > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      // Start new chunk with overlap
      currentChunk = getOverlapText(currentChunk, overlap) + " " + sentence;
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
      currentTokens += sentenceTokens;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

function getOverlapText(text: string, overlapTokens: number): string {
  const words = text.split(" ");
  const overlapWords = Math.min(words.length, Math.ceil(overlapTokens / 4));
  return words.slice(-overlapWords).join(" ");
}
