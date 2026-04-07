from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import random
import datetime
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

# --- Simulation Worker (Simulating Real-Time Stream) ---
async def data_stream_worker():
    """Background task to simulate streaming social media interactions using advanced_data.csv seed."""
    import pandas as pd
    import os
    
    # Try to load names/platforms from the CSV seed using absolute path
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    seed_csv = os.path.join(base_dir, "advanced_data.csv")
    
    names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry"]
    platforms = ["Twitter", "LinkedIn", "YouTube"]
    
    if os.path.exists(seed_csv):
        try:
            df = pd.read_csv(seed_csv)
            # Combine source and target lists to get a unique set of names
            names = [str(n) for n in list(set(df['source'].unique()) | set(df['target'].unique()))]
            platforms = [str(p) for p in list(df['platform'].unique())]
            
            # Initial Load: Add pre-existing edges to the graph
            for _, row in df.iterrows():
                graph_service.add_interaction(str(row['source']), str(row['target']), weight=row['weight'], platform=row['platform'])
            graph_service.update_communities()
            print(f"Loaded {len(df)} initial interactions from {seed_csv}")
        except Exception as e:
            print(f"Error loading seed data: {e}. Falling back to defaults.")
    else:
        print(f"Seed file not found at: {seed_csv}. Using defaults.")

    def group_key(name: str) -> str:
        parts = name.split('_', 1)
        if len(parts) > 1 and parts[0] in {"Bio", "Fin", "Media", "Hacker"}:
            return parts[0]
        return "Core"

    groups: Dict[str, List[str]] = {}
    for n in names:
        groups.setdefault(group_key(n), []).append(n)
    
    print(f"Real-time simulation pool: {len(names)} influencers, {len(platforms)} platforms.")
    while True:
        try:
            # Simulate an incoming interaction
            if random.random() < 0.85:
                group = random.choice([g for g in groups.values() if len(g) >= 2])
                source, target = random.sample(group, 2)
                weight = 0.8 + random.random() * 1.8
            else:
                g1, g2 = random.sample([g for g in groups.values() if len(g) >= 1], 2)
                source = random.choice(g1)
                target = random.choice(g2)
                weight = 0.4 + random.random() * 0.8
            platform = random.choice(platforms)
            
            # Update the graph service
            graph_service.add_interaction(source, target, weight=weight, platform=platform)
            
            # Periodically update analysis
            if random.random() < 0.3: # 30% chance to refresh communities each update
                graph_service.update_communities()
            
            # Signal to all connected clients
            msg = {
                "type": "NEW_INTERACTION",
                "data": {
                    "source": source,
                    "target": target,
                    "platform": platform,
                    "timestamp": datetime.datetime.now().isoformat()
                },
                "stats": {
                    "nodes": graph_service.G.number_of_nodes(),
                    "edges": graph_service.G.number_of_edges()
                }
            }
            await manager.broadcast(msg)
            
            await asyncio.sleep(4) # Stream every 4 seconds for visual stability
        except Exception as e:
            print(f"Worker Error: {e}")
            await asyncio.sleep(5)

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
