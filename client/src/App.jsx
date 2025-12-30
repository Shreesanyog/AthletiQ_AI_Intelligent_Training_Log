import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { jsPDF } from "jspdf";
import Swal from 'sweetalert2';
import { 
  Activity, TrendingUp, Trash2, Upload, FileText, Zap, Award, 
  PlusCircle, X, PieChart as PieIcon, Dumbbell, Edit2, 
  Calendar, CheckCircle, BarChart3, Clock, CalendarRange, Crown,
  Filter, ArrowUpDown, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';


const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// --- STYLES ---
const Card = ({ children, className }) => (
  <div className={`bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color }) => (
  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
    color === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
    color === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }`}>
    {children}
  </span>
);

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

function App() {
  const [workouts, setWorkouts] = useState([]);
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null); 

  // Table State
  const [filterType, setFilterType] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc'); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form State - Locked to Today/Past
  const todayStr = new Date().toISOString().split('T')[0];
  const initialForm = { type: 'Run', duration: '', distance: '', intensity: 'Medium', date: todayStr };
  const [form, setForm] = useState(initialForm);

  // --- FETCH DATA (DYNAMIC URL) ---
  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/workouts`);
      setWorkouts(res.data);
    } catch (err) { 
        console.error("API Error - Ensure Backend is running"); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- LOGIC: FILTER / SORT / PAGINATE ---
  const processedData = useMemo(() => {
    let data = [...workouts];
    if (filterType !== 'All') data = data.filter(w => w.type === filterType);
    
    data.sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
        if (sortBy === 'dur-desc') return b.duration - a.duration;
        return 0;
    });
    return data;
  }, [workouts, filterType, sortBy]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  
  useEffect(() => {
      if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- STATS ---
  const stats = useMemo(() => {
    if (!workouts.length) return { volume: 0, count: 0, top: 'N/A' };
    const volume = workouts.reduce((acc, c) => acc + c.duration, 0);
    const typeDurations = workouts.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + c.duration; return acc; }, {});
    const top = Object.keys(typeDurations).reduce((a, b) => typeDurations[a] > typeDurations[b] ? a : b);
    return { volume, count: workouts.length, top };
  }, [workouts]);

  // --- HANDLERS ---
  const openEditModal = (w) => {
    setForm({ type: w.type, duration: w.duration, distance: w.distance || '', intensity: w.intensity, date: w.date.split('T')[0] });
    setEditId(w._id); setShowForm(true);
  };

  const openAddModal = () => { setForm(initialForm); setEditId(null); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        if (editId) await axios.put(`${API_BASE}/api/workouts/${editId}`, form);
        else await axios.post(`${API_BASE}/api/workouts`, form);
        
        Swal.fire({ title: 'Saved!', icon: 'success', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false, background: '#0f172a', color: '#fff' });
        setShowForm(false); fetchData();
    } catch (error) { Swal.fire('Error', 'Failed to save. Check server.', 'error'); }
  };

  const handleDelete = async (id) => {
    if ((await Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true, background: '#0f172a', color: '#fff' })).isConfirmed) {
      await axios.delete(`${API_BASE}/api/workouts/${id}`); fetchData();
    }
  };

  const handleFileUpload = async (e) => {
    const formData = new FormData(); formData.append('file', e.target.files[0]);
    await axios.post(`${API_BASE}/api/upload`, formData); fetchData();
    Swal.fire({ title: 'Imported!', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#0f172a', color: '#fff' });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Training Report", 10, 10);
    let y = 20;
    processedData.slice(0, 50).forEach(w => {
        doc.text(`${new Date(w.date).toLocaleDateString()} - ${w.type} (${w.duration}m) [${w.intensity}]`, 10, y);
        y+=10; if(y>280){doc.addPage(); y=10;}
    });
    doc.save("Report.pdf");
  };

  const runAI = async () => {
    setLoading(true);
    setAiData(null);
    try {
      const res = await axios.get(`${API_BASE}/api/analyze`);
      setAiData(res.data);
    } catch (err) { Swal.fire('AI Unavailable', 'Backend or Gemini API issue.', 'info'); }
    setLoading(false);
  };

  // Chart Data
  const typeCounts = workouts.reduce((acc, curr) => { acc[curr.type] = (acc[curr.type] || 0) + 1; return acc; }, {});
  const pieData = Object.keys(typeCounts).map(key => ({ name: key, value: typeCounts[key] }));
  const chartData = [...workouts].sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-10).map(w => ({
    name: new Date(w.date).toLocaleDateString(undefined, {month:'short', day:'numeric'}),
    duration: w.duration
  }));

  // Heatmap Data (Last 14 days)
  const heatmapData = Array.from({length: 14}, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      const dateStr = d.toISOString().split('T')[0];
      const hasWorkout = workouts.some(w => w.date.startsWith(dateStr));
      return { date: dateStr, active: hasWorkout };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">
      
      {/* NAVBAR */}
      <nav className="border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg"><Activity className="text-white w-5 h-5" /></div>
                <h1 className="text-xl font-bold text-white">Ath<span className="text-blue-500">letiQ</span> AI</h1>
            </div>
            <div className="flex gap-4">
                <button onClick={openAddModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-lg shadow-blue-500/20 transition-all">
                    <PlusCircle size={16} /> Log Entry
                </button>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8 pb-24">

        {/* 1. STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="flex flex-col justify-center border-l-4 border-l-blue-500">
                <div className="text-blue-400 text-xs uppercase font-bold mb-1">Total Volume</div>
                <div className="text-3xl font-black text-white">{stats.volume} <span className="text-sm text-slate-500">min</span></div>
            </Card>
            <Card className="flex flex-col justify-center border-l-4 border-l-purple-500">
                <div className="text-purple-400 text-xs uppercase font-bold mb-1">Total Sessions</div>
                <div className="text-3xl font-black text-white">{stats.count}</div>
            </Card>
            <Card className="flex flex-col justify-center border-l-4 border-l-emerald-500">
                <div className="text-emerald-400 text-xs uppercase font-bold mb-1">Top Activity</div>
                <div className="text-3xl font-black text-white capitalize truncate">{stats.top}</div>
            </Card>
            <Card className="flex flex-col justify-center border-l-4 border-l-amber-500">
                 <div className="text-amber-400 text-xs uppercase font-bold mb-1">Consistency (14 Days)</div>
                 <div className="flex gap-1 mt-2">
                    {heatmapData.map((d, i) => (
                        <div key={i} title={d.date} className={`w-2 h-8 rounded-sm transition-all ${d.active ? 'bg-amber-500 scale-110 shadow-lg shadow-amber-500/50' : 'bg-slate-800'}`}></div>
                    ))}
                 </div>
            </Card>
        </div>

        {/* 2. CHARTS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 min-h-[350px]">
                <h3 className="text-lg font-bold text-white mb-6">Volume Trend</h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorDur" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 12}} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#64748b" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px'}} itemStyle={{color: '#fff'}} />
                            <Area type="monotone" dataKey="duration" stroke="#3b82f6" strokeWidth={3} fill="url(#colorDur)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card className="flex flex-col items-center">
                 <h3 className="text-lg font-bold text-white mb-4 w-full text-left">Activity Mix</h3>
                 <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{backgroundColor: '#adb1b8', border: 'none', borderRadius: '8px', color: '#fff'}} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                 </div>
            </Card>
        </div>

        {/* 3. LOGS & AI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-white/5 pb-4">
                    <h3 className="text-lg font-bold text-white">History Log</h3>
                    <div className="flex gap-2 items-center flex-wrap">
                        {/* Filters */}
                        <div className="relative group">
                            <Filter size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none"/>
                            <select className="bg-slate-800 text-xs text-slate-300 pl-8 pr-3 py-2 rounded-lg border border-slate-700 outline-none hover:bg-slate-700 cursor-pointer appearance-none" value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}>
                                <option value="All">All Types</option><option value="Run">Run</option><option value="Lift">Lift</option><option value="Cycle">Cycle</option><option value="Swim">Swim</option>
                            </select>
                        </div>
                        <div className="relative group">
                            <ArrowUpDown size={14} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none"/>
                            <select className="bg-slate-800 text-xs text-slate-300 pl-8 pr-3 py-2 rounded-lg border border-slate-700 outline-none hover:bg-slate-700 cursor-pointer appearance-none" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                <option value="date-desc">Newest</option><option value="date-asc">Oldest</option><option value="dur-desc">Duration</option>
                            </select>
                        </div>
                        {/* Actions */}
                        <label title="Import CSV" className="cursor-pointer bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-400 hover:text-white transition"><Upload size={16} /><input type="file" className="hidden" onChange={handleFileUpload} /></label>
                        <button title="Export PDF" onClick={exportPDF} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg text-slate-400 hover:text-white transition"><FileText size={16} /></button>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="text-xs uppercase bg-slate-800/50 text-slate-500 rounded-lg">
                            <tr><th className="px-4 py-3 rounded-l-lg">Activity</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 rounded-r-lg text-right">Edit</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {paginatedData.map((w) => (
                                <tr key={w._id} className="hover:bg-slate-800/30 transition">
                                    <td className="px-4 py-3 text-slate-200 flex items-center gap-2">
                                        {w.type === 'Lift' ? <Dumbbell size={14}/> : <Activity size={14}/>} {w.type}
                                    </td>
                                    <td className="px-4 py-3">{w.duration}m <Badge color={w.intensity}>{w.intensity}</Badge></td>
                                    <td className="px-4 py-3">{new Date(w.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                                        <button onClick={() => openEditModal(w)} className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded"><Edit2 size={14}/></button>
                                        <button onClick={() => handleDelete(w._id)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded"><Trash2 size={14}/></button>
                                    </td>
                                </tr>
                            ))}
                            {paginatedData.length === 0 && <tr><td colSpan="4" className="text-center py-10 text-slate-600">No logs found.</td></tr>}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex justify-between items-center border-t border-slate-800 pt-4 mt-auto">
                        <span className="text-xs text-slate-500">Page {currentPage} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg bg-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-700"><ChevronLeft size={16}/></button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg bg-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-700"><ChevronRight size={16}/></button>
                        </div>
                    </div>
                )}
            </Card>

            {/* AI PANEL */}
            <div className={`rounded-2xl p-1 relative overflow-hidden transition-all duration-500 ${aiData ? 'bg-gradient-to-b from-blue-500 to-indigo-600' : 'bg-slate-800 border border-slate-700'}`}>
                <div className="bg-slate-900 rounded-xl p-6 h-full relative z-10 flex flex-col min-h-[400px]">
                    <div className="flex items-center gap-2 mb-4">
                        <Award size={20} className={aiData ? "text-blue-400" : "text-slate-500"} />
                        <h3 className="font-bold text-white text-lg">Coach Intelligence</h3>
                    </div>

                    {loading && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center animate-pulse">
                            <div className="bg-blue-500/10 p-4 rounded-full mb-4"><Loader2 size={40} className="text-blue-400 animate-spin" /></div>
                            <h3 className="text-blue-400 font-bold text-lg mb-1">Analyzing Data...</h3>
                        </div>
                    )}

                    {!loading && aiData && (
                        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                            <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                <h4 className="text-[10px] font-bold text-blue-400 uppercase mb-1 flex items-center gap-2"><Clock size={10}/> Today</h4>
                                <p className="text-slate-200 text-xs">{aiData.today}</p>
                            </div>
                            <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
                                <h4 className="text-[10px] font-bold text-purple-400 uppercase mb-1 flex items-center gap-2"><BarChart3 size={10}/> This Week</h4>
                                <p className="text-slate-200 text-xs">{aiData.weekly}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase mb-1 gap-1 flex items-center"><CalendarRange size={10}/> Month</h4>
                                    <p className="text-slate-200 text-[10px] leading-tight">{aiData.monthly}</p>
                                </div>
                                <div className="bg-amber-500/10 p-2 rounded border border-amber-500/20">
                                    <h4 className="text-[10px] font-bold text-amber-400 uppercase mb-1 gap-1 flex items-center"><Crown size={10}/> Year</h4>
                                    <p className="text-slate-200 text-[10px] leading-tight">{aiData.yearly}</p>
                                </div>
                            </div>
                            <div className="mt-2 pt-3 border-t border-white/10">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Next 3 Days</h4>
                                <div className="space-y-1">
                                    {aiData.plan?.map((day, i) => (
                                        <div key={i} className="text-xs text-slate-300 bg-slate-800 p-2 rounded border border-white/5 flex items-center gap-2">
                                           <CheckCircle size={10} className="text-emerald-500"/> {day}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && !aiData && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="bg-slate-800 p-4 rounded-full mb-4"><Zap size={32} className="text-slate-600" /></div>
                            <p className="text-slate-500 text-sm mb-6 max-w-[200px]">AI analyzes your history to generate 4-level insights.</p>
                            <button onClick={runAI} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg flex items-center gap-2"><Zap size={16} /> Start Analysis</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </main>

      <footer className="border-t border-white/5 bg-slate-950 py-8 text-center text-slate-600 text-xs">
        <p>&copy; {new Date().getFullYear()} AthletiQ AI by Shreesanyog Rath</p>
      </footer>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl w-full max-w-md shadow-2xl relative animate-fadeIn">
                <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24}/></button>
                <h2 className="text-xl font-bold text-white mb-6">{editId ? 'Edit Entry' : 'Log Workout'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        {['Run', 'Lift', 'Cycle', 'Swim', 'Yoga'].map(type => (
                            <button type="button" key={type} onClick={() => setForm({...form, type})} className={`py-2 rounded-lg text-xs font-bold border ${form.type === type ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{type}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Duration (m)" className="bg-slate-800 border border-slate-700 text-white p-3 rounded-xl outline-none" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} required />
                        {!['Lift', 'Yoga'].includes(form.type) && <input type="number" placeholder="Dist (km)" className="bg-slate-800 border border-slate-700 text-white p-3 rounded-xl outline-none" value={form.distance} onChange={e => setForm({...form, distance: e.target.value})} />}
                    </div>
                    <div className="flex gap-2">
                        {['Low', 'Medium', 'High'].map(lvl => (
                            <button type="button" key={lvl} onClick={() => setForm({...form, intensity: lvl})} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${form.intensity === lvl ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-slate-700 text-slate-500'}`}>{lvl}</button>
                        ))}
                    </div>
                    {/* DATE INPUT */}
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Date</label>
                        <input type="date" max={todayStr} className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl outline-none" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                    </div>
                    <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg mt-2">{editId ? 'Update' : 'Save'}</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}

export default App;