import { useState, useEffect } from "react";
import { FileText, Upload, Calendar, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { PDFUploader } from "../components/PDFUploader";
import backend from "~backend/client";
import type { Document } from "~backend/documents/types";

export function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const { toast } = useToast();

  const loadDocuments = async () => {
    try {
      const response = await backend.documents.list();
      setDocuments(response.documents);
    } catch (error) {
      console.error("Failed to load documents:", error);
      toast({
        title: "Error",
        description: "Failed to load documents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleUploadSuccess = () => {
    setShowUploader(false);
    loadDocuments();
    toast({
      title: "Success",
      description: "Document uploaded and processed successfully!",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Database className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Manage your uploaded PDF documents
          </p>
        </div>
        <Button onClick={() => setShowUploader(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload PDF
        </Button>
      </div>

      {/* Documents Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chunks</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.reduce((sum, doc) => sum + doc.chunkCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(documents.reduce((sum, doc) => sum + doc.fileSize, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No Documents Yet</CardTitle>
            <CardDescription className="mb-4">
              Upload your first PDF document to get started with semantic search.
            </CardDescription>
            <Button onClick={() => setShowUploader(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload PDF
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => (
            <Card key={document.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {document.filename}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(document.uploadDate)}
                      </span>
                      <span>{formatFileSize(document.fileSize)}</span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {document.chunkCount} chunks
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {document.content.substring(0, 200)}...
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
            <PDFUploader onSuccess={handleUploadSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}
