# DMS

AI-powered Document Management System (DMS) with a FastAPI backend and a React (Vite) frontend. It ingests document data, builds a graph using NetworkX, and visualizes relationships with D3.js.

## Project Structure

```
backend/
  app/
    services/
  main.py
  requirements.txt
frontend/
  src/
  index.html
```

## Prerequisites

- Python 3.10+
- Node.js 18+

## Backend Setup

1. Open a terminal in `backend/`.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start the API server:

```bash
python -m app.main
```

The server starts at http://localhost:8000.

## Frontend Setup

1. Open a terminal in `frontend/`.
2. Install dependencies:

```bash
npm install
```

3. Start the dev server:

```bash
npm run dev
```

The app runs at http://localhost:3000.

## Notes

- If the frontend cannot reach the backend, verify both are running and that the backend is on port 8000.
- The graph data is streamed from the backend and rendered in the NetworkGraph view.

