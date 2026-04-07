import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const NetworkGraph = ({ data, visibleLinks = [], onNodeClick, highlightedEdges = [] }) => {
  const d3Container = useRef(null);
  const simulationRef = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const linkGroupRef = useRef(null);
  const nodeGroupRef = useRef(null);
  const labelGroupRef = useRef(null);
  const positionsRef = useRef(new Map());
  const dataRef = useRef(null);

  // Initialize SVG and Simulation ONCE
  useEffect(() => {
    const width = 800;
    const height = 600;

    const svg = d3.select(d3Container.current)
      .attr("viewBox", [0, 0, width, height]);
    svgRef.current = svg;

    const g = svg.append("g");
    gRef.current = g;

    // Zoom & Pan
    svg.call(d3.zoom().on("zoom", (event) => {
      g.attr("transform", event.transform);
    }));

    linkGroupRef.current = g.append("g").attr("class", "links");
    nodeGroupRef.current = g.append("g").attr("class", "nodes");
    labelGroupRef.current = g.append("g").attr("class", "labels");

    const simulation = d3.forceSimulation()
      .force("link", d3.forceLink().id(d => d.id).distance(160))
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(34));

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
    });

    simulationRef.current = simulation;

    return () => simulation.stop();
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

    linkMerge
      .attr("stroke", d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        if (highlightedSet.has(`${sourceId}-${targetId}`) || highlightedSet.has(`${targetId}-${sourceId}`)) {
          return '#ef4444';
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
        return Math.log(d.weight + 1) * 1.6 + 0.8;
      })
      .attr("stroke-opacity", d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        if (highlightedSet.size > 0) {
          if (highlightedSet.has(`${sourceId}-${targetId}`) || highlightedSet.has(`${targetId}-${sourceId}`)) return 1;
          return 0.2;
        }
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
      // Update simulation
      nodes.forEach((n) => {
        const center = communityCenters.get(n.community ?? 0) || { x: width / 2, y: height / 2 };
        if (n.x === undefined || n.y === undefined) {
          const jitter = 35;
          n.x = center.x + (Math.random() - 0.5) * jitter;
          n.y = center.y + (Math.random() - 0.5) * jitter;
        }
      });
      simulation.nodes(nodes);
      simulation.force("link").links(links);
      simulation.force("link").strength((d) => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        const source = nodeById.get(sourceId);
        const target = nodeById.get(targetId);
        if (source && target && source.community !== target.community) return 0.03;
        return 0.12;
      });
      simulation
        .force("x", d3.forceX(d => (communityCenters.get(d.community ?? 0) || { x: width / 2 }).x).strength(0.85))
        .force("y", d3.forceY(d => (communityCenters.get(d.community ?? 0) || { y: height / 2 }).y).strength(0.85))
        .force("radial", d3.forceRadial(clusterRadius, width / 2, height / 2).strength(0.05))
        .force("outlierX", d3.forceX(d => (d.is_outlier ? width * 0.12 : width / 2)).strength(0.35))
        .force("outlierY", d3.forceY(d => (d.is_outlier ? height * 0.12 : height / 2)).strength(0.35))
        .force("hubRadial", d3.forceRadial(d => (d.is_hub ? clusterRadius + 80 : clusterRadius), width / 2, height / 2).strength(0.12));

      const hull = gRef.current.selectAll("circle.community-halo")
        .data(communityIds, d => d);
      hull.exit().remove();
      hull.enter()
        .insert("circle", ":first-child")
        .attr("class", "community-halo")
        .attr("fill", "none")
        .attr("stroke", "#1f2937")
        .attr("stroke-dasharray", "6 6")
        .attr("stroke-width", 1.2)
        .attr("opacity", 0.7)
        .merge(hull)
        .attr("cx", d => (communityCenters.get(d) || { x: width / 2 }).x)
        .attr("cy", d => (communityCenters.get(d) || { y: height / 2 }).y)
        .attr("r", 110 + Math.min(80, communityCount * 6));
      
      // Pulse the alpha so things move gently to their new spots
      simulation.alpha(0.12).restart();
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
    <div className="relative w-full h-[600px] border border-gray-800 rounded-3xl overflow-hidden bg-black/40">
      <svg
        className="w-full h-full cursor-move"
        ref={d3Container}
      />
      <div className="absolute bottom-4 left-6 flex space-x-6 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-gray-800 text-[10px] text-gray-400 font-bold uppercase tracking-widest pointer-events-none">
          <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded-full bg-[#1DA1F2]"></div><span>Twitter</span></div>
          <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded-full bg-[#0077B5]"></div><span>LinkedIn</span></div>
          <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded-full bg-[#FF0000]"></div><span>YouTube</span></div>
      </div>
    </div>
  );
};

export default NetworkGraph;
