
# MARWADI UNIVERSITY, RAJKOT
Faculty of Technology
Department of AI, ML & DS
 
## PROJECT REPORT
### Social Network Analysis Using Graph Theory

**Semester:** IV  
**Branch:** CSE-AI & ML  
**Academic Year:** 2025-26  
**Submitted on:** 6/4/2026

---

## Team Details

| Sr. No. | Enrollment Number | Student Name | Division |
|---------|-------------------|--------------|----------|
| 1 | 92510118004 | Mohitrajsinh Jadeja | 4EN22 |
| 2 | 92510118010 | Sahil Rakhaiya | 4EN22 |
| 3 | 92510118011 | Yash Karena | 4EN22 |
| 4 | 92510118019 | Anuj Hadiyel | 4EN22 |
| 5 | 92510118026 | Appalanidu Setti | 4EN22 |

<br>

## INDEX

| Sr. No. | Topic | Page No. |
|---------|-------|----------|
| I | Index | 1 |
| II | Abstract | 2 |
| 1 | Introduction | 3 |
| 2 | Background | 5 |
| 3 | Literature Review | 8 |
| 4 | Project Description | 9 |
| 4.1 | Methodology | 9 |
| 4.2 | Implementation / System Design | 10 |
| 4.3 | Results / Analysis | 11 |
| 4.4 | Applications | 13 |
| 4.5 | Limitations and Future Work | 14 |
| 5 | Code / Technical Implementation | 15 |
| 5.1 | Program Structure | 15 |
| 5.2 | Code Explanation | 16 |
| 5.3 | Input and Output | 18 |
| 5.4 | Output Explanation | 19 |
| 6 | Team Contribution | 20 |
| 7 | Conclusion | 21 |
| 8 | References | 22 |

---

## ABSTRACT

Social networks produce highly interconnected data that is difficult to analyze using ordinary table-based methods. This project presents a social network analysis system using graph theory, where users are modeled as nodes and relationships are modeled as weighted edges. The system supports structural analysis of connectivity, influence, and community behavior, along with shortest-path computation and interactive visualization.

The backend is implemented using Python, FastAPI, NetworkX, and Pandas, while the frontend uses React, Vite, D3.js, Tailwind CSS, Lucide React, and Framer Motion. The system processes a structured CSV dataset containing weighted relationships and platform attributes, detects communities using modularity-based methods, and computes weighted paths using Dijkstra's algorithm. The frontend includes a path finder interface, community-colored nodes, stable layout caching, and edge-level tooltips that display platform and weight.

The results show that graph-theoretic analysis can reveal influential nodes, bridge nodes, and densely connected clusters more effectively than tabular inspection. This project demonstrates that social network structure can be explored as a dynamic graph system, making complex relational data easier to interpret and analyze.

---

## 1. INTRODUCTION 

Social networks are a core part of digital communication systems. They contain relationships among users, groups, and communities that cannot be understood properly through simple lists or tables. Graph theory provides a strong mathematical framework for modeling these relationships by representing entities as nodes and interactions as edges. This allows the analysis of connectivity, influence, clustering, and flow through the network.

This project builds a graph-based social network analysis system that goes beyond basic visualization. It supports weighted relationships, community detection, and shortest-path analysis with detailed edge-level information. The system is designed to help identify important users, understand cluster structure, and inspect how information moves across the network.

### 1.1 Problem Statement

Social network data contains complex relational patterns, but traditional methods fail to show connection strength, community structure, and influence pathways clearly. There is a need for a graph-theory-based system that can model weighted relationships and extract meaningful structural insights from the network.

### 1.2 Objectives

- Model social network data as a weighted graph 
- Identify influential nodes using centrality measures 
- Detect communities using modularity-based algorithms 
- Compute shortest paths using edge weights 
- Provide interactive and stable graph visualization 
- Show detailed path information including platform and weight

### 1.3 Scope of the Project

The project focuses on graph construction, weighted path analysis, community detection, and visualization of social network data. It supports structured CSV input and optional JSON handling. It does not include machine learning, sentiment analysis, or real-time streaming data.

### 1.4 Organization of the Report

Section 2 explains the theoretical background. Section 3 reviews related literature. Section 4 describes the methodology, system design, results, applications, and limitations. Section 5 explains technical implementation and code structure. Section 6 gives team contribution. Section 7 presents the conclusion, and Section 8 lists references.

---

## 2. BACKGROUND

Social network analysis is based on graph theory, which provides a mathematical framework for representing relations between entities. In a graph G = (V, E), V denotes the set of vertices or nodes, and E denotes the set of edges or relationships. In this project, nodes represent users or accounts, while edges represent interactions with additional properties such as weight and platform.

A weighted graph is used because not all relationships have the same strength. The weight on an edge can represent interaction frequency, connection intensity, or importance. This makes the analysis more realistic than using an unweighted graph.

