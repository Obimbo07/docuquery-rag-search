import { pipeline } from "@huggingface/transformers";

let generationPipeline: any = null;

async function getGenerationPipeline() {
  if (!generationPipeline) {
    // Using a smaller model for local deployment
    // Users can switch to larger models like "microsoft/DialoGPT-medium" if they have more resources
    generationPipeline = await pipeline(
      "text-generation",
      "distilgpt2",
      { device: "cpu" }
    );
  }
  return generationPipeline;
}

export async function generateAnswer(query: string, context: string[]): Promise<string> {
  try {
    // For now, return a simple concatenated response
    // In production, you'd want to use a proper QA model or instruction-tuned model
    const contextText = context.join("\n\n");
    
    const prompt = `Based on the following context, answer the question: "${query}"\n\nContext:\n${contextText}\n\nAnswer:`;
    
    // Truncate prompt if too long
    const maxPromptLength = 1000;
    const truncatedPrompt = prompt.length > maxPromptLength 
      ? prompt.substring(0, maxPromptLength) + "..." 
      : prompt;

    const pipeline = await getGenerationPipeline();
    
    const result = await pipeline(truncatedPrompt, {
      max_new_tokens: 150,
      temperature: 0.7,
      do_sample: true,
    });
    
    // Extract the generated text after the prompt
    const generatedText = result[0].generated_text;
    const answerStart = generatedText.indexOf("Answer:") + 7;
    const answer = generatedText.substring(answerStart).trim();
    
    return answer || "I couldn't generate a specific answer based on the provided context.";
    
  } catch (error) {
    console.error("Answer generation error:", error);
    
    // Fallback: return a summary of the most relevant context
    const summary = context
      .slice(0, 3)
      .map((chunk, index) => `${index + 1}. ${chunk.substring(0, 200)}...`)
      .join("\n\n");
    
    return `Based on the retrieved documents, here are the most relevant excerpts:\n\n${summary}`;
  }
}
