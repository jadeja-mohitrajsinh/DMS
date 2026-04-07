import networkx as nx
import random

def predict_links(G, top_n=5):
    """
    Predicts potential new links using the Jaccard Coefficient.
    Works only for undirected graphs.
    """
    if G.is_directed():
        return []
        
    preds = nx.jaccard_coefficient(G)
    sorted_preds = sorted(preds, key=lambda x: x[2], reverse=True)
    return sorted_preds[:top_n]

def simulate_influence_spread(G, seed_nodes, steps=3):
    """
    Simulates information spread using an Independent Cascade Model (ICM).
    Probability of activation is based on edge weights.
    """
    active_nodes = set(seed_nodes)
    newly_active = set(seed_nodes)
    history = [set(seed_nodes)]
    
    for _ in range(steps):
        next_active = set()
        for node in newly_active:
            for neighbor in G.neighbors(node):
                if neighbor not in active_nodes:
                    # Probability = weight / max_weight_possible (assuming max 10 for sample)
                    weight = G[node][neighbor].get('weight', 1)
                    prob = min(weight / 10.0, 0.5) # Cap at 0.5 for stability
                    if random.random() < prob:
                        next_active.add(neighbor)
        
        if not next_active:
            break
            
        active_nodes.update(next_active)
        newly_active = next_active
        history.append(set(active_nodes))
        
    return active_nodes, history

def get_platform_stats(G):
    """Analyzes network distribution across platforms."""
    stats = {}
    for u, v, data in G.edges(data=True):
        platform = data.get('platform', 'Unknown')
        stats[platform] = stats.get(platform, 0) + 1
    return stats