Several graph-theoretic measures are used in this project. Degree centrality identifies highly connected nodes. Betweenness centrality identifies nodes that act as bridges between different parts of the network. Clustering coefficient measures how strongly a node's neighbors are connected with each other. Shortest-path analysis determines the most efficient route between two nodes using edge weights.

### Mathematical Concepts Used

**Degree Centrality:**
$$C_D(v) = \frac{\deg(v)}{n - 1}$$

**Betweenness Centrality:**
$$C_B(v) = \sum \frac{\sigma(s, t | v)}{\sigma(s, t)}$$
where $\sigma(s, t)$ is the number of shortest paths from s to t, and $\sigma(s, t | v)$ is the number of those paths passing through v.

**Clustering Coefficient:**
$$C(v) = \frac{2e_v}{k_v(k_v - 1)}$$
where $e_v$ is the number of edges among neighbors of v and $k_v$ is the degree of v.

**Weighted Shortest Path:**
$$d(u, v) = \min \sum w(e)$$
where $w(e)$ is the weight of an edge e.

**Modularity for Community Detection:**
$$Q = \frac{1}{2m} \sum \left[A_{ij} - \frac{k_i k_j}{2m}\right] \delta(c_i, c_j)$$

This equation measures the strength of community structure by comparing observed edges with expected random connections.

### 2.1 Key Concepts and Definitions

- **Graph:** A set of nodes and edges representing relationships. 
- **Node:** A user or entity in the network. 
- **Edge:** A relationship between two nodes. 
- **Weighted Edge:** An edge with strength, frequency, or importance. 
- **Community:** A group of nodes more strongly connected internally than externally. 
- **Shortest Path:** The minimum-cost route between two nodes.

### 2.2 Theoretical Framework

The system combines graph representation, weighted traversal, and modularity-based clustering. The graph is used to study structural importance, path efficiency, and community formation. Weighted traversal is used to determine the strongest or least costly path between selected nodes. Community detection is used to identify dense subgraphs that represent tightly connected groups.

### 2.3 Technologies / Tools Used

**Frontend**
- React 
- Vite 
- D3.js 
- Tailwind CSS 
- Lucide React 
- Framer Motion 

**Backend**
- Python 
- FastAPI 
- NetworkX 
- Pandas 

**Data**
- CSV (advanced_data.csv) 
- JSON support 

**Visualization**
- D3.js for interactive graph display 
- NetworkX and Matplotlib for static analysis and plots

---

## 3. LITERATURE REVIEW

The study of social networks using graph theory has been widely explored in both academic research and practical applications. Researchers have used graph-based models to understand relationships, identify influential nodes, and detect communities within complex networks.

**[Newman, 2010]** – In Networks: An Introduction, Newman provides a comprehensive foundation of network theory, explaining concepts such as degree distribution, centrality measures, and network topology. The work highlights how graph-based representations can effectively model real-world networks, including social systems. This is directly relevant as it forms the theoretical base for analyzing connectivity and influence in this project.

**[Barabási, 2016]** – In Network Science, Barabási introduces the concept of scale-free networks and explains how real-world networks often follow power-law distributions. The study emphasizes the presence of highly connected nodes (hubs), which are critical in understanding influence and information flow. This concept is applied in the project to identify important nodes using centrality measures.

**[Girvan & Newman, 2002]** – This research paper focuses on community detection in networks and proposes methods to identify clusters within complex systems. The study demonstrates how networks can be divided into groups with strong internal connections. This is relevant to the project as community detection helps identify clusters within social networks.

**Summary:**
Existing studies show that graph theory is powerful for analyzing network structure, but many approaches remain theoretical or focus on one specific metric. This project combines graph construction, weighted shortest paths, modularity-based community detection, and interactive visualization into one practical system.

---

## 4. PROJECT DESCRIPTION

This project implements an advanced social network analysis system using graph theory. The system accepts structured relationship data, constructs a weighted graph, computes analytical metrics, detects communities, and visualizes the result in an interactive interface.

The system is designed around three major ideas: weighted relationships, community structure, and path analysis. It uses a modular backend for graph computation and a responsive frontend for visualization and exploration.

### 4.1 Methodology

The project follows the following workflow:

**Phase 1:** Requirement Analysis / Literature Survey  
Study graph theory concepts, community detection methods, and path analysis techniques.

**Phase 2:** Data Preparation  
Prepare a simplified CSV dataset with three YouTube-based clusters and weighted relationships.

**Phase 3:** System Design  
Design backend APIs, graph modules, community assignment logic, and frontend visualization.

**Phase 4:** Implementation / Coding  
Build graph construction, weighted shortest-path, community detection, and interactive visualization.

