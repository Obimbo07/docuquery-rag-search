import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "./components/Navigation";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { DocumentsPage } from "./pages/DocumentsPage";

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Router>
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
          </Routes>
        </main>
        <Toaster />
      </Router>
    </div>
  );
}
