import { useState } from "react";
import { Upload, FileText, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { PDFUploader } from "../components/PDFUploader";

export function HomePage() {
  const [showUploader, setShowUploader] = useState(false);

  const features = [
    {
      icon: Upload,
      title: "Upload PDFs",
      description: "Drag and drop PDF documents to extract and index their content for search."
    },
    {
      icon: Search,
      title: "Semantic Search",
      description: "Search using natural language queries powered by vector embeddings."
    },
    {
      icon: Zap,
      title: "AI-Powered Answers",
      description: "Get synthesized answers from your documents using local AI models."
    },
    {
      icon: FileText,
      title: "Document Management",
      description: "View and manage all your uploaded documents in one place."
    }
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          DocuQuery
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Open source Document RAG Search Engine. Upload PDFs, extract content, 
          and search using semantic AI-powered queries. Privacy-first and self-hosted.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => setShowUploader(true)} size="lg">
            <Upload className="mr-2 h-4 w-4" />
            Upload PDF
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/search">
              <Search className="mr-2 h-4 w-4" />
              Search Documents
            </Link>
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <Card key={index} className="text-center">
            <CardHeader>
              <feature.icon className="h-12 w-12 mx-auto text-primary mb-4" />
              <CardTitle className="text-lg">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{feature.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tech Stack */}
      <Card>
        <CardHeader>
          <CardTitle>Tech Stack</CardTitle>
          <CardDescription>
            Built with modern, open-source technologies for privacy and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Backend</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>Encore.ts</li>
                <li>TypeScript</li>
                <li>Node.js</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Frontend</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>React</li>
                <li>TypeScript</li>
                <li>TailwindCSS</li>
                <li>shadcn/ui</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Database</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>PostgreSQL</li>
                <li>PGVector</li>
                <li>Vector Search</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">AI/ML</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>Hugging Face</li>
                <li>Transformers</li>
                <li>MiniLM-L6-v2</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Upload PDF</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploader(false)}
              >
                ×
              </Button>
            </div>
            <PDFUploader onSuccess={() => setShowUploader(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
