import React, { useState, useEffect, useRef, useMemo } from 'react';
import NetworkGraph from './NetworkGraph';
import AboutSection from './AboutSection';
import { Activity, Users, Send, Target, TrendingUp, Zap, Info, Layers, GitMerge } from 'lucide-react';

function App() {
    const [graph, setGraph] = useState({ nodes: [], links: [] });
    const [influencers, setInfluencers] = useState([]);
    const [bridges, setBridges] = useState([]);
    const [pulse, setPulse] = useState({ velocity: [], current_load: 0 });
    const [predictions, setPredictions] = useState([]);
    const [events, setEvents] = useState([]);
    const [activeNode, setActiveNode] = useState(null);
    const [simulationResult, setSimulationResult] = useState(null);
    const [isPathOpen, setIsPathOpen] = useState(false);
    const [pathSource, setPathSource] = useState('');
    const [pathTarget, setPathTarget] = useState('');
    const [pathResult, setPathResult] = useState(null);
    const [pathError, setPathError] = useState('');
    const [networkSummary, setNetworkSummary] = useState({
        nodes: 0,
        edges: 0,
        density: 0,
        avg_degree: 0,
        avg_clustering: 0,
        components: 0,
        largest_component_ratio: 0,
        bridges: 0,
        avg_shortest_path: null,
        weighted_avg_shortest_path: null,
        diameter: null,
        strongest_connections: []
    });
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    const [platformFilter, setPlatformFilter] = useState('All');
    const [communityFilter, setCommunityFilter] = useState('All');
    const wsRef = useRef(null);

    useEffect(() => {
        fetchData();
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
        const wsUrl = `${protocol}//${host}/ws`;
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;
        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'INIT') {
                setGraph(message.data);
            } else if (message.type === 'NEW_INTERACTION') {
                setEvents(prev => [message.data, ...prev].slice(0, 50));
                if (Math.random() < 0.3) refreshAnalysis();
                fetchGraph();
                fetchPulse();
            }
        };
        return () => socket.close();
    }, []);

    const fetchData = async () => {
        await fetchGraph();
        await refreshAnalysis();
        await fetchPulse();
    };

    const fetchGraph = async () => {
        try {
            const res = await fetch('http://localhost:8000/graph');
            setGraph(await res.json());
        } catch (e) { }
    };

    const fetchPulse = async () => {
        try {
            const res = await fetch('http://localhost:8000/pulse');
            setPulse(await res.json());
        } catch (e) { }
    };

    const refreshAnalysis = async () => {
        try {
            const infRes = await fetch('http://localhost:8000/influencers');
            setInfluencers(await infRes.json());

            const bridgeRes = await fetch('http://localhost:8000/bridges');
            setBridges(await bridgeRes.json());

            const predRes = await fetch('http://localhost:8000/predict-links');
            setPredictions(await predRes.json());

            const summaryRes = await fetch('http://localhost:8000/network-summary');
            if (summaryRes.ok) {
                const summary = await summaryRes.json();
                setNetworkSummary(summary || {});
            }
        } catch (e) { }
    };

    const triggerSimulation = async (nodeId) => {
        setActiveNode(nodeId);
        try {
            const res = await fetch(`http://localhost:8000/simulate/${nodeId}`);
            setSimulationResult(await res.json());
        } catch (e) { }
    };

    const openPathDialog = () => {
        setPathSource('');
        setPathTarget('');
        setPathResult(null);
        setPathError('');
        setIsPathOpen(true);
    };

    const fetchPath = async () => {
        if (!pathSource || !pathTarget) {
            setPathError('Enter both nodes');
            return;
        }
        setPathError('');
        setPathResult(null);
        try {
            const res = await fetch(`http://localhost:8000/path?source=${encodeURIComponent(pathSource)}&target=${encodeURIComponent(pathTarget)}`);
            if (!res.ok) {
                let detail = null;
                try {
                    detail = await res.json();
                } catch (err) {
                    detail = null;
                }
                const fallback = computeShortestPath(pathSource, pathTarget, graph.links);
                if (fallback) {
                    setPathResult(fallback);
                    return;
                }
                setPathError((detail && detail.detail) ? detail.detail : 'No path found');
                return;
            }
            setPathResult(await res.json());
        } catch (e) {
            const fallback = computeShortestPath(pathSource, pathTarget, graph.links);
            if (fallback) {
                setPathResult(fallback);
                return;
            }
            setPathError('Unable to fetch path');
        }
    };

    const computeShortestPath = (source, target, links) => {
        if (!source || !target || source === target) {
            return {
                source,
                target,
                path: source ? [source] : [],
                edges: [],
                hops: 0,
                total_strength: 0,
                total_distance: 0
            };
        }
        const adj = new Map();
        links.forEach((l) => {
            const u = typeof l.source === 'object' ? l.source.id : l.source;
            const v = typeof l.target === 'object' ? l.target.id : l.target;
            const w = l.weight ?? 1;
            if (!adj.has(u)) adj.set(u, []);
            if (!adj.has(v)) adj.set(v, []);
            adj.get(u).push({ node: v, weight: w, platform: l.platform || 'Unknown' });
            adj.get(v).push({ node: u, weight: w, platform: l.platform || 'Unknown' });
        });
        if (!adj.has(source) || !adj.has(target)) return null;

        const dist = new Map();
        const prev = new Map();
        const visited = new Set();
        const queue = new Set(adj.keys());
        adj.forEach((_, key) => dist.set(key, Infinity));
        dist.set(source, 0);

        while (queue.size) {
            let u = null;
            let min = Infinity;
            queue.forEach((n) => {
                const d = dist.get(n);
                if (d < min) {
                    min = d;
                    u = n;
                }
            });
            if (u === null) break;
            queue.delete(u);
            visited.add(u);
            if (u === target) break;
            const neighbors = adj.get(u) || [];
            neighbors.forEach((edge) => {
                if (!queue.has(edge.node)) return;
                const distance = 1 / Math.max(edge.weight, 0.01);
                const alt = dist.get(u) + distance;
                if (alt < dist.get(edge.node)) {
                    dist.set(edge.node, alt);
                    prev.set(edge.node, { node: u, weight: edge.weight, platform: edge.platform });
                }
            });
        }

        if (!prev.has(target)) return null;

        const path = [target];
        let current = target;
        let totalStrength = 0;
        let totalDistance = 0;
        const edges = [];
        while (current !== source) {
            const step = prev.get(current);
            if (!step) break;
            const distance = 1 / Math.max(step.weight, 0.01);
            totalStrength += step.weight;
            totalDistance += distance;
            edges.push({
                source: step.node,
                target: current,
                weight: step.weight,
                platform: step.platform
            });
            current = step.node;
            path.push(current);
        }
        path.reverse();
        edges.reverse();
        return {
            source,
            target,
            path,
            edges,
            hops: Math.max(0, path.length - 1),
            total_strength: Number(totalStrength.toFixed(4)),
            total_distance: Number(totalDistance.toFixed(4))
        };
    };

    const communityCount = new Set(graph.nodes.map(n => n.community)).size;
    const platformOptions = Array.from(new Set([
        ...graph.links.map(l => l.platform),
        ...graph.nodes.map(n => n.platform)
    ].filter(Boolean))).sort();
    const communityOptions = Array.from(new Set(
        graph.nodes.map(n => n.community).filter(c => c !== undefined && c !== null)
    )).sort((a, b) => (a > b ? 1 : -1));

    const filteredNodes = graph.nodes.filter((n) => {
        const communityOk = communityFilter === 'All' || String(n.community) === communityFilter;
        const platformOk = platformFilter === 'All' || !n.platform || n.platform === platformFilter;
        return communityOk && platformOk;
    });
        const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = graph.links.filter((l) => {
        const platformOk = platformFilter === 'All' || l.platform === platformFilter;
        if (!platformOk) return false;
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });
        const filteredGraph = { nodes: filteredNodes, links: filteredLinks };
        const layoutGraph = useMemo(() => ({ nodes: graph.nodes, links: graph.links }), [graph.nodes, graph.links]);
    const nodeOptions = graph.nodes.map(n => n.id).filter(Boolean).sort();
    const highlightedEdges = (pathResult && pathResult.edges) ? pathResult.edges : [];
    const pathSteps = highlightedEdges.map((edge, index) => {
        const prev = highlightedEdges[index - 1];
        const prevPlatform = prev ? (prev.platform || 'Unknown') : '';
        const currentPlatform = edge.platform || 'Unknown';
        const transition = prev && prevPlatform !== currentPlatform;
        const transitionLabel = transition ? `${prevPlatform} -> ${currentPlatform}` : '';
        return { ...edge, transition, transitionLabel, platform: currentPlatform };
    });

    return (
        <div className="min-h-screen bg-[#050505] text-gray-200 p-8 font-sans">
            <AboutSection isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
            {isPathOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0a0a0a] border border-gray-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-black text-white">Path Finder</h3>
                            <button onClick={() => setIsPathOpen(false)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                                <span className="text-gray-400">X</span>
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-4 uppercase tracking-widest font-bold">Find the full path between two nodes</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Source</label>
                                <select
                                    value={pathSource}
                                    onChange={(e) => setPathSource(e.target.value)}
                                    className="mt-2 w-full bg-black/40 border border-gray-800 text-gray-200 text-xs px-3 py-2 rounded-lg"
                                >
                                    <option value="">Select source</option>
                                    {nodeOptions.map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Target</label>
                                <select
                                    value={pathTarget}
                                    onChange={(e) => setPathTarget(e.target.value)}
                                    className="mt-2 w-full bg-black/40 border border-gray-800 text-gray-200 text-xs px-3 py-2 rounded-lg"
                                >
                                    <option value="">Select target</option>
                                    {nodeOptions.map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                            <button
                                onClick={fetchPath}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg"
                            >
                                Get Path
                            </button>
                            <button
                                onClick={() => setIsPathOpen(false)}
                                className="border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg"
                            >
                                Close
                            </button>
                        </div>
                        {pathError && (
                            <div className="mt-4 text-xs text-red-400 font-bold">{pathError}</div>
                        )}
                        {pathResult && (
                            <div className="mt-5 bg-black/40 border border-gray-800 rounded-2xl p-4">
                                <div className="flex flex-wrap gap-4 text-[10px] text-gray-500 font-black uppercase tracking-widest mb-3">
                                    <span>Hops: {pathResult.hops}</span>
                                    <span>Total Strength: {pathResult.total_strength}</span>
                                    <span>Distance: {pathResult.total_distance}</span>
                                </div>
                                <div className="text-sm text-gray-200 font-mono break-words">
                                    {pathResult.path.join(' -> ')}
                                </div>
                                <div className="mt-4 space-y-2">
                                    {pathSteps.map((step, i) => (
                                        <div key={`${step.source}-${step.target}-${i}`} className="flex items-center justify-between bg-[#0a0a0a] border border-gray-800 rounded-xl px-3 py-2">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                <span className="text-white">{step.source}</span>
                                                <span className="mx-2">&rarr;</span>
                                                <span className="text-white">{step.target}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-indigo-300">{step.platform}</span>
                                                <span className="text-emerald-300">w={step.weight}</span>
                                                {step.transition && (
                                                    <span className="text-red-400">{step.transitionLabel}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {pathSteps.length === 0 && (
                                        <div className="text-xs text-gray-500">No edges in path.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <header className="flex justify-between items-center mb-8 bg-[#0a0a0a]/50 p-6 rounded-3xl border border-gray-900 backdrop-blur-md">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 bg-clip-text text-transparent uppercase tracking-tighter">
                        DMS INTELLIGENCE
                    </h1>
                    <p className="text-gray-500 font-medium tracking-wide">Advanced Graph Theory Engine | Real-time Streaming Matrix</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button onClick={() => setIsAboutOpen(true)} className="bg-gray-900 hover:bg-gray-800 border border-gray-800 p-3 rounded-full transition-all group">
                        <Info size={20} className="text-gray-400 group-hover:text-blue-400" />
                    </button>
                    <div className="bg-gray-900 border border-indigo-500/30 px-6 py-2 rounded-full flex items-center space-x-3 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
                        <div className="flex space-x-1">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="w-1 bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.1}s`, height: `${8 + i * 4}px` }}></div>
                            ))}
                        </div>
                        <span className="text-xs font-black tracking-widest text-indigo-100 uppercase">Live Flux</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6 backdrop-blur-md relative">
                        <div className="flex justify-between items-center mb-6 px-2">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-500/10 rounded-xl"><Activity className="text-blue-400" size={20} /></div>
                                <div>
                                    <h2 className="text-xl font-bold">Dynamic Interaction Mapping</h2>
                                    <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Streaming Social Vectors</p>
                                </div>
                            </div>
                            <div className="flex space-x-4 items-center">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-600 uppercase">Network Pulse</p>
                                    <p className="text-sm font-bold text-indigo-400">{pulse.current_load} OPS</p>
                                </div>
                                <div className="w-32 h-8 flex items-end space-x-0.5">
                                    {pulse.velocity.map((v, i) => (
                                        <div key={i} className="bg-indigo-500/30 w-full rounded-t-sm" style={{ height: `${Math.min(100, v.count * 10)}%` }}></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-gray-800 bg-[#0a0a0a] px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Platform</span>
                                <select
                                    value={platformFilter}
                                    onChange={(e) => setPlatformFilter(e.target.value)}
                                    className="bg-black/40 border border-gray-800 text-gray-200 text-xs px-3 py-1 rounded-lg"
                                >
                                    <option value="All">All</option>
                                    {platformOptions.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Community</span>
                                <select
                                    value={communityFilter}
                                    onChange={(e) => setCommunityFilter(e.target.value)}
                                    className="bg-black/40 border border-gray-800 text-gray-200 text-xs px-3 py-1 rounded-lg"
                                >
                                    <option value="All">All</option>
                                    {communityOptions.map((c) => (
                                        <option key={c} value={String(c)}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="ml-auto flex items-center gap-3 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                <span>{filteredNodes.length} nodes</span>
                                <span>{filteredLinks.length} links</span>
                                <button
                                    onClick={() => { setPlatformFilter('All'); setCommunityFilter('All'); }}
                                    className="border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 px-3 py-1 rounded-lg"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={openPathDialog}
                                    className="border border-indigo-700 text-indigo-300 hover:text-white hover:border-indigo-500 px-3 py-1 rounded-lg"
                                >
                                    Find Path
                                </button>
                            </div>
                        </div>
                        <NetworkGraph
                               data={layoutGraph}
                               visibleLinks={filteredGraph.links}
                            onNodeClick={triggerSimulation}
                            highlightedEdges={highlightedEdges}
                        />
                    </div>

                    <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8 relative">
                        <h2 className="text-xl font-bold mb-6 flex items-center text-white"><TrendingUp className="mr-3 text-purple-400" /> Viral Propagation Simulation</h2>
                        {simulationResult ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-indigo-900/20 border border-indigo-500/30 p-6 rounded-2xl">
                                    <p className="text-xs text-indigo-400 uppercase tracking-widest font-black mb-1 text-white">Impact Reach</p>
                                    <p className="text-4xl font-black text-white">{simulationResult.active_total}</p>
                                </div>
                                <div className="bg-purple-900/20 border border-purple-500/30 p-6 rounded-2xl">
                                    <p className="text-xs text-purple-400 uppercase tracking-widest font-black mb-1 text-white">Time to Peak</p>
                                    <p className="text-4xl font-black text-white">{simulationResult.steps}</p>
                                </div>
                                <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-2xl truncate">
                                    <p className="text-xs text-blue-400 uppercase tracking-widest font-black mb-1 text-white">Seed Account</p>
                                    <p className="text-xl font-black mt-2 text-white">{activeNode}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-center">
                                <p className="text-gray-500 font-medium mb-2 italic">Engagement Node Required</p>
                                <p className="text-[10px] text-gray-700 tracking-widest uppercase font-bold">Independent Cascade Model (ICM) Active</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-8">
                    {/* Bridge Influencers Panel - NEW ADVANCED INSIGHT */}
                    <div className="bg-gray-900/40 border border-blue-800/30 rounded-3xl p-6">
                        <h2 className="text-lg font-bold mb-6 flex items-center justify-between">
                            <div className="flex items-center"><GitMerge size={18} className="mr-3 text-blue-400" /> Bridge Influencers</div>
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-2 py-1 bg-blue-500/5 border border-blue-500/20 rounded-md">Betweenness</span>
                        </h2>
                        <div className="space-y-4">
                            {bridges.map((br, i) => (
                                <div key={i} className="bg-[#0a0a0a] p-4 rounded-2xl border border-gray-800 flex items-center justify-between group overflow-hidden relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
                                    <span className="font-bold text-gray-300 group-hover:text-white transition-colors">{br.node}</span>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-blue-500 uppercase">Bridge Score</p>
                                        <p className="text-xs font-mono font-bold text-white">{br.score}</p>
                                    </div>
                                </div>
                            ))}
                            {bridges.length === 0 && <p className="text-xs text-gray-600 italic text-center">Identifying network bridges...</p>}
                        </div>
                        <p className="text-[9px] text-gray-600 mt-4 text-center px-4 leading-relaxed italic">Bridge Influencers connect different communities and prevent information silos. High Betweenness indicates high "Brokerage Power".</p>
                    </div>

                    <div className="bg-[#0a0a0a] border border-gray-900 rounded-3xl p-6 h-[350px] flex flex-col shadow-inner">
                        <h2 className="text-lg font-bold mb-6 flex items-center justify-between">
                            <div className="flex items-center"><Send size={18} className="mr-3 text-green-400" /> Interaction Stream</div>
                        </h2>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                            {events.map((e, i) => (
                                <div key={i} className="text-xs bg-gray-900/30 p-3 rounded-xl border border-gray-800/50 flex flex-col">
                                    <p className="text-gray-400"><span className="text-white font-bold">{e.source}</span> → <span className="text-white font-bold">{e.target}</span></p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{e.platform}</span>
                                        <span className="text-[8px] text-gray-600">{new Date(e.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6">
                        <h2 className="text-lg font-bold mb-6 flex items-center justify-between">
                            <div className="flex items-center"><Layers size={18} className="mr-3 text-green-400" /> Community Matrix</div>
                            <span className="text-[10px] font-black text-green-500/80 uppercase tracking-widest px-2 py-1 bg-green-500/5 border border-green-500/20 rounded-md">Live Clusters</span>
                        </h2>
                        <div className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-2xl text-center">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-2">Discrete Clusters</p>
                            <p className="text-4xl font-black text-white">{communityCount}</p>
                        </div>
                    </div>

                    <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6">
                        <h2 className="text-lg font-bold mb-6 flex items-center"><Users size={18} className="mr-3 text-yellow-500" /> Top Power Players</h2>
                        <div className="space-y-3">
                            {influencers.map((inf, i) => (
                                <div key={i} className="flex justify-between items-center bg-[#0a0a0a] p-3 rounded-xl border border-gray-800 hover:border-yellow-500/30 transition-all text-white">
                                    <span className="font-bold text-sm truncate max-w-[120px]">{inf.node}</span>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-16 bg-gray-900 h-1 rounded-full overflow-hidden">
                                            <div className="bg-yellow-500 h-full" style={{ width: `${inf.score * 100}%` }}></div>
                                        </div>
                                        <span className="text-[9px] font-black text-yellow-500">{inf.score}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6">
                        <h2 className="text-lg font-bold mb-6 flex items-center"><Activity size={18} className="mr-3 text-indigo-400" /> Network Structure</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-4 text-center">
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Density</p>
                                <p className="text-xl font-black text-white">{networkSummary.density ?? 0}</p>
                            </div>
                            <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-4 text-center">
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Avg Degree</p>
                                <p className="text-xl font-black text-white">{networkSummary.avg_degree ?? 0}</p>
                            </div>
                            <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-4 text-center">
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Clustering</p>
                                <p className="text-xl font-black text-white">{networkSummary.avg_clustering ?? 0}</p>
                            </div>
                            <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-4 text-center">
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Components</p>
                                <p className="text-xl font-black text-white">{networkSummary.components ?? 0}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-between text-[10px] text-gray-500 font-black uppercase tracking-widest">
                            <span>Largest Component</span>
                            <span>{Math.round(((networkSummary.largest_component_ratio ?? 0) * 100))}%</span>
                        </div>
                        <div className="mt-2 flex justify-between text-[10px] text-gray-500 font-black uppercase tracking-widest">
                            <span>Bridge Edges</span>
                            <span>{networkSummary.bridges ?? 0}</span>
                        </div>
                    </div>

                    <div className="bg-gray-900/40 border border-purple-900/30 rounded-3xl p-6">
                        <h2 className="text-lg font-bold mb-6 flex items-center"><Zap size={18} className="mr-3 text-purple-400" /> Path Analysis</h2>
                        <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-4">
                            <div className="flex items-center justify-between text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                <span>Avg Shortest Path</span>
                                <span>{networkSummary.avg_shortest_path ?? 'n/a'}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-500 font-black uppercase tracking-widest mt-3">
                                <span>Weighted Flow</span>
                                <span>{networkSummary.weighted_avg_shortest_path ?? 'n/a'}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-500 font-black uppercase tracking-widest mt-3">
                                <span>Diameter</span>
                                <span>{networkSummary.diameter ?? 'n/a'}</span>
                            </div>
                        </div>
                        <p className="text-[9px] text-gray-600 mt-4 text-center px-4 leading-relaxed italic">Shorter paths mean faster information flow. Weighted flow treats stronger links as shorter distances.</p>
                    </div>

                    <div className="bg-gray-900/40 border border-emerald-900/30 rounded-3xl p-6">
                        <h2 className="text-lg font-bold mb-6 flex items-center"><Layers size={18} className="mr-3 text-emerald-400" /> Strongest Connections</h2>
                        <div className="space-y-3">
                            {(networkSummary.strongest_connections || []).map((edge, i) => (
                                <div key={i} className="bg-[#0a0a0a] p-3 rounded-xl border border-emerald-900/20">
                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-emerald-300">
                                        <span>{edge.source}</span>
                                        <span>→</span>
                                        <span>{edge.target}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-white mt-2">
                                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Strength</span>
                                        <span className="text-xs font-black text-emerald-300">{edge.weight}</span>
                                    </div>
                                </div>
                            ))}
                            {(networkSummary.strongest_connections || []).length === 0 && (
                                <p className="text-xs text-gray-600 italic text-center">No strong connections yet.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-900/40 border border-purple-900/30 rounded-3xl p-6">
                        <h2 className="text-lg font-bold mb-6 flex items-center"><Target size={18} className="mr-3 text-purple-400" /> Predictive Links</h2>
                        <div className="space-y-4">
                            {predictions.map((p, i) => (
                                <div key={i} className="bg-[#0a0a0a] p-4 rounded-xl border border-purple-900/20">
                                    <div className="flex justify-between font-black text-[9px] mb-2 tracking-widest uppercase text-white">
                                        <span className="text-purple-300">{p.source}</span>
                                        <span>⇌</span>
                                        <span className="text-purple-300">{p.target}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-white">
                                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Similarity Score</span>
                                        <span className="text-xs font-black text-indigo-400">{(p.similarity * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
