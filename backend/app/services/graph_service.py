import networkx as nx
import pandas as pd
from typing import List, Dict, Any, Optional
import datetime
import threading

class NetworkAnalysisService:
    def __init__(self):
        self.G = nx.Graph()
        self.lock = threading.Lock()
        self.last_update = datetime.datetime.now()
        self.communities = []
        self._community_map = {}
        self.pulse_count = 0
        self.last_pulse_reset = datetime.datetime.now()
        self.historical_velocity = [] # Store [timestamp, count]

    def add_interaction(self, source: str, target: str, weight: float = 1.0, platform: str = "Unknown"):
        """Incrementally adds/updates an interaction in the real-time graph."""
        with self.lock:
            if self.G.has_edge(source, target):
                # Update existing edge
                self.G[source][target]['weight'] += weight
                self.G[source][target]['platform'] = platform # Most recent platform
            else:
                self.G.add_edge(source, target, weight=weight, platform=platform)
            
            self.pulse_count += 1
            self.last_update = datetime.datetime.now()
            
            # Update velocity history if 5 seconds passed
            now = datetime.datetime.now()
            if (now - self.last_pulse_reset).total_seconds() > 5:
                self.historical_velocity.append({"time": now.isoformat(), "count": self.pulse_count})
                self.historical_velocity = self.historical_velocity[-20:] # Keep last 20
                self.pulse_count = 0
                self.last_pulse_reset = now

    def get_graph_data(self) -> Dict[str, Any]:
        """Returns nodes and edges for D3.js visualization."""
        with self.lock:
            bridge_nodes = set()
            bridge_scores = {}
            if self.G.number_of_nodes() >= 3:
                try:
                    centrality = nx.betweenness_centrality(self.G, weight='weight', normalized=True)
                    bridge_scores = {k: round(v, 4) for k, v in centrality.items()}
                    ranked = sorted(centrality.items(), key=lambda x: x[1], reverse=True)
                    min_count = max(3, int(len(ranked) * 0.15))
                    bridge_nodes = {n for n, _ in ranked[:min_count] if _ > 0}
                except Exception:
                    bridge_nodes = set()
                    bridge_scores = {}
            nodes = []
            for n in self.G.nodes():
                # Add metadata like centrality to nodes if we want live sizing
                nodes.append({
                    "id": n, 
                    "community": self._community_map.get(n, 0),
                    "is_bridge": n in bridge_nodes,
                    "bridge_score": bridge_scores.get(n, 0)
                })
            
            edges = []
            for u, v, d in self.G.edges(data=True):
                edges.append({
                    "source": u,
                    "target": v,
                    "weight": d.get('weight', 1.0),
                    "platform": d.get('platform', 'Unknown')
                })
            
            return {"nodes": nodes, "links": edges}

    def get_top_influencers(self, top_n: int = 5) -> List[Dict[str, Any]]:
        """Calculates degree centrality on the current graph."""
        with self.lock:
            if self.G.number_of_nodes() < 2:
                return []
            centrality = nx.degree_centrality(self.G)
            sorted_items = sorted(centrality.items(), key=lambda x: x[1], reverse=True)[:top_n]
            return [{"node": k, "score": round(v, 4)} for k, v in sorted_items]

    def get_top_bridges(self, top_n: int = 3) -> List[Dict[str, Any]]:
        """Calculates betweenness centrality to find 'Bridge' nodes connecting communities."""
        with self.lock:
            if self.G.number_of_nodes() < 3:
                return []
            try:
                # Betweenness is expensive; for "real-time" we might want to sample 
                # or use a faster approximation, but NetworkX default is fine for small/medium graphs.
                centrality = nx.betweenness_centrality(self.G, weight='weight', normalized=True)
                sorted_items = sorted(centrality.items(), key=lambda x: x[1], reverse=True)[:top_n]
                return [{"node": k, "score": round(v, 4)} for k, v in sorted_items]
            except Exception:
                return []

    def get_pulse_metrics(self) -> Dict[str, Any]:
        return {
            "velocity": self.historical_velocity,
            "current_load": self.pulse_count
        }

    def update_communities(self):
        """Recomputes communities using a modularity-based method with fallbacks."""
        from networkx.algorithms import community
        with self.lock:
            if self.G.number_of_nodes() < 2:
                return
            try:
                weight_threshold = 3.0
                H = self.G.copy()
                for u, v, d in list(H.edges(data=True)):
                    if d.get('weight', 0) < weight_threshold:
                        H.remove_edge(u, v)

                degree = dict(H.degree())
                hub_degree = max(6, int(len(H.nodes()) * 0.15))
                for u, v, d in H.edges(data=True):
                    if degree.get(u, 0) >= hub_degree or degree.get(v, 0) >= hub_degree:
                        d['weight'] = max(0.1, d.get('weight', 1.0) * 0.45)

                comms = None
                try:
                    # Louvain provides high-quality modularity clusters when available.
                    comms = community.louvain_communities(H, weight='weight', seed=42)
                except Exception:
                    comms = None
                if not comms:
                    comms = community.greedy_modularity_communities(H, weight='weight')
                self.communities = sorted(map(sorted, comms))
                if len(self.communities) < 2:
                    communities_generator = community.girvan_newman(H)
                    top_level_communities = next(communities_generator)
                    self.communities = sorted(map(sorted, top_level_communities))
                
                # Update map for fast lookup
                self._community_map = {}
                for i, comm in enumerate(self.communities):
                    for node in comm:
                        self._community_map[node] = i
            except Exception as e:
                print(f"Error computing communities: {e}")

    def get_community_stats(self) -> Dict[str, int]:
        return {"total_communities": len(self.communities)}

    def get_network_summary(self, top_edges: int = 5) -> Dict[str, Any]:
        with self.lock:
            node_count = self.G.number_of_nodes()
            edge_count = self.G.number_of_edges()

            density = nx.density(self.G) if node_count > 1 else 0.0
            avg_degree = (2 * edge_count / node_count) if node_count > 0 else 0.0
            avg_clustering = 0.0
            if node_count > 1:
                try:
                    avg_clustering = nx.average_clustering(self.G, weight='weight')
                except Exception:
                    avg_clustering = 0.0

            components = list(nx.connected_components(self.G)) if node_count > 0 else []
            component_count = len(components)
            largest_component_size = max((len(c) for c in components), default=0)
            largest_component_ratio = (largest_component_size / node_count) if node_count > 0 else 0.0

            avg_shortest_path = None
            weighted_avg_shortest_path = None
            diameter = None
            if largest_component_size > 1:
                try:
                    H = self.G.subgraph(max(components, key=len)).copy()
                    for u, v, d in H.edges(data=True):
                        weight = d.get('weight', 1.0)
                        d['distance'] = 1.0 / max(weight, 0.01)
                    avg_shortest_path = nx.average_shortest_path_length(H)
                    weighted_avg_shortest_path = nx.average_shortest_path_length(H, weight='distance')
                    diameter = nx.diameter(H)
                except Exception:
                    avg_shortest_path = None
                    weighted_avg_shortest_path = None
                    diameter = None

            bridges_count = 0
            if node_count > 1 and edge_count > 0:
                try:
                    bridges_count = len(list(nx.bridges(self.G)))
                except Exception:
                    bridges_count = 0

            strongest = sorted(
                (
                    {
                        "source": u,
                        "target": v,
                        "weight": d.get('weight', 1.0),
                        "platform": d.get('platform', 'Unknown')
                    }
                    for u, v, d in self.G.edges(data=True)
                ),
                key=lambda x: x["weight"],
                reverse=True
            )[:top_edges]

            return {
                "nodes": node_count,
                "edges": edge_count,
                "density": round(density, 4),
                "avg_degree": round(avg_degree, 4),
                "avg_clustering": round(avg_clustering, 4),
                "components": component_count,
                "largest_component_ratio": round(largest_component_ratio, 4),
                "bridges": bridges_count,
                "avg_shortest_path": round(avg_shortest_path, 4) if avg_shortest_path is not None else None,
                "weighted_avg_shortest_path": round(weighted_avg_shortest_path, 4) if weighted_avg_shortest_path is not None else None,
                "diameter": diameter,
                "strongest_connections": strongest
            }

    def get_path_between(self, source: str, target: str) -> Dict[str, Any]:
        with self.lock:
            if source not in self.G or target not in self.G:
                raise ValueError("source_or_target_missing")

            if source == target:
                return {
                    "source": source,
                    "target": target,
                    "path": [source],
                    "hops": 0,
                    "total_strength": 0,
                    "total_distance": 0
                }

            H = self.G.copy()
            for u, v, d in H.edges(data=True):
                weight = d.get('weight', 1.0)
                d['distance'] = 1.0 / max(weight, 0.01)

            try:
                path = nx.shortest_path(H, source=source, target=target, weight='distance')
            except nx.NetworkXNoPath:
                raise ValueError("no_path")

            total_strength = 0.0
            total_distance = 0.0
            edges = []
            for i in range(len(path) - 1):
                u = path[i]
                v = path[i + 1]
                data = self.G.get_edge_data(u, v, default={})
                weight = data.get('weight', 1.0)
                distance = 1.0 / max(weight, 0.01)
                total_strength += weight
                total_distance += distance
                edges.append({
                    "source": u,
                    "target": v,
                    "weight": weight,
                    "platform": data.get('platform', 'Unknown')
                })

            return {
                "source": source,
                "target": target,
                "path": path,
                "edges": edges,
                "hops": max(0, len(path) - 1),
                "total_strength": round(total_strength, 4),
                "total_distance": round(total_distance, 4)
            }

# Global instance for shared state (or use FastAPI Dependency Injection)
graph_service = NetworkAnalysisService()
