import { useState } from "react";
import { Search, Loader2, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import backend from "~backend/client";
import type { SearchResult } from "~backend/documents/types";

interface GeneratedAnswer {
  answer: string;
  sources: string[];
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [generatedAnswer, setGeneratedAnswer] = useState<GeneratedAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResults([]);
    setGeneratedAnswer(null);

    try {
      const response = await backend.documents.search({
        query: query.trim(),
        limit: 10,
      });

      setResults(response.results);

      if (response.results.length === 0) {
        toast({
          title: "No Results",
          description: "No documents found matching your query. Try different keywords.",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search Failed",
        description: "An error occurred while searching. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAnswer = async () => {
    if (results.length === 0) {
      toast({
        title: "Error",
        description: "No search results available to generate an answer",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);

    try {
      const context = results.slice(0, 5).map(result => result.content);
      
      const response = await backend.documents.generate({
        query: query.trim(),
        context,
      });

      setGeneratedAnswer(response);
    } catch (error) {
      console.error("Generate error:", error);
      toast({
        title: "Generation Failed",
        description: "An error occurred while generating the answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Search Documents</h1>
        <p className="text-muted-foreground">
          Search through your uploaded documents using natural language queries
        </p>
      </div>

      {/* Search Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question about your documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-lg"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Answer */}
      {results.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Generated Answer
              </CardTitle>
              <Button
                onClick={handleGenerateAnswer}
                disabled={generating}
                variant="outline"
                size="sm"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Answer
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {generatedAnswer && (
            <CardContent>
              <p className="text-sm leading-relaxed">{generatedAnswer.answer}</p>
            </CardContent>
          )}
        </Card>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Search Results ({results.length})
            </h2>
          </div>

          <div className="space-y-4">
            {results.map((result, index) => (
              <Card key={result.chunkId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{result.filename}</CardTitle>
                    </div>
                    <Badge variant="secondary">
                      {(result.score * 100).toFixed(1)}% match
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {result.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && query && (
        <Card className="text-center py-12">
          <CardContent>
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No Results Found</CardTitle>
            <CardDescription>
              Try different keywords or make sure you have uploaded some documents first.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
