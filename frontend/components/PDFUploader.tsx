import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { backendUrl } from "../config";

interface PDFUploaderProps {
  onSuccess?: () => void;
}

export function PDFUploader({ onSuccess }: PDFUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploaded(false);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Create form data with proper multipart format
      const formData = new FormData();
      formData.append("file", file);

      // Use the configured backend URL
      const response = await fetch(`${backendUrl}/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        let errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
        
        try {
          const errorText = await response.text();
          console.error("Error response:", errorText);
          
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch {
            if (errorText.length > 200) {
              errorMessage = errorText.substring(0, 200) + "...";
            } else {
              errorMessage = errorText || errorMessage;
            }
          }
        } catch {
          // Use default error message
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      setUploaded(true);
      toast({
        title: "Upload Successful",
        description: `Document processed into ${result.chunks} chunks for search.`,
      });

      setTimeout(() => {
        onSuccess?.();
      }, 1500);

    } catch (error) {
      console.error("Upload error:", error);
      setProgress(0);
      
      let errorMessage = "An error occurred while uploading the file. Please try again.";
      
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        errorMessage = "Cannot connect to the backend server. Please make sure the backend is running on port 4000.";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [toast, onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: uploading || uploaded,
  });

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
            ${uploading || uploaded ? "cursor-not-allowed opacity-50" : "hover:border-primary hover:bg-primary/5"}
          `}
        >
          <input {...getInputProps()} />
          
          {uploaded ? (
            <div className="space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <div>
                <h3 className="text-lg font-semibold text-green-700">Upload Complete!</h3>
                <p className="text-sm text-muted-foreground">
                  Your document has been processed and is ready for search.
                </p>
              </div>
            </div>
          ) : uploading ? (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Processing Document...</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Extracting text and generating embeddings
                </p>
                <Progress value={progress} className="w-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Upload PDF Document</h3>
                <p className="text-sm text-muted-foreground">
                  {isDragActive
                    ? "Drop the PDF file here..."
                    : "Drag and drop a PDF file here, or click to select"}
                </p>
              </div>
              <Button variant="outline" className="mt-4">
                <FileText className="mr-2 h-4 w-4" />
                Select PDF File
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
