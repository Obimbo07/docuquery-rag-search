# DocuQuery - Open Source Document RAG Search Engine

DocuQuery is a privacy-first, self-hosted Document Retrieval-Augmented Generation (RAG) search engine that allows you to upload PDFs, extract and embed their content, and perform semantic search with optional AI-powered synthesis.

## Features

- **PDF Upload & Processing**: Upload PDFs from a modern React interface
- **Text Extraction**: Extract text content from PDFs using pdf-parse
- **Text Chunking**: Intelligently chunk documents into searchable segments
- **Vector Embeddings**: Generate embeddings using Hugging Face's sentence-transformers
- **Vector Search**: Store and search embeddings using PostgreSQL with PGVector
- **Semantic Search**: Natural language query interface
- **AI Synthesis**: Optional LLM-powered answer generation from retrieved chunks

## Tech Stack

- **Backend**: Encore.ts (TypeScript)
- **Frontend**: React + TypeScript + TailwindCSS + shadcn/ui
- **Database**: PostgreSQL with PGVector extension
- **AI Models**: Hugging Face Transformers (sentence-transformers/all-MiniLM-L6-v2)
- **PDF Processing**: pdf-parse

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

## Local Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd docuquery
```

### 2. Start PostgreSQL with PGVector

```bash
docker-compose up -d
```

This will start a PostgreSQL instance with the PGVector extension enabled on port 5432.

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Database Migrations

The database migrations will be automatically applied when you start the backend.

### 5. Start the Application

```bash
# Start the backend and frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## API Endpoints

### Upload Document
```
POST /upload
Content-Type: multipart/form-data

Body: PDF file

Response: {
  "id": "doc-123",
  "filename": "document.pdf",
  "chunks": 15,
  "processed": true
}
```

### Search Documents
```
POST /search
Content-Type: application/json

Body: {
  "query": "What is machine learning?",
  "limit": 10
}

Response: {
  "results": [
    {
      "content": "Machine learning is...",
      "score": 0.95,
      "documentId": "doc-123",
      "filename": "ai-guide.pdf"
    }
  ]
}
```

### Generate Answer (Optional)
```
POST /generate
Content-Type: application/json

Body: {
  "query": "What is machine learning?",
  "context": ["chunk1", "chunk2", "chunk3"]
}

Response: {
  "answer": "Based on the documents, machine learning is..."
}
```

## Docker Deployment

### Build the Application

```bash
docker build -t docuquery .
```

### Run with Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Configuration

Environment variables can be configured in `.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/docuquery

# Hugging Face (optional, for private models)
HUGGINGFACE_API_KEY=your_key_here

# Server
PORT=4000
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  Encore.ts API  │    │  PostgreSQL +   │
│                 │───▶│                 │───▶│    PGVector     │
│ - Upload PDFs   │    │ - PDF Processing│    │                 │
│ - Search UI     │    │ - Embeddings    │    │ - Vector Store  │
│ - Results View  │    │ - Vector Search │    │ - Metadata      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │ Hugging Face    │
                       │ Transformers    │
                       │ - Embeddings    │
                       │ - LLM (Optional)│
                       └─────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Encore.ts](https://encore.dev) for the backend framework
- [Hugging Face](https://huggingface.co) for open source AI models
- [PGVector](https://github.com/pgvector/pgvector) for vector similarity search
- [shadcn/ui](https://ui.shadcn.com) for the UI components
