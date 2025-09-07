import { pipeline } from "@huggingface/transformers";

let embeddingPipeline: any = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    try {
      embeddingPipeline = await pipeline(
        "feature-extraction",
        "sentence-transformers/all-MiniLM-L6-v2",
        { device: "cpu" }
      );
      console.log("Embedding pipeline initialized successfully");
    } catch (error) {
      console.error("Failed to initialize embedding pipeline:", error);
      throw error;
    }
  }
  return embeddingPipeline;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    console.log(`Generating embeddings for ${texts.length} texts`);
    const pipeline = await getEmbeddingPipeline();
    
    const embeddings: number[][] = [];
    
    // Process texts in batches to avoid memory issues
    const batchSize = 5; // Reduced batch size for better reliability
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);
      
      const batchEmbeddings = await Promise.all(
        batch.map(async (text) => {
          try {
            const result = await pipeline(text, { pooling: "mean", normalize: true });
            return Array.from(result.data);
          } catch (error) {
            console.error("Error processing text chunk:", error);
            // Return a zero vector as fallback
            return new Array(384).fill(0);
          }
        })
      );
      
      embeddings.push(...batchEmbeddings);
    }
    
    console.log(`Successfully generated ${embeddings.length} embeddings`);
    return embeddings;
  } catch (error) {
    console.error("Embedding generation error:", error);
    throw new Error("Failed to generate embeddings");
  }
}