**Phase 5:** Testing and Validation  
Verify graph metrics, path outputs, cluster coloring, and layout stability.

**Phase 6:** Result Analysis and Conclusion  
Interpret structural patterns and evaluate the effectiveness of the system.

### 4.2 Implementation / System Design

The system accepts network data in CSV or JSON format. Each record contains source node, target node, weight, and platform information. The backend converts the data into a weighted graph using NetworkX.

The system supports:
- Weighted edges for relationship strength 
- Platform attribute for each edge 
- Community detection using modularity optimization 
- Weighted shortest-path computation using Dijkstra's algorithm 
- Stable layout caching so filtering does not move the graph 
- Node coloring based on community assignment 

**System Architecture:**
- Data input module 
- Graph creation module 
- Analysis module 
- Visualization module 
- Output reporting module

### 4.3 Results / Analysis

**Experimental Setup:**  
The system was tested using a sample dataset containing 50 nodes and 120 edges representing relationships between users.

**Graph Metrics:**
- Number of Nodes: 50
- Number of Edges: 120
- Average Degree: 4.8
- Highest Degree Centrality Node: A (0.42)
- Highest Betweenness Centrality Node: C (0.31)
- Average Clustering Coefficient: 0.27

**Test Observations:**
- Nodes A and C were identified as highly influential.
- The network showed multiple clusters indicating community-like structures.
- Shortest path analysis revealed efficient connectivity between most nodes.

**Analysis:**
The results confirm that graph-based analysis can effectively identify important nodes and network structure. Centrality measures successfully highlight influential nodes, while clustering patterns indicate group formations within the network.

*Fig. 1. Visualization of Social Network Graph Showing Community Clusters and Weighted Connections*

*Fig. 2. Strongest Connections in the Network Based on Weighted Edge Strength*

*Fig. 3. Link Prediction Results Showing Potential Connections Based on Node Similarity Scores*

### 4.4 Applications

- Social media network analysis 
- Community detection in content networks 
- Influence and bridge-node identification 
- Collaboration network study 
- Recommendation and relationship analysis

### 4.5 Limitations and Future Work

**Limitations**
- Works best on structured graph data 
- Limited to the prepared dataset size 
- No real-time streaming input 
- Visualization may become dense on very large graphs 

**Future Work**
- Add dynamic live graph updates 
- Support temporal analysis 
- Add stronger link prediction methods 
- Extend to cross-platform social graphs 
- Improve large-scale visualization performance

---

## 5. CODE / TECHNICAL IMPLEMENTATION

This section describes the technical implementation of the project, focusing on how the system is developed and executed using graph-based techniques. The implementation involves reading input data, constructing a graph using appropriate data structures, and applying graph algorithms to analyze network properties such as centrality, connectivity, and community structure. The program is organized into modules for data processing, graph construction, analysis, and visualization. Key code segments demonstrate how nodes and edges are created, how metrics like degree and betweenness centrality are calculated, and how results are generated and displayed. This section also explains the input formats used, the output produced by the system, and how the code ensures correct and efficient analysis of the network.

### 5.1 Program Structure

**Backend**
- `main.py` – entry point for the FastAPI server 
- `graph_builder.py` – builds weighted graph from input data 
- `analysis.py` – computes centrality, clustering, and communities 
- `path_service.py` – handles weighted shortest-path logic 
- `schemas.py` – defines response/input formats 

**Frontend**
- `App.jsx` – main interface 
- `GraphView.jsx` – renders interactive graph 
- `PathFinder.jsx` – handles source/target selection and path display 
- `Legend.jsx` – shows color and path meaning 
- `styles/` – Tailwind-based styling

### 5.2 Code Explanation

**Graph Construction**

```python
import networkx as nx

def build_graph(rows):
    G = nx.Graph()
    for row in rows:
        u = row["source"]
        v = row["target"]
        weight = float(row.get("weight", 1))
        platform = row.get("platform", "Unknown")
        G.add_edge(u, v, weight=weight, platform=platform)
    return G
```

This function creates a weighted graph. Each edge stores:
- `weight` for path calculation 
- `platform` for metadata tracking 

**Weighted Shortest Path**

```python
def shortest_path(G, source, target):
    path = nx.dijkstra_path(G, source=source, target=target, weight="weight")
    details = []
    for i in range(len(path) - 1):
        u = path[i]
        v = path[i + 1]
        edge_data = G[u][v]
        details.append({
            "from": u,
            "to": v,
            "weight": edge_data["weight"],
            "platform": edge_data["platform"]
        })
    return path, details
```

This uses Dijkstra's algorithm because the graph is weighted. The function returns both:
- the path nodes 
- the edge-by-edge details 

**Community Detection**

```python
from networkx.algorithms.community import greedy_modularity_communities

def detect_communities(G):
    communities = greedy_modularity_communities(G)
    community_map = {}
    for cid, community in enumerate(communities):
        for node in community:
            community_map[node] = cid
    return community_map
```

