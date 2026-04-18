import networkx as nx
from typing import List, Dict, Any, Optional, Tuple
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
                "total_distance": round(total_distance, 4),
                "total_cost": round(total_distance, 4)
            }

    def _adjacency_matrix(self, nodes: List[str], weighted: bool = True) -> List[List[float]]:
        index = {n: i for i, n in enumerate(nodes)}
        size = len(nodes)
        matrix = [[0.0 for _ in range(size)] for _ in range(size)]
        for u, v, d in self.G.edges(data=True):
            if u not in index or v not in index:
                continue
            w = float(d.get('weight', 1.0)) if weighted else 1.0
            i = index[u]
            j = index[v]
            matrix[i][j] = w
            matrix[j][i] = w
        return matrix

    def _incidence_matrix(self, nodes: List[str], edges: List[Tuple[str, str]]) -> List[List[int]]:
        index = {n: i for i, n in enumerate(nodes)}
        matrix = [[0 for _ in range(len(edges))] for _ in range(len(nodes))]
        for e_idx, (u, v) in enumerate(edges):
            if u in index:
                matrix[index[u]][e_idx] = 1
            if v in index:
                matrix[index[v]][e_idx] = 1
        return matrix

    def _hamiltonian_backtrack(self, nodes: List[str], adj: Dict[str, List[str]], require_cycle: bool) -> Optional[List[str]]:
        if not nodes:
            return []
        start = nodes[0]
        path = [start]
        visited = {start}

        def dfs(current: str) -> Optional[List[str]]:
            if len(path) == len(nodes):
                if not require_cycle:
                    return list(path)
                if start in adj.get(current, []):
                    return list(path) + [start]
                return None
            for nxt in adj.get(current, []):
                if nxt in visited:
                    continue
                visited.add(nxt)
                path.append(nxt)
                result = dfs(nxt)
                if result:
                    return result
                path.pop()
                visited.remove(nxt)
            return None

        return dfs(start)

    def _hamiltonian_heuristic(self, nodes: List[str], adj: Dict[str, List[str]]) -> Optional[List[str]]:
        if not nodes:
            return []
        start = max(nodes, key=lambda n: len(adj.get(n, [])))
        path = [start]
        visited = {start}
        current = start
        while len(path) < len(nodes):
            choices = [n for n in adj.get(current, []) if n not in visited]
            if not choices:
                break
            next_node = max(choices, key=lambda n: len(adj.get(n, [])))
            visited.add(next_node)
            path.append(next_node)
            current = next_node
        if len(path) == len(nodes):
            return path
        return None

    def _mst_forest(self, algorithm: str = "kruskal") -> Dict[str, Any]:
        nodes = list(self.G.nodes())
        if not nodes:
            return {"edges": [], "total_cost": 0.0, "components": 0}
        forest_edges = []
        total = 0.0
        components = 0
        for comp in nx.connected_components(self.G):
            sub = self.G.subgraph(comp).copy()
            if sub.number_of_nodes() == 1:
                components += 1
                continue
            tree = nx.minimum_spanning_tree(sub, weight='weight', algorithm=algorithm)
            components += 1
            for u, v, d in tree.edges(data=True):
                w = float(d.get('weight', 1.0))
                forest_edges.append({"source": u, "target": v, "weight": w})
                total += w
        return {"edges": forest_edges, "total_cost": round(total, 4), "components": components}

    def get_graph_analysis(self) -> Dict[str, Any]:
        with self.lock:
            nodes = list(self.G.nodes())
            edges = list(self.G.edges(data=True))
            node_count = len(nodes)
            edge_count = len(edges)
            edge_pairs = [(u, v) for u, v, _ in edges]

            degree_map = {n: int(self.G.degree(n)) for n in nodes}
            degree_sequence = sorted(degree_map.values(), reverse=True)
            is_connected = node_count > 0 and nx.is_connected(self.G)
            components = [sorted(list(c)) for c in nx.connected_components(self.G)] if node_count > 0 else []

            cycle_basis = nx.cycle_basis(self.G) if node_count > 2 else []
            has_circuit = len(cycle_basis) > 0
            sample_circuit = cycle_basis[0] if cycle_basis else []

            odd_nodes = [n for n, d in degree_map.items() if d % 2 == 1]
            is_eulerian = node_count > 0 and nx.is_eulerian(self.G)
            has_eulerian_path = node_count > 0 and (len(odd_nodes) in (0, 2)) and nx.is_connected(self.G)

            adj = {n: list(self.G.neighbors(n)) for n in nodes}
            hamiltonian_path = None
            hamiltonian_cycle = None
            if node_count <= 10:
                hamiltonian_path = self._hamiltonian_backtrack(nodes, adj, require_cycle=False)
                hamiltonian_cycle = self._hamiltonian_backtrack(nodes, adj, require_cycle=True)
            else:
                hamiltonian_path = self._hamiltonian_heuristic(nodes, adj)

            spanning_tree_edges = []
            tree_props = {
                "is_tree": False,
                "edges": edge_count,
                "nodes": node_count,
                "acyclic": node_count > 0 and nx.is_forest(self.G),
                "connected": is_connected
            }
            if node_count > 0:
                tree_props["is_tree"] = tree_props["connected"] and tree_props["acyclic"] and edge_count == node_count - 1

            spanning_tree_info = {"edges": 0, "nodes": 0, "component_size": 0}
            if node_count > 0:
                largest = max(components, key=len) if components else []
                if largest:
                    tree = nx.bfs_tree(self.G.subgraph(largest), source=largest[0]).to_undirected()
                    spanning_tree_edges = [{"source": u, "target": v} for u, v in tree.edges()]
                    spanning_tree_info = {
                        "edges": tree.number_of_edges(),
                        "nodes": tree.number_of_nodes(),
                        "component_size": len(largest)
                    }

            components_analysis = []
            for idx, comp in enumerate(components):
                sub = self.G.subgraph(comp).copy()
                comp_nodes = sub.number_of_nodes()
                comp_edges = sub.number_of_edges()
                comp_connected = comp_nodes > 0 and nx.is_connected(sub)
                comp_acyclic = comp_nodes > 0 and nx.is_forest(sub)
                comp_cyclic = comp_nodes > 0 and not comp_acyclic
                comp_is_tree = comp_connected and comp_acyclic and comp_edges == comp_nodes - 1
                comp_odd_nodes = [n for n, d in sub.degree() if d % 2 == 1]
                comp_is_eulerian = comp_nodes > 0 and nx.is_eulerian(sub)
                comp_has_eulerian_path = comp_nodes > 0 and (len(comp_odd_nodes) in (0, 2)) and comp_connected
                components_analysis.append({
                    "id": idx + 1,
                    "nodes": sorted(list(comp)),
                    "node_count": comp_nodes,
                    "edge_count": comp_edges,
                    "connected": comp_connected,
                    "acyclic": comp_acyclic,
                    "cyclic": comp_cyclic,
                    "is_tree": comp_is_tree,
                    "is_eulerian": comp_is_eulerian,
                    "has_eulerian_path": comp_has_eulerian_path,
                    "odd_degree_nodes": comp_odd_nodes
                })

            mst_prim = self._mst_forest("prim")
            mst_kruskal = self._mst_forest("kruskal")

            adjacency_matrix = self._adjacency_matrix(nodes, weighted=True)
            incidence_matrix = self._incidence_matrix(nodes, edge_pairs)

            articulation_points = list(nx.articulation_points(self.G)) if node_count > 1 else []
            bridge_edges = [
                {"source": u, "target": v}
                for u, v in nx.bridges(self.G)
            ] if node_count > 1 else []

            adjacency_signature = "".join(
                "".join("1" if v > 0 else "0" for v in row)
                for row in adjacency_matrix
            )

            platform_set = {str(d.get('platform', 'Unknown')) for _, _, d in edges}
            platform_count = len(platform_set)
            heterogeneity = "homogeneous" if platform_count <= 1 else "heterogeneous"

            return {
                "fundamentals": {
                    "degree_map": degree_map,
                    "degree_sequence": degree_sequence,
                    "connected": is_connected,
                    "components": components,
                    "has_walk": is_connected,
                    "has_path": is_connected,
                    "has_circuit": has_circuit,
                    "sample_circuit": sample_circuit,
                    "heterogeneity": {
                        "type": heterogeneity,
                        "platforms": sorted(platform_set)
                    }
                },
                "components_analysis": components_analysis,
                "eulerian": {
                    "is_eulerian": is_eulerian,
                    "has_eulerian_path": has_eulerian_path,
                    "odd_degree_nodes": odd_nodes
                },
                "hamiltonian": {
                    "has_path": hamiltonian_path is not None,
                    "path": hamiltonian_path or [],
                    "has_cycle": hamiltonian_cycle is not None,
                    "cycle": hamiltonian_cycle or []
                },
                "trees": {
                    "spanning_tree_edges": spanning_tree_edges,
                    "spanning_tree_info": spanning_tree_info,
                    "properties": tree_props
                },
                "mst": {
                    "prim": mst_prim,
                    "kruskal": mst_kruskal
                },
                "matrices": {
                    "nodes": nodes,
                    "edges": edge_pairs,
                    "adjacency": adjacency_matrix,
                    "incidence": incidence_matrix
                },
                "connectivity": {
                    "articulation_points": articulation_points,
                    "bridge_edges": bridge_edges,
                    "cut_vertices": articulation_points,
                    "cut_edges": bridge_edges
                },
                "isomorphism": {
                    "degree_sequence": degree_sequence,
                    "adjacency_signature": adjacency_signature
                }
            }

# Global instance for shared state (or use FastAPI Dependency Injection)
graph_service = NetworkAnalysisService()
