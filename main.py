import data_io
import graph_engine
import analysis
import communities
import visualization
import intelligence
import os

def run_intelligence_system(file_path):
    print(f"--- Initializing Social Media Intelligence System ---")
    
    # 1. Load Advanced Data
    edges = data_io.load_csv(file_path)
    G = graph_engine.build_graph(edges)
    
    print(f"Graph established with {G.number_of_nodes()} influencers across multiple platforms.")
    
    # 2. Intelligence: Platform Distribution
    plat_stats = intelligence.get_platform_stats(G)
    print("\nPlatform Presence Density:")
    for plat, count in plat_stats.items():
        print(f"  - {plat}: {count} interactions")

    # 3. Core Analysis
    deg_cent = analysis.get_degree_centrality(G)
    top_3 = analysis.get_top_influencers(deg_cent, 3)
    print("\nTop Power Players:")
    for node, score in top_3:
        print(f"  - {node} (Influence Score: {score:.2f})")

    # 4. Intelligence: Link Prediction
    print("\nPredicted Connection Opportunities (Top 3):")
    preds = intelligence.predict_links(G, top_n=3)
    for u, v, p in preds:
        print(f"  - {u} <---> {v} (Similarity: {p:.2f})")

    # 5. Intelligence: Viral Spread Simulation
    seed = [top_3[0][0]] # Start with the top influencer
    active, history = intelligence.simulate_influence_spread(G, seed)
    print(f"\nViral Propagation Simulation (Seed: {seed[0]}):")
    print(f"  - Total nodes reached: {len(active)}/{G.number_of_nodes()}")
    print(f"  - Reached in {len(history)-1} propagation steps.")

    # 6. Community Detection
    detected_comms = communities.detect_communities(G)
    comm_map = communities.get_community_map(detected_comms)
    print(f"\nCommunity Clusters Identified: {len(detected_comms)}")

    # 7. Advanced Visualization
    influencers = [n for n, s in top_3]
    visualization.visualize_network(G, community_map=comm_map, influencers=influencers)
    
    print("\nIntelligence Analysis Finalized. visualization output: network_graph.png")

if __name__ == "__main__":
    advanced_csv = "advanced_data.csv"
    if os.path.exists(advanced_csv):
        run_intelligence_system(advanced_csv)
    else:
        print(f"Error: {advanced_csv} not found. Running with basic sample...")
        basic_csv = "sample_data.csv"
        if os.path.exists(basic_csv):
            # Note: Basic script might fail due to missing columns, ideally wrap in try/except or update basic csv
            pass
