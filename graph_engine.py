import networkx as nx

def build_graph(edges, directed=False):
    """
    Converts a list of edge dictionaries into a NetworkX graph object.
    
    Args:
        edges (list): List of dictionaries with source, target, weight, platform.
        directed (bool): Whether the graph should be directed.
        
    Returns:
        nx.Graph or nx.DiGraph: The constructed graph object.
    """
    if directed:
        G = nx.DiGraph()
    else:
        G = nx.Graph()
    
    for edge in edges:
        G.add_edge(edge['source'], edge['target'], weight=edge['weight'], platform=edge['platform'])
    
    return G

def get_adjacency_list(G):
    """Returns the adjacency list representation of the graph."""
    return {node: list(neighbors) for node, neighbors in G.adjacency()}

def get_adjacency_matrix(G):
    """Returns the adjacency matrix representation of the graph."""
    return nx.to_numpy_array(G)