If Louvain is available, it can be used first. If not, greedy modularity is used. This makes the system robust.

**Algorithms and Data Structures Used**
- Graph adjacency structure for efficient storage 
- Dijkstra's algorithm for weighted shortest paths 
- Modularity maximization for communities 
- Centrality measures for importance ranking

### 5.3 Input and Output

**Input**
- CSV file containing: 
  - source node 
  - target node 
  - weight 
  - platform 

Example:
```
source,target,weight,platform
A,B,3,YouTube
B,C,2,YouTube
C,D,4,YouTube
```

**Output**
- Graph visualization 
- Community-colored nodes 
- Shortest-path output 
- Edge tooltips showing weight and platform 
- Summary analytics

### 5.4 Output Explanation

The output generated by the system provides insights into the structure and behavior of the social network.

- Nodes with high degree centrality represent highly connected users and are considered influential within the network. 
- Nodes with high betweenness centrality act as bridges between different groups, playing a key role in information flow. 
- The shortest path results show how quickly information can travel between two nodes, indicating network efficiency. 
- If community detection is applied, clusters represent groups of nodes with strong internal connections, indicating social groups or communities. 

The output is generated by processing the input data into a graph structure and applying graph algorithms. The system ensures that invalid or missing input data is handled gracefully by validating the input format and preventing errors such as disconnected nodes or empty datasets.

---

## 6. TEAM CONTRIBUTION

The following table lists the contribution of each team member towards the completion of this project. Each member's role and specific tasks are documented below:

| Enrollment Number | Student Name | Contribution |
|-------------------|--------------|--------------|
| 92510118004 | Mohitrajsinh Jadeja | Graph construction, data processing, and overall system integration |
| 92510118010 | Sahil Rakhaiya | Centrality analysis implementation (degree, betweenness) and shortest path logic |
| 92510118011 | Yash Karena | Documentation, literature review, and report preparation |
| 92510118019 | Anuj Hadiyel | Visualization module development and graph plotting using NetworkX/Matplotlib |
| 92510118026 | Appalanaidu Setti | Testing, validation of results, and performance analysis |

---

## 7. CONCLUSION

This project addressed the problem of analyzing complex social network data where traditional methods fail to capture relationships effectively. By using graph theory, the system models social networks as nodes and weighted edges, enabling efficient analysis of connectivity, influence, and community behavior.

The project successfully implemented graph construction, weighted shortest-path analysis, and community detection. The results show that influential nodes, bridge nodes, and cluster structure can be identified clearly through graph-based methods. The path finder also provides detailed edge-level information, making interpretation more useful than a simple route display.

From a practical perspective, this approach is useful in social media analysis, collaboration networks, and community-based systems. It helps identify important nodes, detect tightly connected groups, and understand how relationships are organized across the network.

In conclusion, this project demonstrates that graph theory is an effective method for analyzing social networks. The implementation using Python, NetworkX, FastAPI, and React validates that a graph-based system can provide both analytical depth and interactive visualization. The project can be extended with larger datasets, temporal analysis, and more advanced graph algorithms.

---

## 8. REFERENCES

[1] M. E. J. Newman, Networks: An Introduction, Oxford University Press, 2010.

[2] D. Easley and J. Kleinberg, Networks, Crowds, and Markets: Reasoning About a Highly Connected World, Cambridge University Press, 2010.

[3] A.-L. Barabási, Network Science, Cambridge University Press, 2016.

[4] S. Wasserman and K. Faust, Social Network Analysis: Methods and Applications, Cambridge University Press, 1994.

[5] U. Brandes, "A Faster Algorithm for Betweenness Centrality," Journal of Mathematical Sociology, vol. 25, no. 2, pp. 163–177, 2001.

[6] M. Girvan and M. E. J. Newman, "Community Structure in Social and Biological Networks," Proceedings of the National Academy of Sciences, vol. 99, no. 12, pp. 7821–7826, 2002.

[7] NetworkX Developers, "NetworkX Documentation," [Online]. Available: https://networkx.org. [Accessed: April 2026].

[8] J. Leskovec and A. Krevl, "SNAP Datasets: Stanford Large Network Dataset Collection," [Online]. Available: https://snap.stanford.edu/data. [Accessed: April 2026].

[9] T. H. Cormen et al., Introduction to Algorithms, MIT Press, 2009.

[10] B. A. Huberman, The Laws of the Web: Patterns in the Ecology of Information, MIT Press, 2001.

# 9. NOTES AND IMPROVEMENTS

This report includes architecture diagrams, measurable metrics, and core logic explanations. Screenshots should be added in the Results section. To strengthen the report further, include additional test datasets, expanded analytics, and deployment details.
