import networkx as nx
import random
from typing import List, Dict, Any, Tuple
from .graph_service import graph_service

class IntelligenceService:
    def __init__(self, gs=graph_service):
        self.gs = gs

    def predict_links(self, top_n: int = 5) -> List[Dict[str, Any]]:
        """Predicts potential new links using the Jaccard Coefficient."""
        with self.gs.lock:
            if self.gs.G.number_of_nodes() < 2 or self.gs.G.is_directed():
                return []
            
            preds = nx.jaccard_coefficient(self.gs.G)
            sorted_preds = sorted(preds, key=lambda x: x[2], reverse=True)[:top_n]
            return [{"source": u, "target": v, "similarity": round(p, 4)} for u, v, p in sorted_preds]

    def simulate_influence_spread(self, seed_nodes: List[str], steps: int = 3) -> Dict[str, Any]:
        """Simulates information spread using an Independent Cascade Model (ICM)."""
        with self.gs.lock:
            G = self.gs.G
            active_nodes = set(seed_nodes)
            newly_active = set(seed_nodes)
            history = [list(seed_nodes)]
            
            for _ in range(steps):
                next_active = set()
                for node in newly_active:
                    if node not in G: continue
                    for neighbor in G.neighbors(node):
                        if neighbor not in active_nodes:
                            weight = G[node][neighbor].get('weight', 1)
                            prob = min(weight / 10.0, 0.5) 
                            if random.random() < prob:
                                next_active.add(neighbor)
                
                if not next_active:
                    break
                    
                active_nodes.update(next_active)
                newly_active = next_active
                history.append(list(active_nodes))
                
            return {
                "active_total": len(active_nodes),
                "steps": len(history) - 1,
                "history": history
            }

intelligence_service = IntelligenceService()
