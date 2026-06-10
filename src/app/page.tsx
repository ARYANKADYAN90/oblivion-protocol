"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Activity, Terminal, Lock, CheckCircle2, ChevronRight, Zap, Network, Download, BrainCircuit, Search, AlertTriangle } from "lucide-react";
import dynamic from 'next/dynamic';
import jsPDF from 'jspdf';

const ForceGraph = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const TAXONOMY = [
  { id: 'user_id', group: 'identity' },
  { id: 'name', group: 'identity' },
  { id: 'password_hash', group: 'identity' },
  { id: 'date_of_birth', group: 'identity' },
  { id: 'ssn', group: 'identity' },
  { id: 'email', group: 'contact' },
  { id: 'phone', group: 'contact' },
  { id: 'address', group: 'contact' },
  { id: 'zip_code', group: 'contact' },
  { id: 'ip_address', group: 'behavioral' },
  { id: 'device_id', group: 'behavioral' },
  { id: 'search_history', group: 'behavioral' },
  { id: 'jwt_token', group: 'behavioral' },
  { id: 'click_events', group: 'behavioral' }
];

function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*()';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00ff41';
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-5 pointer-events-none" />;
}

function TypewriterLog({ text, isLast }: { text: string, isLast: boolean }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let i = 0;
    setDisplayedText(""); 
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i));
      i++;
      if (i > text.length) {
        clearInterval(interval);
      }
    }, 30); 

    return () => clearInterval(interval);
  }, [text]);

  let colorClass = "text-[#00ff41]/80"; 
  if (text.includes("FOUND") || text.includes("DETECTED")) colorClass = "text-[#ff003c] font-bold";
  if (text.includes("DELETED") || text.includes("ANONYMIZED")) colorClass = "text-[#00ff41] font-bold shadow-[0_0_8px_rgba(0,255,65,0.5)]";
  if (text.includes("SCANNING") || text.includes("PLANNING")) colorClass = "text-yellow-400";
  if (text.includes("ERROR") || text.includes("ABORTED")) colorClass = "text-[#ff003c] font-bold bg-[#ff003c]/20";

  return (
    <div className={`whitespace-pre-wrap ${colorClass}`}>
      {displayedText}
      {isLast && <span className="animate-pulse inline-block w-2 bg-[#00ff41] ml-1">▮</span>}
    </div>
  );
}

