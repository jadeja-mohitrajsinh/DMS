import matplotlib.pyplot as plt
import networkx as nx
from networkx.algorithms import community

def visualize_network(G, community_map=None, influencers=None, output_file="network_graph.png"):
    """
    Visualizes the advance network graph.
    """
    plt.figure(figsize=(15, 12))
    pos = nx.spring_layout(G, k=0.5, iterations=120, weight='weight', seed=42)
    
    # Platform-based colors for edges
    platform_colors = {
        'Twitter': '#1DA1F2',
        'LinkedIn': '#0077B5',
        'YouTube': '#FF0000',
        'Unknown': '#CCCCCC'
    }
    
    # Draw edges with varying weights
    for platform, color in platform_colors.items():
        edges = [(u, v) for u, v, d in G.edges(data=True) if d.get('platform') == platform]
        weights = [max(0.5, G[u][v].get('weight', 1.0) * 0.6) for u, v in edges]
        nx.draw_networkx_edges(G, pos, edgelist=edges, edge_color=color, width=weights, alpha=0.5, label=platform)

    if not community_map:
        try:
            comms = community.greedy_modularity_communities(G, weight='weight')
            community_map = {}
            for i, comm in enumerate(comms):
                for node in comm:
                    community_map[node] = i
        except Exception:
            community_map = {}

    # Node colors based on communities
    if community_map:
        node_colors = [community_map.get(node, 0) for node in G.nodes()]
        cmap = plt.cm.get_cmap('Set3')
    else:
        node_colors = '#A0CBE8'
        cmap = None

    # Draw nodes
    nx.draw_networkx_nodes(G, pos, node_color=node_colors, cmap=cmap, node_size=800, alpha=0.9, edgecolors='white')
    
    # Highlight influencers
    if influencers:
        nx.draw_networkx_nodes(G, pos, nodelist=influencers, node_color='gold', node_size=1100, edgecolors='black', linewidths=2)
    
    # Draw labels
    nx.draw_networkx_labels(G, pos, font_size=11, font_family='sans-serif', font_weight='bold')
    
    plt.title("Social Media Intelligence - Platform Interaction Map", fontsize=20, pad=20)
    plt.legend(scatterpoints=1)
    plt.axis('off')
    plt.tight_layout()
    plt.savefig(output_file, dpi=300)
    print(f"Advanced visualization saved to {output_file}")
    plt.close()
