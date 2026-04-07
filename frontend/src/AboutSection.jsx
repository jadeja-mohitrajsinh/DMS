import React from 'react';
import { BookOpen, Zap, Users, Share2, Target, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AboutSection = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-[#0a0a0a] border border-gray-800 w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl p-8 shadow-2xl custom-scrollbar"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-black text-white mb-2">Real-Time Social Network Analysis</h2>
                <p className="text-indigo-400 font-medium tracking-wide">Graph Theory in the Streaming Era</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                <X className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-8 text-gray-400 leading-relaxed">
              <p>
                Traditional social network analysis is typically performed on static datasets, where relationships between entities are fixed during computation. However, real-world social networks are highly dynamic, with interactions continuously evolving over time.
              </p>

              <p>
                To address this limitation, the proposed system extends graph theory concepts into a real-time environment. In this approach, the social network is modeled as a <strong>dynamic graph</strong>:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                  <div className="flex items-center space-x-3 mb-2">
                    <Users className="text-blue-400" size={20} />
                    <span className="text-white font-bold">Nodes</span>
                  </div>
                  <p className="text-sm">Represent users or entities within the ecosystem.</p>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                  <div className="flex items-center space-x-3 mb-2">
                    <Share2 className="text-purple-400" size={20} />
                    <span className="text-white font-bold">Edges</span>
                  </div>
                  <p className="text-sm">Represent interactions such as follows, likes, comments, or messages.</p>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mt-12 mb-4">Key Enhancements Using Graph Theory</h3>

              <div className="space-y-4">
                {[
                  { title: "Dynamic Graph Updates", icon: <Activity className="text-blue-400" />, desc: "The graph structure is updated incrementally as new edges are formed, allowing continuous tracking of network evolution." },
                  { title: "Real-Time Centrality Analysis", icon: <Zap className="text-yellow-400" />, desc: "Measures such as Degree, Betweenness, and Closeness centrality are recalculated periodically to identify influential nodes as the network changes." },
                  { title: "Live Community Detection", icon: <Users className="text-green-400" />, desc: "Community structures are updated dynamically using algorithms like Girvan-Newman, enabling detection of emerging clusters." },
                  { title: "Continuous Link Prediction", icon: <Target className="text-red-400" />, desc: "Graph-based similarity measures such as Jaccard Coefficient are applied in real time to suggest potential future connections." },
                  { title: "Streaming-Based Viral Propagation", icon: <Share2 className="text-indigo-400" />, desc: "The Independent Cascade Model (ICM) is applied on the evolving graph to simulate how information spreads across the network over time." }
                ].map((item, i) => (
                  <div key={i} className="flex space-x-4 p-4 rounded-2xl hover:bg-gray-900/40 transition-colors border border-transparent hover:border-gray-800">
                    <div className="mt-1">{item.icon}</div>
                    <div>
                      <h4 className="text-gray-100 font-bold">{item.title}</h4>
                      <p className="text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-gray-800">
                <h3 className="text-xl font-bold text-white mb-4">Significance</h3>
                <ul className="list-disc pl-5 space-y-2 text-sm italic">
                  <li>Up-to-date insights into influencer dynamics</li>
                  <li>Immediate detection of trending communities</li>
                  <li>Better prediction of information diffusion patterns</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AboutSection;
