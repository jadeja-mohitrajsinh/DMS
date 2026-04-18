import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const NetworkGraph = ({ data, visibleLinks = [], onNodeClick, highlightedEdges = [], mstEdges = [], bridgeEdges = [] }) => {
  const d3Container = useRef(null);
  const simulationRef = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const linkGroupRef = useRef(null);
  const packetGroupRef = useRef(null);
  const nodeGroupRef = useRef(null);
  const labelGroupRef = useRef(null);
  const positionsRef = useRef(new Map());
  const dataRef = useRef(null);

  // Initialize SVG and Simulation ONCE
  useEffect(() => {
    if (!d3Container.current) return;
    
    const width = 800;
    const height = 600;

    const svg = d3.select(d3Container.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("background", "#0a0a0a")
      .style("border", "1px solid #1f2937")
      .style("display", "block");
    svgRef.current = svg;

    const g = svg.append("g")
      .attr("transform", "translate(0,0)");
    gRef.current = g;

    // Zoom & Pan
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Initial zoom reset
    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(1));

    linkGroupRef.current = g.append("g").attr("class", "links");
    packetGroupRef.current = g.append("g").attr("class", "packets");
    nodeGroupRef.current = g.append("g").attr("class", "nodes");
    labelGroupRef.current = g.append("g").attr("class", "labels");

    // Add SVG styles for animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse-glow {
        0%, 100% { filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.3)); }
        50% { filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8)); }
      }
      @keyframes packet-flow {
        0% { offset-distance: 0%; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { offset-distance: 100%; opacity: 0; }
      }
      .pulse-line { animation: pulse-glow 2s infinite; }
      .animated-packet {
        r: 5;
        fill: #ef4444;
        filter: drop-shadow(0 0 3px #ef4444);
      }
      .packet-label {
        font-size: 9px;
        fill: #fff;
        font-weight: bold;
        text-anchor: middle;
        pointer-events: none;
        text-shadow: 0 0 3px rgba(0,0,0,0.8);
      }
      .packet-type-fraud {
        fill: #ef4444;
        filter: drop-shadow(0 0 5px #ef4444);
      }
      .packet-type-phishing {
        fill: #f97316;
        filter: drop-shadow(0 0 5px #f97316);
      }
      .packet-type-transfer {
        fill: #eab308;
        filter: drop-shadow(0 0 5px #eab308);
      }
    `;
    if (!document.querySelector('style[data-packet-animation]')) {
      style.setAttribute('data-packet-animation', 'true');
      document.head.appendChild(style);
    }

    const simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(d => d.id).distance(130))
      .force("charge", d3.forceManyBody().strength(-280).distanceMax(400))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.1))
      .force("collision", d3.forceCollide().radius(38).strength(0.85))
      .alphaDecay(0.015)
      .velocityDecay(0.35);

    simulation.on("tick", () => {
      linkGroupRef.current.selectAll("line")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      nodeGroupRef.current.selectAll("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      labelGroupRef.current.selectAll("text")
        .attr("x", d => d.x)
        .attr("y", d => d.y);

      simulation.nodes().forEach((n) => {
        positionsRef.current.set(n.id, { x: n.x, y: n.y });
      });

      // Update cluster boundaries on each tick
      const communityIds = Array.from(new Set(simulation.nodes().map(n => n.community ?? 0)));
      updateClusterBoundaries(communityIds);
    });

    const updateClusterBoundaries = (communityIds) => {
      const nodes = simulation.nodes();
      
      // Calculate centroid and radius for each community
      const clusterMetrics = new Map();
      communityIds.forEach(communityId => {
        const communityNodes = nodes.filter(n => (n.community ?? 0) === communityId);
        
        if (communityNodes.length === 0) {
          clusterMetrics.set(communityId, {
            cx: width / 2,
            cy: height / 2,
            radius: 100,
            nodes: 0
          });
          return;
        }

        // Calculate centroid
        const centroid = {
          x: communityNodes.reduce((sum, n) => sum + (n.x || 0), 0) / communityNodes.length,
          y: communityNodes.reduce((sum, n) => sum + (n.y || 0), 0) / communityNodes.length
        };

        // Calculate radius as max distance from centroid + padding
        const maxDistance = Math.max(
          ...communityNodes.map(n => {
            const dx = (n.x || 0) - centroid.x;
            const dy = (n.y || 0) - centroid.y;
            return Math.sqrt(dx * dx + dy * dy);
          }),
          30 // minimum for single-node clusters
        );

        clusterMetrics.set(communityId, {
          cx: centroid.x,
          cy: centroid.y,
          radius: maxDistance + 55, // 55px padding
          nodes: communityNodes.length
        });
      });

      // Update or create cluster boundary circles
      const hull = gRef.current.selectAll("circle.community-halo")
        .data(communityIds, d => d);

      hull.exit().remove();

      hull.enter()
        .insert("circle", ":first-child")
        .attr("class", "community-halo")
        .attr("fill", "none")
        .attr("stroke", "#4b5563")
        .attr("stroke-dasharray", "8 5")
        .attr("stroke-width", 1.5)
        .attr("stroke-linecap", "round")
        .attr("opacity", 0.5)
        .attr("filter", "url(#cluster-glow)")
        .merge(hull)
        .transition()
        .duration(100)
        .attr("cx", d => clusterMetrics.get(d).cx)
        .attr("cy", d => clusterMetrics.get(d).cy)
        .attr("r", d => clusterMetrics.get(d).radius)
        .attr("opacity", d => {
          const nodeCount = clusterMetrics.get(d).nodes;
          return Math.min(0.6, 0.3 + nodeCount * 0.05);
        });
    };

    simulationRef.current = simulation;

    // Force continuous animation for packets
    let animationFrameId;
    const animatePackets = () => {
      if (packetGroupRef.current) {
        packetGroupRef.current.selectAll(".packet-group")
          .attr("transform", d => {
            const link = d.link;
            if (!link.source || !link.target) return "translate(0,0)";
            // SLOWER animation: duration is 5000-10000ms
            const elapsed = Date.now() % (d.duration || 5000);
            const progress = elapsed / (d.duration || 5000);
            const x = link.source.x + (link.target.x - link.source.x) * progress;
            const y = link.source.y + (link.target.y - link.source.y) * progress;
            return `translate(${x},${y})`;
          });
      }
      animationFrameId = requestAnimationFrame(animatePackets);
    };
    animationFrameId = requestAnimationFrame(animatePackets);

    return () => {
      simulation.stop();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Update Data Incrementally
  useEffect(() => {
    if (!data || !simulationRef.current) return;

    const simulation = simulationRef.current;
    const isDataChange = dataRef.current !== data;
    if (isDataChange) {
      dataRef.current = data;
    }
    
    // Copy data to avoid mutating props if possible, 
    // but D3 needs the objects to track 'x', 'y'
    // We must merge incoming data with existing simulation state to preserve positions
    const oldNodes = simulation.nodes();
    const nodeMap = new Map(oldNodes.map(d => [d.id, d]));

    const nodes = isDataChange ? data.nodes.map((d) => {
      const cached = positionsRef.current.get(d.id);
      const base = nodeMap.get(d.id) || {};
      const merged = Object.assign(base, d);
      if (cached && (merged.x === undefined || merged.y === undefined)) {
        merged.x = cached.x;
        merged.y = cached.y;
      }
      return merged;
    }) : oldNodes;
    const links = data.links.map(d => Object.assign({}, d)); // Layout links

    const width = 800;
    const height = 600;
    const communityIds = Array.from(new Set(nodes.map(n => n.community ?? 0)));
    const communityCenters = new Map();
    const clusterRadius = Math.min(width, height) * 0.42;
    const communityCount = Math.max(communityIds.length, 1);
    const gridCols = Math.ceil(Math.sqrt(communityCount));
    const gridGapX = width / Math.max(2, gridCols);
    const gridGapY = height / Math.max(2, Math.ceil(communityCount / gridCols));
    communityIds.forEach((comm, i) => {
      const row = Math.floor(i / gridCols);
      const col = i % gridCols;
      communityCenters.set(comm, {
        x: gridGapX * 0.8 + col * gridGapX,
        y: gridGapY * 0.8 + row * gridGapY
      });
    });
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const degreeMap = new Map(nodes.map(n => [n.id, 0]));
    links.forEach((l) => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1);
      degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1);
    });
    const hubThreshold = Math.max(6, Math.floor(nodes.length * 0.15));
    nodes.forEach((n) => {
      n.degree = degreeMap.get(n.id) || 0;
      n.is_outlier = n.degree <= 1;
      n.is_hub = n.degree >= hubThreshold;
    });
    const filteredLinks = links.filter((l) => (l.weight ?? 1) >= 3);

    const color = d3.scaleOrdinal([
      '#22c55e',
      '#f97316',
      '#3b82f6',
      '#eab308',
      '#10b981',
      '#ef4444',
      '#14b8a6',
      '#a855f7',
      '#84cc16',
      '#06b6d4'
    ]);
    const platformColors = {
      'Twitter': '#1DA1F2',
      'LinkedIn': '#0077B5',
      'YouTube': '#FF0000',
      'Unknown': '#777'
    };

    const linkKey = (d) => {
      const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
      const targetId = typeof d.target === 'object' ? d.target.id : d.target;
      return `${sourceId}-${targetId}`;
    };

    const renderLinks = (() => {
      const all = [];
      const seen = new Set();
      const addLink = (l) => {
        const key = linkKey(l);
        const reverseKey = `${key.split('-')[1]}-${key.split('-')[0]}`;
        if (seen.has(key) || seen.has(reverseKey)) return;
        seen.add(key);
        all.push(l);
      };
      visibleLinks.forEach(addLink);
      highlightedEdges.forEach(addLink);
      mstEdges.forEach(addLink);
      bridgeEdges.forEach(addLink);
      return all;
    })();
    const displayLinks = renderLinks.map((l) => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      return {
        ...l,
        source: nodeById.get(sourceId) || l.source,
        target: nodeById.get(targetId) || l.target
      };
    });

    // --- Join Links ---
    const link = linkGroupRef.current.selectAll("line")
      .data(displayLinks, linkKey);

    link.exit().remove();
    const linkEnter = link.enter().append("line")
      .attr("stroke-opacity", 0)
      .attr("stroke-width", d => Math.log(d.weight + 1) * 2 + 1);
    linkEnter.transition().duration(1000).attr("stroke-opacity", 0.6);

    const linkMerge = linkEnter.merge(link);
    const highlightedSet = new Set(
      highlightedEdges.map((e) => `${e.source}-${e.target}`)
    );
    const mstSet = new Set(
      mstEdges.map((e) => `${e.source}-${e.target}`)
    );
    const bridgeSet = new Set(
      bridgeEdges.map((e) => `${e.source}-${e.target}`)
    );

    linkMerge
      .attr("stroke", d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        if (highlightedSet.has(`${sourceId}-${targetId}`) || highlightedSet.has(`${targetId}-${sourceId}`)) {
          return '#ef4444';
        }
        if (mstSet.has(`${sourceId}-${targetId}`) || mstSet.has(`${targetId}-${sourceId}`)) {
          return '#22c55e';
        }
        if (bridgeSet.has(`${sourceId}-${targetId}`) || bridgeSet.has(`${targetId}-${sourceId}`)) {
          return '#f59e0b';
        }
        const source = nodeById.get(sourceId);
        const target = nodeById.get(targetId);
        if (source && target && source.community !== target.community) return '#c0b29b92';
        return platformColors[d.platform] || '#999';
      })
      .attr("stroke-dasharray", d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        const source = nodeById.get(sourceId);
        const target = nodeById.get(targetId);
        if (source && target && source.community !== target.community) return '4 3';
        return null;
      })
      .attr("stroke-width", d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        if (highlightedSet.has(`${sourceId}-${targetId}`) || highlightedSet.has(`${targetId}-${sourceId}`)) {
          return Math.log(d.weight + 1) * 2.6 + 1.6;
        }
        if (mstSet.has(`${sourceId}-${targetId}`) || mstSet.has(`${targetId}-${sourceId}`)) {
          return Math.log(d.weight + 1) * 2.2 + 1.4;
        }
        if (bridgeSet.has(`${sourceId}-${targetId}`) || bridgeSet.has(`${targetId}-${sourceId}`)) {
          return Math.log(d.weight + 1) * 2.0 + 1.2;
        }
        return Math.log(d.weight + 1) * 1.6 + 0.8;
      })
      .attr("stroke-opacity", d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        if (highlightedSet.size > 0) {
          if (highlightedSet.has(`${sourceId}-${targetId}`) || highlightedSet.has(`${targetId}-${sourceId}`)) return 1;
          return 0.2;
        }
        if (mstSet.has(`${sourceId}-${targetId}`) || mstSet.has(`${targetId}-${sourceId}`)) return 0.9;
        if (bridgeSet.has(`${sourceId}-${targetId}`) || bridgeSet.has(`${targetId}-${sourceId}`)) return 0.85;
        const source = nodeById.get(sourceId);
        const target = nodeById.get(targetId);
        if (source && target && source.community !== target.community) return 0.8;
        return 0.25;
      });

    linkMerge.selectAll("title")
      .data(d => [d])
      .join("title")
      .text(d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        return `${sourceId} -> ${targetId} | weight: ${d.weight ?? 1} | platform: ${d.platform || 'Unknown'}`;
      });

      // --- Animated Packet Flow (Cisco Packet Tracer Style) ---
      // Create packet data: only on critical weight >= 8 links
      const packetData = displayLinks
        .filter(d => (d.weight ?? 1) >= 8) // Only CRITICAL links
        .map((link, i) => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          
          // Safely determine packet type and symbol
          let packetType = 'transfer';
          let symbol = '📦';
          const typeStr = (link.type || '').toString().toLowerCase();
          
          if (typeStr.includes('fraud')) {
            packetType = 'fraud';
            symbol = '⚠️'; // Warning symbol
          } else if (typeStr.includes('phishing') || typeStr.includes('malicious')) {
            packetType = 'phishing';
            symbol = '🎣'; // Phishing hook
          } else if (typeStr.includes('transfer')) {
            packetType = 'transfer';
            symbol = '💰'; // Money
          } else if (typeStr.includes('bitcoin') || typeStr.includes('crypto')) {
            packetType = 'crypto';
            symbol = '₿'; // Bitcoin symbol
          }
          
          return {
            id: linkKey(link),
            link: link,
            weight: link.weight ?? 1,
            type: link.type || 'Data',
            sourceId: sourceId,
            targetId: targetId,
            packetType: packetType,
            symbol: symbol,
            duration: 5000 + i * 1000, // SLOW animation: 5-10 seconds per packet
            delay: i * 1500 // Delay between packets
          };
        });

      const packets = packetGroupRef.current.selectAll(".animated-packet")
        .data(packetData, d => d.id);

      packets.exit().remove();

      packets.enter()
        .append("g")
        .attr("class", "packet-group")
        .append("circle")
        .attr("class", d => `animated-packet packet-type-${d.packetType}`)
        .attr("r", 7)
        .merge(packets.selectAll("circle"))
        .attr("fill", d => {
          switch(d.packetType) {
            case 'fraud': return "#ef4444";      // Red
            case 'phishing': return "#f97316";   // Orange
            case 'crypto': return "#8b5cf6";     // Purple
            case 'transfer': return "#eab308";   // Yellow
            default: return "#3b82f6";            // Blue
          }
        });

      // Add text labels to packets
      packetGroupRef.current.selectAll(".packet-group")
        .data(packetData, d => d.id)
        .selectAll("text")
        .data(d => [d])
        .join("text")
        .attr("class", "packet-label")
        .attr("dy", "0.3em")
        .attr("font-size", "11px")
        .text(d => d.symbol);

      // Add title/tooltip for each packet
      packetGroupRef.current.selectAll(".packet-group")
        .data(packetData, d => d.id)
        .selectAll("title")
        .data(d => [d])
        .join("title")
        .text(d => `${d.sourceId} → ${d.targetId}\n${d.type}\n(Weight: ${d.weight})`);

      // Apply pulsing effect to ONLY the most critical transaction links
      linkMerge.classed("pulse-line", d => (d.weight ?? 0) >= 9);

    if (isDataChange) {
      // --- Join Nodes ---
      const node = nodeGroupRef.current.selectAll("circle")
        .data(nodes, d => d.id);

      node.exit().remove();
      const nodeEnter = node.enter().append("circle")
        .attr("r", 0)
        .attr("fill", d => color(d.community || 0))
        .attr("stroke", d => d.is_bridge ? "#f59e0b" : (d.is_hub ? "#fb923c" : "#fff"))
        .attr("stroke-width", d => d.is_bridge ? 3.5 : (d.is_hub ? 2.5 : 2))
        .on("click", (event, d) => onNodeClick(d.id))
        .call(drag(simulation));
      
      nodeEnter.transition().duration(800)
        .attr("r", 15);

      nodeGroupRef.current.selectAll("circle")
        .attr("fill", d => color(d.community || 0))
        .attr("stroke", d => d.is_bridge ? "#f59e0b" : (d.is_hub ? "#fb923c" : "#fff"))
        .attr("stroke-width", d => d.is_bridge ? 3.5 : (d.is_hub ? 2.5 : 2));

      // --- Join Labels ---
      const label = labelGroupRef.current.selectAll("text")
        .data(nodes, d => d.id);

      label.exit().remove();
      label.enter().append("text")
        .attr("dx", 18)
        .attr("dy", ".35em")
        .style("opacity", 0)
        .style("font-family", "sans-serif")
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .style("fill", "#ccc")
        .text(d => d.id)
        .transition().duration(800).style("opacity", 1);
    }

    if (isDataChange) {
      // Initialize node positions clustered by community
      nodes.forEach((n) => {
        const center = communityCenters.get(n.community ?? 0) || { x: width / 2, y: height / 2 };
        if (n.x === undefined || n.y === undefined) {
          const jitter = 45;
          n.x = center.x + (Math.random() - 0.5) * jitter;
          n.y = center.y + (Math.random() - 0.5) * jitter;
        }
      });

      simulation.nodes(nodes);
      
      // Link distance: Intra-cluster = short, Inter-cluster = long
      simulation.force("link")
        .links(links)
        .distance((d) => {
          const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
          const targetId = typeof d.target === 'object' ? d.target.id : d.target;
          const source = nodeById.get(sourceId);
          const target = nodeById.get(targetId);
          if (source && target && source.community !== target.community) {
            return 280; // Long distance for inter-cluster links
          }
          return 110; // Short distance for intra-cluster links
        })
        .strength((d) => {
          const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
          const targetId = typeof d.target === 'object' ? d.target.id : d.target;
          const source = nodeById.get(sourceId);
          const target = nodeById.get(targetId);
          if (source && target && source.community !== target.community) {
            return 0.02; // Weak for inter-cluster
          }
          return 0.18; // Strong for intra-cluster
        });

      // Custom cluster-level separation force
      const clusterSeparationForce = () => {
        const nodeList = simulation.nodes();
        const communities = Array.from(new Set(nodeList.map(n => n.community ?? 0)));
        
        // Compute cluster metrics: centroid and radius
        const clusterRadii = new Map();
        const clusterCentroids = new Map();
        
        communities.forEach(commId => {
          const commNodes = nodeList.filter(n => (n.community ?? 0) === commId);
          if (commNodes.length === 0) return;
          
          // Centroid
          const centroid = {
            x: commNodes.reduce((sum, n) => sum + (n.x || 0), 0) / commNodes.length,
            y: commNodes.reduce((sum, n) => sum + (n.y || 0), 0) / commNodes.length
          };
          clusterCentroids.set(commId, centroid);
          
          // Max distance from centroid
          const maxDist = Math.max(
            ...commNodes.map(n => {
              const dx = (n.x || 0) - centroid.x;
              const dy = (n.y || 0) - centroid.y;
              return Math.sqrt(dx * dx + dy * dy);
            }),
            40
          );
          clusterRadii.set(commId, maxDist + 70); // Add padding
        });

        // Apply repulsion between cluster centroids to enforce minimum spacing
        const clusterArray = Array.from(clusterCentroids.entries());
        for (let i = 0; i < clusterArray.length; i++) {
          for (let j = i + 1; j < clusterArray.length; j++) {
            const [commA, centroidA] = clusterArray[i];
            const [commB, centroidB] = clusterArray[j];
            
            const dx = centroidB.x - centroidA.x;
            const dy = centroidB.y - centroidA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const radiusA = clusterRadii.get(commA);
            const radiusB = clusterRadii.get(commB);
            const minDistBetweenCentroids = radiusA + radiusB + 220; // Pad for separation
            
            if (distance < minDistBetweenCentroids && distance > 0.1) {
              // Repulsion strength increases as clusters get closer
              const deficit = minDistBetweenCentroids - distance;
              const strength = 0.015 * deficit;
              
              const fx = (dx / distance) * strength;
              const fy = (dy / distance) * strength;

              // Apply forces to all nodes in each cluster
              nodeList.forEach(n => {
                if ((n.community ?? 0) === commA) {
                  n.vx = (n.vx || 0) - fx;
                  n.vy = (n.vy || 0) - fy;
                }
              });
              nodeList.forEach(n => {
                if ((n.community ?? 0) === commB) {
                  n.vx = (n.vx || 0) + fx;
                  n.vy = (n.vy || 0) + fy;
                }
              });
            }
          }
        }
      };

      // Clustering force: Pull nodes toward their cluster center
      const clusteringForce = () => {
        const nodeList = simulation.nodes();
        const communities = Array.from(new Set(nodeList.map(n => n.community ?? 0)));
        
        // Compute cluster centroids
        const centroids = new Map();
        communities.forEach(commId => {
          const nodes = nodeList.filter(n => (n.community ?? 0) === commId);
          if (nodes.length > 0) {
            centroids.set(commId, {
              x: nodes.reduce((sum, n) => sum + (n.x || 0), 0) / nodes.length,
              y: nodes.reduce((sum, n) => sum + (n.y || 0), 0) / nodes.length
            });
          }
        });

        // Pull nodes toward their cluster center
        nodeList.forEach(n => {
          const centroid = centroids.get(n.community ?? 0);
          if (centroid) {
            const dx = centroid.x - (n.x || 0);
            const dy = centroid.y - (n.y || 0);
            const strength = 0.008; // Gentle clustering
            n.vx = (n.vx || 0) + dx * strength;
            n.vy = (n.vy || 0) + dy * strength;
          }
        });
      };

      // Update forces
      simulation
        .force("x", d3.forceX(d => (communityCenters.get(d.community ?? 0) || { x: width / 2 }).x).strength(0.65))
        .force("y", d3.forceY(d => (communityCenters.get(d.community ?? 0) || { y: height / 2 }).y).strength(0.65));
      
      // Remove old custom forces and add new ones
      simulation.force("clusterSeparation", null);
      simulation.force("clustering", null);
      simulation.force("clusterSeparation", clusterSeparationForce);
      simulation.force("clustering", clusteringForce);

      // Initialize SVG filter for cluster glow
      const defs = gRef.current.selectAll("defs").data([null]);
      defs.enter().append("defs").merge(defs)
        .html(`
          <filter id="cluster-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        `);

      // Restart simulation with parameters for better convergence
      simulation.alpha(0.15).alphaTarget(0).restart();
    }

    function drag(sim) {
      function dragstarted(event) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event) {
        if (!event.active) sim.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

  }, [data, visibleLinks, highlightedEdges, onNodeClick]);

  return (
    <div className="relative w-full h-[600px] border border-gray-800 rounded-3xl overflow-hidden bg-gradient-to-b from-gray-900 to-black">
      <svg
        className="w-full h-full cursor-move block"
        ref={d3Container}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      
      {/* Transaction Type Legend */}
      <div className="absolute top-4 left-6 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-gray-700 text-xs text-gray-300 font-mono">
        <div className="font-bold text-yellow-400 mb-3">📊 TRANSACTION TYPES:</div>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500" style={{boxShadow: '0 0 5px #ef4444'}}></div>
            <span>⚠️ = FRAUD (Weight 9+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" style={{boxShadow: '0 0 5px #f97316'}}></div>
            <span>🎣 = PHISHING (Weight 8+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" style={{boxShadow: '0 0 5px #eab308'}}></div>
            <span>💰 = TRANSFER (Weight 8+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" style={{boxShadow: '0 0 5px #8b5cf6'}}></div>
            <span>₿ = CRYPTO (Weight 9)</span>
          </div>
        </div>
      </div>

      {/* Network Info */}
      <div className="absolute bottom-4 left-6 flex space-x-6 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-gray-800 text-[10px] text-gray-400 font-bold uppercase tracking-widest pointer-events-none">
          <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded-full bg-[#1DA1F2]"></div><span>Twitter</span></div>
          <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded-full bg-[#0077B5]"></div><span>LinkedIn</span></div>
          <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded-full bg-[#FF0000]"></div><span>YouTube</span></div>
      </div>
    </div>
  );
};

export default NetworkGraph;
