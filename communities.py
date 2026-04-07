import networkx as nx
from networkx.algorithms import community

def detect_communities(G):
    """
    Detects communities in the graph using the Girvan-Newman method.
    Returns a list of sets, where each set is a community.
    """
    # Girvan-Newman is built into NetworkX
    communities_generator = community.girvan_newman(G)
    top_level_communities = next(communities_generator)
    return sorted(map(sorted, top_level_communities))

def get_community_map(communities):
    """Converts list of communities to a node-to-community ID mapping."""
    community_map = {}
    for i, comm in enumerate(communities):
        for node in comm:
            community_map[node] = i
    return community_map
