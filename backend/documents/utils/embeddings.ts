import { pipeline } from "@huggingface/transformers";

let embeddingPipeline: any = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      "feature-extraction",
      "sentence-transformers/all-MiniLM-L6-v2",
      { device: "cpu" }
    );
  }
  return embeddingPipeline;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const pipeline = await getEmbeddingPipeline();
    
    const embeddings: number[][] = [];
    
    // Process texts in batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const batchEmbeddings = await Promise.all(
        batch.map(async (text) => {
          const result = await pipeline(text, { pooling: "mean", normalize: true });
          return Array.from(result.data);
        })
      );
      
      embeddings.push(...batchEmbeddings);
    }
    
    return embeddings;
  } catch (error) {
    console.error("Embedding generation error:", error);
    throw new Error("Failed to generate embeddings");
  }
}
