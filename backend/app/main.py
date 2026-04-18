from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from typing import List, Dict, Any, Optional

from .services.graph_service import graph_service
from .services.intelligence_service import intelligence_service

app = FastAPI(title="DMS Real-Time Social Analytics", version="2.0.0")

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WebSocket Management ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Remove stale connections if needed
                pass

manager = ConnectionManager()

# --- Seed Loader (One-Time Load from CSV) ---
async def data_stream_worker():
    """Loads interactions from advanced_data.csv only (no live simulation)."""
    import os

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    seed_csv = os.path.join(base_dir, "advanced_data.csv")

    if not os.path.exists(seed_csv):
        print(f"Seed file not found at: {seed_csv}")
        return

    edges = []
    try:
        with open(seed_csv, "r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                parts = [p.strip() for p in line.split(",")]
                if len(parts) < 4:
                    continue
                source, target, weight_text, platform = parts[:4]
                try:
                    weight = float(weight_text)
                except ValueError:
                    continue
                edges.append((source, target, weight, platform))
    except Exception as e:
        print(f"Error reading seed data: {e}")
        return

    if not edges:
        print("Seed file contains no valid interactions.")
        return

    for source, target, weight, platform in edges:
        graph_service.add_interaction(source, target, weight=weight, platform=platform)
    graph_service.update_communities()
    print(f"Loaded {len(edges)} interactions from {seed_csv}")

@app.on_event("startup")
async def startup_event():
    # Run the worker in the background
    asyncio.create_task(data_stream_worker())

# --- REST Endpoints ---

@app.get("/graph")
async def get_graph():
    return graph_service.get_graph_data()

@app.get("/influencers")
async def get_influencers(n: int = 5):
    return graph_service.get_top_influencers(n)

@app.get("/bridges")
async def get_bridges(n: int = 3):
    return graph_service.get_top_bridges(n)

@app.get("/pulse")
async def get_pulse():
    return graph_service.get_pulse_metrics()

@app.get("/network-summary")
async def get_network_summary():
    return graph_service.get_network_summary()

@app.get("/analysis")
async def get_analysis():
    return graph_service.get_graph_analysis()

@app.get("/predict-links")
async def predict():
    return intelligence_service.predict_links(top_n=5)

@app.get("/simulate/{seed_node}")
async def simulate_viral_spread(seed_node: str):
    try:
        return intelligence_service.simulate_influence_spread([seed_node])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/path")
async def get_path(source: str, target: str):
    try:
        return graph_service.get_path_between(source, target)
    except ValueError as e:
        if str(e) == "source_or_target_missing":
            raise HTTPException(status_code=404, detail="Source or target not found")
        if str(e) == "no_path":
            raise HTTPException(status_code=404, detail="No path between nodes")
        raise HTTPException(status_code=400, detail="Invalid request")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send current graph state on first connection
        await websocket.send_json({
            "type": "INIT",
            "data": graph_service.get_graph_data()
        })
        while True:
            # Just keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
