import { api, APIError } from "encore.dev/api";
import { generateAnswer } from "./utils/llm";
import type { GenerateResponse } from "./types";

interface GenerateRequest {
  query: string;
  context: string[];
}

// Generates an AI-powered answer based on the query and retrieved context.
export const generate = api<GenerateRequest, GenerateResponse>(
  { expose: true, method: "POST", path: "/generate" },
  async ({ query, context }) => {
    try {
      if (!query.trim()) {
        throw APIError.invalidArgument("Query cannot be empty");
      }

      if (!context || context.length === 0) {
        throw APIError.invalidArgument("Context cannot be empty");
      }

      // Generate answer using the LLM
      const answer = await generateAnswer(query, context);

      return {
        answer,
        sources: context
      };

    } catch (error) {
      console.error("Generate error:", error);
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to generate answer", error);
    }
  }
);
