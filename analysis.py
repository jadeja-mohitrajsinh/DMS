import networkx as nx

def get_degree_centrality(G):
    """Calculates degree centrality for each node."""
    return nx.degree_centrality(G)

def get_betweenness_centrality(G):
    """Calculates betweenness centrality for each node."""
    return nx.betweenness_centrality(G)

def get_closeness_centrality(G):
    """Calculates closeness centrality for each node."""
    return nx.closeness_centrality(G)

def get_shortest_path(G, source, target):
    """Returns the shortest path between source and target."""
    try:
        return nx.shortest_path(G, source=source, target=target)
    except nx.NetworkXNoPath:
        return None

def get_top_influencers(centrality_dict, top_n=3):
    """Returns the top N influencers based on a centrality dictionary."""
    return sorted(centrality_dict.items(), key=lambda x: x[1], reverse=True)[:top_n]
