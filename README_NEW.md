# DMS Real-Time Social Network Analysis System (v2.0)

This project has been transformed from a batch processing script into a modern, real-time streaming analytics platform.

## 🏗️ New Architecture

- **Backend**: FastAPI (Python 3.10+)
- **Analysis Engine**: NetworkX (Incremental Graph Updates)
- **Streaming**: Simulated Background Worker (extensible to Kafka/Redis)
- **Frontend**: React 18, D3.js, Tailwind CSS, Framer Motion
- **Communication**: WebSockets for live graph updates

## 📂 Project Structure

```text
/backend
  /app
    /services
      - graph_service.py        # Refactored: Incremental graph logic
      - intelligence_service.py # Refactored: Real-time simulation/predictions
    - main.py                  # FastAPI + WebSocket + Stream Worker
  - requirements.txt
/frontend
  /src
    - App.jsx                  # Main Real-Time Dashboard
    - NetworkGraph.jsx         # D3.js Dynamic Force Graph
    - main.jsx
  - vite.config.js
- run_system.py                 # Multi-process launcher (Simulated)
```

## 🚀 Getting Started

### 1. Backend Setup
1. Navigate to `backend/`
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the FastAPI server:
   ```bash
   python -m app.main
   ```
   *The server will start at http://localhost:8000 and the simulation worker will begin streaming interactions.*

### 2. Frontend Setup
1. Navigate to `frontend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *Visit http://localhost:3000 to see the dashboard.*

## ⚡ Features

1. **Live Interaction Feed**: Watch as influencers across Twitter, LinkedIn, and YouTube interact in real-time.
2. **Dynamic Force Graph**: Nodes and edges appear and animate live without page refreshes.
3. **On-Demand Viral Simulation**: Click any node on the graph to trigger the Independent Cascade Model (ICM).
4. **Real-Time Analytics**: Top influencers and recommended leads update as the network evolves.

---
*Developed for DMS Social Intelligence Platform.*