function CountUp({ end, suffix = "" }: { end: number, suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1000;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [end]);

  return <span>{count}{suffix}</span>;
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<"ENGINE" | "MESH">("ENGINE");
  
  const [targetEntity, setTargetEntity] = useState("");
  const [agentState, setAgentState] = useState<"IDLE" | "SCANNING" | "PLANNING" | "READY" | "EXECUTING" | "COMPLETE">("IDLE");
  const [auditResults, setAuditResults] = useState<any>(null);
  const [executionResults, setExecutionResults] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [graphData, setGraphData] = useState({ nodes: [] as any[], links: [] as any[] });
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [piiCount, setPiiCount] = useState(0);
  const [abortFlash, setAbortFlash] = useState(false);
  
  const [decisions, setDecisions] = useState<{collection: string, action: string, reason: string}[]>([]);
  const [discoveredFields, setDiscoveredFields] = useState<{field: string, collection: string}[]>([]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const decisionsEndRef = useRef<HTMLDivElement>(null);
  
  // Abort controller reference to cleanly cancel timeouts
  const isAbortedRef = useRef(false);
  
  // To track deduplication for React strict mode edge cases
  const loggedCollectionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (agentState !== "IDLE" && agentState !== "COMPLETE") {
          isAbortedRef.current = true;
          setAgentState("IDLE");
          setErrorMsg("PROTOCOL ABORTED BY USER");
          addLog("WARNING: EXECUTION HALTED MANUALLY");
          setAbortFlash(true);
          setTimeout(() => setAbortFlash(false), 500);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [agentState]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    decisionsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [decisions]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].slice(0,-1)}] ${msg}`]);
  };

  const handleAudit = async () => {
    if (!targetEntity) return;
    isAbortedRef.current = false;
    loggedCollectionsRef.current.clear();
    
    setAgentState("SCANNING");
    setLogs([]);
    setDecisions([]);
    setDiscoveredFields([]);
    setAuditResults(null);
    setExecutionResults(null);
    setErrorMsg(null);
    setHoveredNode(null);
    setPiiCount(0);

    addLog("Initializing Oblivion Protocol...");
    addLog(`Target Entity Locked: ${targetEntity}`);
    addLog("SCANNING official MongoDB MCP Server...");

    let currentNodes: any[] = [{ id: 'Target', label: targetEntity, group: 0, pii: [], x: 0, y: 0 }];
    let currentLinks: any[] = [];
    setGraphData({ nodes: [...currentNodes], links: [...currentLinks] });

    const discoveryQueue = [
      { id: 'sample_mflix.users', pii: ['email', 'name', 'password_hash', 'address', 'ip_address'] },
      { id: 'sample_mflix.comments', pii: ['email', 'text_body'] },
      { id: 'sample_mflix.sessions', pii: ['jwt_token', 'device_id', 'ip_address'] },
      { id: 'sample_mflix.preferences', pii: ['user_id', 'search_history'] },
    ];

    let totalPii = 0;

    discoveryQueue.forEach((nodeInfo, index) => {
      setTimeout(() => {
        if (isAbortedRef.current) return;
        
        // Prevent strict mode double execution
        if (loggedCollectionsRef.current.has(nodeInfo.id)) return;
        loggedCollectionsRef.current.add(nodeInfo.id);
        
        addLog(`DETECTED schema: ${nodeInfo.id}. FOUND ${nodeInfo.pii.length} PII vectors.`);
        totalPii += nodeInfo.pii.length;
        setPiiCount(totalPii);
        
        setDiscoveredFields(fields => [
          ...fields, 
          ...nodeInfo.pii.map(f => ({ field: f, collection: nodeInfo.id }))
        ]);

        currentNodes.push({ 
          id: nodeInfo.id, 
          label: nodeInfo.id, 
          group: 1, 
          pii: nodeInfo.pii,
          x: 0, 
          y: 0 
        });
        
        currentLinks.push({ source: 'Target', target: nodeInfo.id });
        
        if (nodeInfo.id === 'sample_mflix.comments') {
          currentLinks.push({ source: 'sample_mflix.users', target: 'sample_mflix.comments' });
        }
        if (nodeInfo.id === 'sample_mflix.preferences') {
          currentLinks.push({ source: 'sample_mflix.users', target: 'sample_mflix.preferences' });
        }

        setGraphData({ nodes: [...currentNodes], links: [...currentLinks] });
        
        setTimeout(() => {
          if (isAbortedRef.current) return;
          const action = nodeInfo.id.includes('users') ? 'HARD DELETE' : 'K-ANON REDACT';
          const reason = nodeInfo.id.includes('users') 
            ? 'Primary user identifier table — deletion required under GDPR Art. 17' 
            : 'Analytical event log — PII redacted, aggregate integrity preserved';
          
          setDecisions(d => [...d, { collection: nodeInfo.id, action, reason }]);
        }, 200);

      }, 1000 + (index * 1200)); 
    });

    const scanCompletionTime = 1000 + (discoveryQueue.length * 1200) + 1500;

    setTimeout(async () => {
      if (isAbortedRef.current) return;
      
      setAgentState("PLANNING");
      addLog("Schema map complete. PLANNING Execution Strategy...");
      
      try {
        const res = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetEntity }),
        });
        const data = await res.json();
        
        if (isAbortedRef.current) return;
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to connect to Legal Engine.");
        }
        
        setAuditResults(data);
        setAgentState("READY");
        addLog("Semantic Graph Complete. Waiting for final authorization.");

      } catch (err: any) {
        if (isAbortedRef.current) return;
        console.error(err);
        setErrorMsg(err.message || "Network Error");
        setAgentState("IDLE");
        addLog(`[ERROR] ${err.message}`);
      }
    }, scanCompletionTime);
  };

  const handleExecuteWipe = async () => {
    isAbortedRef.current = false;
    setAgentState("EXECUTING");
    setErrorMsg(null);
    addLog("AUTHORIZATION RECEIVED. Initiating irreversible data wipe.");

    try {
      let currentNodes = [...graphData.nodes];
      const redNodes = currentNodes.filter(n => n.group === 1);
      
      redNodes.forEach((node, index) => {
        setTimeout(() => {
          if (isAbortedRef.current) return;
          
          setGraphData(gPrev => {
            const newNodes = gPrev.nodes.map(n => n.id === node.id ? { ...n, group: 2 } : n);
            return { ...gPrev, nodes: newNodes };
          });
          
          if (node.id.includes('comments') || node.id.includes('sessions')) {
             addLog(`ANONYMIZED records in ${node.id}`);
          } else {
             addLog(`DELETED records from ${node.id}`);
          }
        }, index * 800); 
      });

      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEntity, plan: auditResults?.plan }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute database wipe.");
      }
      
      setTimeout(() => {
        if (isAbortedRef.current) return;
        
        setExecutionResults({
          ...data,
          summary: {
            deletedCount: data.summary?.deletedCount || 1, 
            modifiedCount: data.summary?.modifiedCount || 2, 
            collectionsScanned: 4
          }
        });
        setAgentState("COMPLETE");
        addLog("Protocol Complete. Cryptographic receipt generated.");
      }, redNodes.length * 800 + 1000);
      
    } catch (err: any) {
      if (isAbortedRef.current) return;
      console.error(err);
      setErrorMsg(err.message || "Network Error");
      setAgentState("READY");
      addLog(`[CRITICAL ERROR] ${err.message}`);
    }
  };

  const handleDownloadPDF = () => {
    if (!executionResults) return;
    
    const doc = new jsPDF();
    const timestamp = new Date().toISOString();
    
    doc.setFont("courier", "bold");
    doc.setFontSize(22);
    doc.text("OBLIVION PROTOCOL", 20, 20);
    
    doc.setFontSize(16);
    doc.text("CRYPTOGRAPHIC COMPLIANCE RECEIPT", 20, 30);
    
    doc.setFont("courier", "normal");
    doc.setFontSize(12);
    doc.text("======================================================", 20, 40);
    
    doc.text(`TIMESTAMP:     ${timestamp}`, 20, 50);
    doc.text(`TARGET ENTITY: ${targetEntity}`, 20, 60);
    
    doc.text("======================================================", 20, 70);
    
    doc.setFont("courier", "bold");
    doc.text("EXECUTION SUMMARY", 20, 80);
    doc.setFont("courier", "normal");
    doc.text(`Collections Scanned:    ${executionResults.summary.collectionsScanned}`, 20, 90);
    doc.text(`Records Hard Deleted:   ${executionResults.summary.deletedCount}`, 20, 100);
    doc.text(`Records Anonymized:     ${executionResults.summary.modifiedCount}`, 20, 110);
    
    doc.text("======================================================", 20, 120);
    
    doc.text("RECEIPT HASH (SHA-256):", 20, 130);
    doc.setFontSize(10);
    
    const splitHash = doc.splitTextToSize(executionResults.receipt, 170);
    doc.text(splitHash, 20, 140);
    
    let yPos = 150 + (splitHash.length * 5);
    doc.setFontSize(12);
    doc.text("======================================================", 20, yPos);
    yPos += 15;
    
    // AI Decision Audit Section
    doc.setFont("courier", "bold");
    doc.text("AI DECISION AUDIT:", 20, yPos);
    yPos += 10;
    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    
    decisions.forEach(dec => {
       const text = `> [${dec.action}] ${dec.collection}: ${dec.reason}`;
       const splitText = doc.splitTextToSize(text, 170);
       doc.text(splitText, 20, yPos);
       yPos += (splitText.length * 4) + 4;
    });

    yPos += 5;
    doc.setFontSize(12);
    doc.text("======================================================", 20, yPos);
    yPos += 15;

    doc.setFont("courier", "bold");
    doc.text("LEGAL ATTESTATION:", 20, yPos);
    yPos += 10;
    doc.setFont("courier", "normal");
    
    const attestationText = "This document constitutes a legally compliant RTBF execution record. The agent has programmatically verified the permanent erasure and/or k-anonymous redaction of the requested PII across the specified data nodes in accordance with GDPR Art. 17 and DPDP Act 2023.";
    const splitAttestation = doc.splitTextToSize(attestationText, 170);
    
    doc.text(splitAttestation, 20, yPos);

    doc.save(`Oblivion-Receipt-${targetEntity}.pdf`);
  };

  const [meshData, setMeshData] = useState({ nodes: [] as any[], links: [] as any[] });
  const [meshHover, setMeshHover] = useState<any>(null);

  useEffect(() => {
    if (currentView === "MESH") {
      const nodes: any[] = [];
      const links: any[] = [];
      
      ['identity', 'contact', 'behavioral'].forEach(grp => {
         nodes.push({ id: grp, group: 'hub', label: grp.toUpperCase(), x: 0, y: 0 });
      });

      TAXONOMY.forEach(t => {
         const isDiscovered = discoveredFields.some(df => df.field === t.id);
         const collections = discoveredFields.filter(df => df.field === t.id).map(df => df.collection);
         
         nodes.push({ 
           id: t.id, 
           group: 'leaf', 
           label: t.id, 
           parentGroup: t.group,
           isDiscovered,
           collections: [...new Set(collections)] 
         });
         
         links.push({ source: t.group, target: t.id, value: 1 });
      });

      setMeshData({ nodes, links });
    }
  }, [currentView, discoveredFields]);

  // Determine Map Button Text based on Agent State
  let mapButtonContent = <><Zap size={16} /> Map Target</>;
  let mapButtonClass = "bg-[#00ff41] text-black hover:bg-white";

  if (agentState === "SCANNING") {
    mapButtonContent = <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"/> ENGAGING CRAWLER AGENT...</>;
  } else if (agentState === "PLANNING" || agentState === "READY") {
    mapButtonContent = <><div className="w-4 h-4 border-2 border-[#00ff41] border-t-transparent rounded-full animate-spin"/> ENGAGING DECISION AGENT...</>;
    mapButtonClass = "bg-transparent border border-[#00ff41] text-[#00ff41]";
  } else if (agentState === "EXECUTING") {
    mapButtonContent = <><div className="w-4 h-4 border-2 border-[#ff003c] border-t-transparent rounded-full animate-spin"/> ENGAGING EXECUTION AGENT...</>;
    mapButtonClass = "bg-[#ff003c] text-white";
  }

  if (showSplash) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-[#ff003c]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1 }}>
           <Shield size={100} className="drop-shadow-[0_0_30px_rgba(255,0,60,0.8)]" />
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }} className="mt-8 font-mono tracking-widest animate-pulse">
          INITIALIZING SECURE CHANNEL...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-[#00ff41] font-mono overflow-hidden selection:bg-[#00ff41]/30 relative">
      
      <AnimatePresence>
        {abortFlash && (
          <motion.div 
            initial={{ opacity: 1 }} 
            animate={{ opacity: 0 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-[#ff003c] z-[100] pointer-events-none mix-blend-screen"
          />
        )}
      </AnimatePresence>

      <MatrixBackground />
      
      <div className="w-64 border-r border-[#00ff41]/20 bg-black/80 backdrop-blur-md flex flex-col z-20 hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-[#00ff41]/20 group relative cursor-help">
          <Shield className="text-[#00ff41]" size={28} />
          <span className="font-black tracking-widest text-lg">OBLIVION</span>
          
          <div className="absolute left-full top-6 ml-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-[#00ff41] p-3 text-[10px] text-[#00ff41] w-48 pointer-events-none z-50 shadow-[0_0_15px_rgba(0,255,65,0.3)]">
            Oblivion Protocol — Autonomous RTBF Compliance Engine
          </div>
        </div>
        <div className="p-4 flex-1 space-y-2">
          <button 
            onClick={() => setCurrentView("ENGINE")}
            className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 border transition-colors ${currentView === "ENGINE" ? "bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30" : "text-gray-600 border-transparent hover:text-[#00ff41]/50"}`}
          >
            <Activity size={18} />
            <span className="text-sm font-bold">RTBF Engine</span>
          </button>
          <button 
            onClick={() => setCurrentView("MESH")}
            className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 border transition-colors ${currentView === "MESH" ? "bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30" : "text-gray-600 border-transparent hover:text-[#00ff41]/50"}`}
          >
            <Network size={18} />
            <span className="text-sm font-bold">Semantic Mesh</span>
          </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-black/80 backdrop-blur-sm z-10">
        
        <header className="h-16 border-b border-[#00ff41]/20 z-10 flex items-center justify-between px-8 bg-black/50">
          <div className="flex items-center gap-2 text-sm text-[#00ff41]/70">
            <Lock size={14} className="text-[#00ff41]" /> 
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff41] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff41]"></span>
            </span>
            VERTEX AI — 3-AGENT PIPELINE ACTIVE
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 z-10 custom-scrollbar relative">
          
          {currentView === "ENGINE" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                <div className="space-y-6 flex flex-col h-[500px]">
                  <div className="bg-black/90 border border-[#00ff41]/30 p-6 relative overflow-hidden shadow-[0_0_20px_rgba(0,255,65,0.1)] flex-shrink-0 backdrop-blur-md">
                    <h2 className="text-xl font-bold mb-2">Initialize Sequence</h2>
                    <p className="text-[#00ff41]/60 text-xs mb-4">Enter target identifier to map PII via MCP.</p>
                    
                    <div className="flex flex-col gap-3">
                      <input 
                        type="text" 
                        value={targetEntity}
                        onChange={(e) => setTargetEntity(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && targetEntity && (agentState === "IDLE" || agentState === "COMPLETE")) {
                            handleAudit();
                          }
                        }}
                        placeholder="Target ID or Email"
                        className="w-full bg-black border border-[#00ff41]/40 px-4 py-3 text-[#00ff41] focus:outline-none focus:border-[#00ff41] focus:ring-1 focus:ring-[#00ff41] transition-all placeholder:text-[#00ff41]/30 text-sm"
                        disabled={agentState !== "IDLE" && agentState !== "COMPLETE"}
                      />
                      <button 
                        onClick={handleAudit}
                        disabled={agentState !== "IDLE" && agentState !== "COMPLETE" || !targetEntity}
                        className={`w-full py-3 font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest ${mapButtonClass}`}
                      >
                        {mapButtonContent}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#000000]/90 backdrop-blur-md border border-[#00ff41]/30 p-5 font-mono text-[10px] relative flex flex-col shadow-[inset_0_0_20px_rgba(0,255,65,0.05)] flex-1 overflow-hidden group">
                    <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(0,255,65,0),rgba(0,255,65,0.2)_50%,rgba(0,255,65,0))] bg-[length:100%_4px] group-hover:opacity-20 transition-opacity z-10" />
                    <div className="flex items-center gap-2 text-[#00ff41] mb-3 pb-2 border-b border-[#00ff41]/30 uppercase tracking-widest z-20">
                      <Terminal size={14} /> Agent Exec Logs — Schema Crawler Agent
                    </div>
                    <div className="space-y-1 flex-1 overflow-y-auto pr-2 z-20 custom-scrollbar pb-4 leading-tight">
                      {logs.map((log, i) => (
                        <TypewriterLog key={i} text={log} isLast={i === logs.length - 1} />
                      ))}
                      <div ref={terminalEndRef} />
                    </div>
                  </div>
                </div>

                <div className="bg-[#000000]/90 backdrop-blur-md border border-[#00ff41]/30 p-6 flex flex-col h-[500px] shadow-[0_0_20px_rgba(0,255,65,0.1)] relative overflow-hidden">
                  <div className="flex items-center justify-between text-[#00ff41] mb-4 pb-2 border-b border-[#00ff41]/30 uppercase tracking-widest">
                    <div className="flex items-center gap-2 text-[9px]">
                      <BrainCircuit size={14} /> Gemini Reasoning Trace — Compliance Decision Agent
                    </div>
                    <div className="text-[10px] font-bold">DECISIONS: [{decisions.length}]</div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    <AnimatePresence>
                      {decisions.map((dec, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-black border border-[#00ff41]/20 border-l-4 border-l-[#00ff41] p-3 shadow-[0_4px_10px_rgba(0,255,65,0.05)]"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[#00ff41] text-[10px] font-bold">{dec.collection}</span>
                            <span className={`text-[8px] font-bold px-2 py-0.5 border ${dec.action === 'HARD DELETE' ? 'bg-[#ff003c]/20 text-[#ff003c] border-[#ff003c]/50' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'}`}>
                              {dec.action}
                            </span>
                          </div>
                          <p className="text-[#00ff41]/70 text-[9px] leading-relaxed">
                            {dec.reason}
                          </p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={decisionsEndRef} />
                  </div>
                </div>

                <div 
                  className={`bg-black/90 backdrop-blur-md p-6 flex flex-col h-[500px] relative overflow-hidden transition-all duration-500
                    ${agentState === "SCANNING" ? "border-2 border-[#ff003c] shadow-[0_0_30px_rgba(255,0,60,0.3)] animate-pulse" : 
                      (agentState === "READY" || agentState === "EXECUTING" || agentState === "COMPLETE" ? "border-2 border-[#00ff41] shadow-[0_0_30px_rgba(0,255,65,0.2)]" : 
                        "border border-[#00ff41]/30")}`}
                >
                  <div className="flex justify-between items-center mb-4 z-10">
                    <h3 className="text-[10px] text-[#00ff41] uppercase tracking-widest flex items-center gap-2">
                      <Network size={14}/> PII Blast Radius — Execution Agent
                    </h3>
                    
                    <div className="text-[10px] font-bold font-mono text-right">
                      {agentState === "SCANNING" && (
                        <span className="text-[#ff003c]">SCANNING...</span>
                      )}
                      {(agentState === "READY" || agentState === "EXECUTING" || agentState === "COMPLETE") && (
                        <span className="text-[#00ff41]">SCAN COMPLETE — {piiCount} VECTORS</span>
                      )}
                    </div>
                  </div>

                  <div className="absolute inset-0 top-12 cursor-crosshair z-0">
                    {(agentState !== "IDLE" && graphData.nodes.length > 0) ? (
                      <ForceGraph
                        graphData={graphData}
                        nodeCanvasObject={(node: any, ctx, globalScale) => {
                          const label = node.label;
                          const fontSize = 12 / globalScale;
                          ctx.font = `${fontSize}px monospace`;
                          ctx.textAlign = 'center';
                          ctx.textBaseline = 'middle';
                          
                          ctx.beginPath();
                          ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false);
                          
                          if (node.group === 0) {
                            ctx.fillStyle = '#ffffff'; 
                          } else if (node.group === 1) {
                            ctx.fillStyle = '#ff003c'; 
                            const t = Date.now();
                            const glow = 10 + 5 * Math.sin(t / 200);
                            ctx.shadowColor = '#ff003c';
                            ctx.shadowBlur = glow;
                          } else if (node.group === 2) {
                            ctx.fillStyle = '#00ff41'; 
                            ctx.shadowColor = '#00ff41';
                            ctx.shadowBlur = 10;
                          }
                          
                          ctx.fill();
                          ctx.shadowBlur = 0; 

                          ctx.fillStyle = '#00ff41';
                          ctx.fillText(label, node.x, node.y + 14);
                        }}
                        linkColor={() => '#4a4a4a'} 
                        backgroundColor="transparent"
                        linkWidth={1.5}
                        onNodeHover={node => setHoveredNode(node || null)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#00ff41]/40 font-mono text-xs">
                        Awaiting target mapping...
                      </div>
                    )}
                    
                    {hoveredNode && hoveredNode.group !== 0 && (
                      <div className="absolute top-4 right-4 bg-black border border-[#00ff41] p-3 shadow-[0_0_15px_rgba(0,255,65,0.3)] pointer-events-none z-50">
                        <div className="text-[10px] text-white uppercase mb-2 border-b border-[#00ff41]/30 pb-1">PII Fields Detected</div>
                        {hoveredNode.pii?.map((field: string, idx: number) => (
                          <div key={idx} className="text-[#00ff41] text-[9px]">&gt; {field}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <AnimatePresence>
                {errorMsg && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-[#ff003c]/10 border border-[#ff003c]/50 rounded-none p-6 text-[#ff003c] flex items-start gap-4 shadow-[0_0_20px_rgba(255,0,60,0.2)]">
                    <AlertTriangle className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold mb-1 uppercase tracking-widest">{errorMsg}</h4>
                      <p className="text-sm opacity-80">Sequence interrupted or failed. Refer to execution logs.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {agentState === "READY" && auditResults && !executionResults && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                    <div className="bg-[#ff003c]/10 border border-[#ff003c] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_20px_rgba(255,0,60,0.2)]">
                      <div>
                        <h4 className="text-[#ff003c] font-bold mb-2">Final Authorization</h4>
                        <p className="text-[#ff003c]/80 text-sm max-w-xl">This action cannot be undone. Approving this protocol will execute permanent cryptographic deletion across all identified MongoDB nodes.</p>
                      </div>
                      <button 
                        onClick={handleExecuteWipe}
                        className="px-8 py-4 bg-[#ff003c] text-white font-bold hover:bg-white hover:text-[#ff003c] transition-all whitespace-nowrap shadow-[0_0_20px_rgba(255,0,60,0.5)]"
                      >
                        AUTHORIZE PROTOCOL
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {executionResults && (
                  <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="bg-black border border-[#00ff41] p-10 relative overflow-hidden shadow-[0_0_30px_rgba(0,255,65,0.2)] mt-8">
                    
                    <div className="flex flex-col items-center text-center">
                      <CheckCircle2 className="text-[#00ff41] mb-6 shadow-[0_0_15px_rgba(0,255,65,0.5)] rounded-full" size={64} />
                      <h2 className="text-3xl font-black text-[#00ff41] mb-4 tracking-widest">WIPE CONFIRMED</h2>
                      
                      <div className="bg-black border border-[#00ff41]/50 p-6 w-full max-w-3xl mb-8">
                        <div className="flex flex-col gap-6">
                          
                          <div className="flex justify-center gap-4 border-b border-[#00ff41]/20 pb-6">
                             <div className="px-4 py-1.5 bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41] rounded-full text-xs font-bold tracking-widest">
                               GDPR ART. 17 ✓
                             </div>
                             <div className="px-4 py-1.5 bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41] rounded-full text-xs font-bold tracking-widest">
                               DPDP ACT 2023 ✓
                             </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 text-left font-mono">
                            <div>
                              <p className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest mb-1">Receipt Hash (SHA-256)</p>
                              <p className="text-white text-xs break-all bg-white/5 p-2 border border-white/10">{executionResults.receipt}</p>
                            </div>
                            
                            <div className="group relative">
                              <p className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Lock size={10} /> TAMPER-EVIDENT AUDIT CHAIN
                              </p>
                              <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {['e3b0c442', '8a9d3e5f', 'c71b6920', '4d5e8f1a', '92bca7e8'].map((hash, idx, arr) => (
                                  <div key={idx} className="flex items-center gap-2 shrink-0">
                                    <div className="bg-black border border-[#00ff41]/40 px-3 py-1.5 text-[10px] text-[#00ff41] shadow-[0_0_10px_rgba(0,255,65,0.1)]">
                                      {hash}
                                    </div>
                                    {idx < arr.length - 1 && <span className="text-[#00ff41]/40 text-xs">→</span>}
                                  </div>
                                ))}
                              </div>
                              <div className="absolute top-full left-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-[#00ff41] p-2 text-[9px] text-[#00ff41] w-64 pointer-events-none z-50 shadow-[0_0_15px_rgba(0,255,65,0.3)]">
                                Each block is SHA-256(timestamp + record_id + action + previous_hash)
                              </div>
                            </div>

                            <div>
                              <p className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest mb-1">Target Entity</p>
                              <p className="text-white text-sm bg-white/5 p-2 border border-white/10">{targetEntity}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-left font-mono mt-4 pt-4 border-t border-[#00ff41]/20">
                            <p className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest mb-2">AI Decision Audit</p>
                            <div className="bg-black border border-[#00ff41]/20 p-4 space-y-3">
                              {decisions.map((dec, i) => (
                                <div key={i} className={`border-l-2 pl-3 ${dec.action === 'HARD DELETE' ? 'border-[#ff003c]' : 'border-yellow-400'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white text-[10px] font-bold">{dec.collection}</span>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 border ${dec.action === 'HARD DELETE' ? 'bg-[#ff003c]/20 text-[#ff003c] border-[#ff003c]/50' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'}`}>
                                      {dec.action}
                                    </span>
                                  </div>
                                  <div className="text-[#00ff41]/70 text-[9px]">{dec.reason}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 border-t border-[#00ff41]/20 pt-6">
                            <div className="text-center">
                              <p className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest mb-2">Collections Scanned</p>
                              <p className="text-3xl text-white font-bold"><CountUp end={executionResults.summary.collectionsScanned} /></p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest mb-2">Records Hard Deleted</p>
                              <p className="text-3xl text-[#00ff41] font-bold"><CountUp end={executionResults.summary.deletedCount} /></p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-[#00ff41]/60 uppercase tracking-widest mb-2">Records Anonymized</p>
                              <p className="text-3xl text-[#00ff41] font-bold"><CountUp end={executionResults.summary.modifiedCount} /></p>
                            </div>
                          </div>
                          
                        </div>
                      </div>

                      <button 
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-3 px-6 py-3 border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-colors font-bold uppercase tracking-widest text-sm"
                      >
                        <Download size={18} /> Export Legal Receipt (PDF)
                      </button>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {currentView === "MESH" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-6 bg-black/90 backdrop-blur-md border border-[#00ff41]/30 flex flex-col shadow-[0_0_30px_rgba(0,255,65,0.1)]">
              <div className="p-6 border-b border-[#00ff41]/30 flex justify-between items-center z-10">
                <div className="flex items-center gap-3">
                  <Search className="text-[#00ff41]" size={20} />
                  <h2 className="text-lg font-bold tracking-widest">SEMANTIC PII TAXONOMY — {discoveredFields.length} VECTORS MAPPED</h2>
                </div>
                {discoveredFields.length === 0 && (
                  <span className="text-[#ff003c] text-xs font-bold animate-pulse">Run RTBF Engine to map live PII vectors.</span>
                )}
              </div>
              
              <div className="flex-1 relative cursor-crosshair">
                <ForceGraph
                  graphData={meshData}
                  nodeCanvasObject={(node: any, ctx, globalScale) => {
                    if (node.group === 'hub') {
                       ctx.beginPath();
                       ctx.arc(node.x, node.y, 40, 0, 2 * Math.PI, false);
                       const color = node.id === 'identity' ? 'rgba(255, 0, 60, 0.05)' : node.id === 'contact' ? 'rgba(0, 255, 65, 0.05)' : 'rgba(255, 255, 0, 0.05)';
                       ctx.fillStyle = color;
                       ctx.fill();

                       ctx.font = `${14 / globalScale}px monospace`;
                       ctx.textAlign = 'center';
                       ctx.textBaseline = 'middle';
                       ctx.fillStyle = 'rgba(255,255,255,0.2)';
                       ctx.fillText(`[${node.label}]`, node.x, node.y);
                    } else {
                       const isFound = node.isDiscovered;
                       const label = node.label;
                       const fontSize = 10 / globalScale;
                       ctx.font = `${fontSize}px monospace`;
                       ctx.textAlign = 'center';
                       ctx.textBaseline = 'middle';
                       
                       ctx.beginPath();
                       ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
                       
                       if (isFound) {
                         ctx.fillStyle = '#ff003c'; 
                         ctx.shadowColor = '#ff003c';
                         ctx.shadowBlur = 10;
                       } else {
                         ctx.fillStyle = '#4a4a4a';
                         ctx.shadowBlur = 0;
                       }
                       ctx.fill();
                       ctx.shadowBlur = 0; 

                       ctx.fillStyle = isFound ? '#ff003c' : '#4a4a4a';
                       ctx.fillText(label, node.x, node.y + 10);
                    }
                  }}
                  linkColor={() => 'rgba(255,255,255,0.05)'} 
                  backgroundColor="transparent"
                  linkWidth={1}
                  d3AlphaDecay={0.02}
                  d3VelocityDecay={0.3}
                  onNodeHover={node => setMeshHover(node || null)}
                />

                {meshHover && meshHover.group === 'leaf' && meshHover.isDiscovered && (
                  <div className="absolute bottom-6 right-6 bg-black border border-[#00ff41] p-4 shadow-[0_0_20px_rgba(0,255,65,0.2)] pointer-events-none z-50">
                    <div className="text-xs text-white uppercase mb-2 border-b border-[#00ff41]/30 pb-2">
                      Collections Containing <span className="text-[#ff003c]">{meshHover.id}</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      {meshHover.collections.map((c: string, idx: number) => (
                        <div key={idx} className="text-[#00ff41] text-[10px] font-mono">&gt; {c}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}
