
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SmokeLog, UserSettings, DailySummary, StreakLog, StreakSummary } from './types';
import HistoryChart from './components/HistoryChart';
import HealthProgress from './components/HealthProgress';
import { getMotivationalMessage, getHealthFact, getScoldingMessage } from './services/geminiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const App: React.FC = () => {
  const [logs, setLogs] = useState<SmokeLog[]>([]);
  const [streakLogs, setStreakLogs] = useState<StreakLog[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    dailyLimit: 5,
    pricePerCigarette: 15,
    quitDate: Date.now()
  });
  
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'health'>('today');
  const [historyRange, setHistoryRange] = useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [historyType, setHistoryType] = useState<'smoke' | 'streak'>('smoke');
  
  const [customStart, setCustomStart] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [currentPercentage, setCurrentPercentage] = useState(100);
  const [motivation, setMotivation] = useState("");
  const [healthFact, setHealthFact] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [streakPieces, setStreakPieces] = useState({ h: 0, m: 0, s: 0, active: false });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedLogs = localStorage.getItem('smoke_logs');
    const savedStreaks = localStorage.getItem('streak_logs');
    const savedSettings = localStorage.getItem('user_settings');
    const savedDarkMode = localStorage.getItem('dark_mode') === 'true';
    
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    if (savedStreaks) setStreakLogs(JSON.parse(savedStreaks));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    setIsDarkMode(savedDarkMode);
    
    getHealthFact().then(setHealthFact);
  }, []);

  useEffect(() => {
    localStorage.setItem('smoke_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('streak_logs', JSON.stringify(streakLogs));
  }, [streakLogs]);

  useEffect(() => {
    localStorage.setItem('user_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dark_mode', isDarkMode.toString());
  }, [isDarkMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (logs.length > 0) {
        const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);
        const lastLog = sortedLogs[0];
        const diff = Date.now() - lastLog.timestamp;
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setStreakPieces({ h, m, s, active: true });
      } else {
        setStreakPieces({ h: 0, m: 0, s: 0, active: false });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [logs]);

  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayLogs = logs.filter(log => new Date(log.timestamp).toDateString() === todayStr);
    const todayUnits = todayLogs.reduce((acc, log) => acc + (log.percentage / 100), 0);
    const todaySpent = todayLogs.reduce((acc, log) => acc + ((log.percentage / 100) * (log.priceAtTime || settings.pricePerCigarette)), 0);
    const totalTodayPercentage = todayLogs.reduce((acc, log) => acc + log.percentage, 0);
    
    const potentialCost = settings.dailyLimit * settings.pricePerCigarette;
    const todaySaved = Math.max(0, potentialCost - todaySpent);
    
    return {
      todayUnits: Number(todayUnits.toFixed(2)),
      todaySpent: Math.round(todaySpent),
      todaySaved: Math.round(todaySaved),
      todayCount: todayLogs.length,
      todayTotalPercentage: totalTodayPercentage
    };
  }, [logs, settings.dailyLimit, settings.pricePerCigarette]);

  const isLimitExceeded = useMemo(() => stats.todayUnits > settings.dailyLimit, [stats.todayUnits, settings.dailyLimit]);

  // Initial Motivation or Scolding on load/update
  useEffect(() => {
    if (!motivation) {
        if (isLimitExceeded) {
            getScoldingMessage(stats.todayUnits - settings.dailyLimit).then(setMotivation);
        } else if (stats.todayUnits > 0) {
            setMotivation("আপনি আপনার লক্ষ্যের মধ্যেই আছেন। নিজের শরীরের প্রতি এই যত্ন বজায় রাখুন!");
        }
    }
  }, [isLimitExceeded, stats.todayUnits, settings.dailyLimit, motivation]);

  const formatHMS = useCallback((totalHours: number) => {
    const totalSeconds = Math.floor(totalHours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h:${m}m:${s}s`;
  }, []);

  const addLog = async () => {
    const now = Date.now();
    const unitToAdd = currentPercentage / 100;
    const nextTotalUnits = stats.todayUnits + unitToAdd;
    
    if (logs.length > 0) {
      const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);
      const lastLog = sortedLogs[0];
      const duration = now - lastLog.timestamp;
      const newStreak: StreakLog = {
        id: Math.random().toString(36).substr(2, 9),
        startTimestamp: lastLog.timestamp,
        endTimestamp: now,
        durationMs: duration
      };
      setStreakLogs(prev => [...prev, newStreak]);
    }

    const newLog: SmokeLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: now,
      percentage: currentPercentage,
      priceAtTime: settings.pricePerCigarette,
    };
    
    setLogs(prev => [...prev, newLog]);

    if (nextTotalUnits > settings.dailyLimit) {
      const msg = await getScoldingMessage(nextTotalUnits - settings.dailyLimit);
      setMotivation(msg);
    } else {
      if (currentPercentage < 100) {
        const msg = await getMotivationalMessage(100 - currentPercentage);
        setMotivation(msg);
      } else {
        setMotivation("পরের বার অন্তত অর্ধেক খাওয়ার চেষ্টা করুন। আপনার ফুসফুস কৃতজ্ঞ থাকবে।");
      }
    }
    setIsLogModalOpen(false);
  };

  const getBestStreak = useCallback(() => {
    let max = 0;
    if (streakLogs.length > 0) {
      max = Math.max(...streakLogs.map(s => s.durationMs));
    }
    const currentMs = streakPieces.active ? (streakPieces.h * 3600000 + streakPieces.m * 60000 + streakPieces.s * 1000) : 0;
    return Math.max(max, currentMs) / (1000 * 60 * 60);
  }, [streakLogs, streakPieces]);

  const aggregatedData = useMemo(() => {
    const data: DailySummary[] = [];
    let days = 7;
    let startDate = new Date();
    
    if (historyRange === 'month') days = 30;
    else if (historyRange === 'year') days = 365;
    else if (historyRange === 'custom') {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      startDate = end;
    }

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(startDate); d.setDate(d.getDate() - i);
      const dStr = d.toDateString();
      const dayLogs = logs.filter(log => new Date(log.timestamp).toDateString() === dStr);
      const units = dayLogs.reduce((acc, log) => acc + (log.percentage / 100), 0);
      data.push({
        date: d.toLocaleDateString('bn-BD', { weekday: days <= 7 ? 'short' : undefined, day: 'numeric', month: 'short' }),
        totalUnits: Number(units.toFixed(2)),
        count: dayLogs.length,
        cost: Math.round(dayLogs.reduce((acc, log) => acc + ((log.percentage / 100) * (log.priceAtTime || settings.pricePerCigarette)), 0))
      });
    }
    return data;
  }, [logs, historyRange, customStart, customEnd, settings.pricePerCigarette]);

  const streakData = useMemo(() => {
    const data: StreakSummary[] = [];
    let days = 7;
    let startDate = new Date();

    if (historyRange === 'month') days = 30;
    else if (historyRange === 'year') days = 365;
    else if (historyRange === 'custom') {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      startDate = end;
    }

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(startDate); d.setDate(d.getDate() - i);
      const dStr = d.toDateString();
      const dayStreaks = streakLogs.filter(s => new Date(s.endTimestamp).toDateString() === dStr);
      let maxDurationMs = dayStreaks.length > 0 ? Math.max(...dayStreaks.map(s => s.durationMs)) : 0;
      
      if (dStr === new Date().toDateString() && streakPieces.active) {
         const currentMs = (streakPieces.h * 3600000 + streakPieces.m * 60000 + streakPieces.s * 1000);
         maxDurationMs = Math.max(maxDurationMs, currentMs);
      }
      
      data.push({
        date: d.toLocaleDateString('bn-BD', { weekday: days <= 7 ? 'short' : undefined, day: 'numeric', month: 'short' }),
        durationHours: Number((maxDurationMs / (1000 * 60 * 60)).toFixed(3))
      });
    }
    return data;
  }, [streakLogs, historyRange, customStart, customEnd, streakPieces.active]);

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const best = getBestStreak();
      const current = streakPieces.h + streakPieces.m/60 + streakPieces.s/3600;
      
      const now = Date.now();
      let filterMs = 7 * 24 * 60 * 60 * 1000;
      if (historyRange === 'month') filterMs = 30 * 24 * 60 * 60 * 1000;
      else if (historyRange === 'year') filterMs = 365 * 24 * 60 * 60 * 1000;
      
      let relevantLogs = logs.filter(l => (now - l.timestamp) <= filterMs);
      if (historyRange === 'custom') {
         const startTs = new Date(customStart).getTime();
         const endTs = new Date(customEnd).getTime() + (24 * 60 * 60 * 1000);
         relevantLogs = logs.filter(l => l.timestamp >= startTs && l.timestamp <= endTs);
      }

      const totalRangePercentage = relevantLogs.reduce((acc, l) => acc + l.percentage, 0);
      const totalRangeCost = relevantLogs.reduce((acc, l) => acc + ((l.percentage / 100) * (l.priceAtTime || settings.pricePerCigarette)), 0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(16, 185, 129);
      doc.text("QuitTrack - Progress Report", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Period: ${historyRange.toUpperCase()}`, 14, 28);
      doc.text(`Generated on: ${new Date().toLocaleString('en-US')}`, 14, 34);

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Health & Cost Overview", 14, 45);

      const summaryRows = [
        ["Metric", "Value"],
        ["Total Usage (%)", `${totalRangePercentage}%`],
        ["Total Units", (totalRangePercentage / 100).toFixed(2)],
        ["Total Cost (Selected Range)", `Tk ${Math.round(totalRangeCost)}`],
        ["Best Smoke-Free Streak", formatHMS(best)],
        ["Current Live Streak", formatHMS(current)],
        ["Daily Limit Target", `${settings.dailyLimit} Units`]
      ];
      
      autoTable(doc, {
        startY: 50,
        head: [summaryRows[0]],
        body: summaryRows.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { font: "helvetica", fontSize: 10 }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 100;
      doc.setFontSize(14);
      doc.text("Activity History (Individual Logs)", 14, finalY + 15);

      relevantLogs.sort((a, b) => b.timestamp - a.timestamp);

      const logRows = relevantLogs.map(l => {
         const dt = new Date(l.timestamp);
         const cost = Math.round((l.percentage / 100) * (l.priceAtTime || settings.pricePerCigarette));
         return [
           dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
           dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
           `${l.percentage}%`,
           `Tk ${cost}`
         ];
      });

      autoTable(doc, {
        startY: finalY + 20,
        head: [["Date", "Time", "Usage %", "Cost"]],
        body: logRows.length > 0 ? logRows : [["No records found", "-", "-", "-"]],
        theme: 'striped',
        styles: { font: "helvetica", fontSize: 9 },
        headStyles: { fillColor: [71, 85, 105] }
      });

      doc.save(`QuitTrack_Report_${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("PDF জেনারেট করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    }
  };

  const progressPercent = Math.min(100, (stats.todayUnits / (settings.dailyLimit || 1)) * 100);

  const exportBackup = () => {
    const backupData = { logs, streakLogs, settings, timestamp: Date.now() };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quittrack-backup.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.logs) setLogs(data.logs);
        if (data.streakLogs) setStreakLogs(data.streakLogs);
        if (data.settings) setSettings(data.settings);
        alert('ব্যাকআপ সফলভাবে রিস্টোর করা হয়েছে।');
      } catch (err) { alert('সঠিক ব্যাকআপ ফাইল নির্বাচন করুন।'); }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-500 pb-36 font-hind">
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl px-8 py-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-900">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Quit<span className="text-emerald-500">Track</span></h1>
          <div className="flex items-center gap-2 mt-0.5">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg animate-pulse"></span>
             <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">Health Companion</p>
          </div>
        </div>
      </header>

      <main className="px-8 mt-6 space-y-6">
        {activeTab === 'today' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-50 dark:border-slate-800 shadow-sm relative overflow-hidden group">
               <div className="flex items-center gap-3 mb-3 relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center">
                     <i className="fa-solid fa-fire text-sm"></i>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ধূমপানমুক্ত সময় (স্ট্রিক)</p>
               </div>
               <div className="flex items-baseline gap-2 relative z-10">
                  {!streakPieces.active ? (
                    <p className="text-lg font-black text-slate-300 dark:text-slate-700">এখনও শুরু হয়নি</p>
                  ) : (
                    <div className="flex items-baseline gap-3">
                      <div className="flex items-baseline gap-0.5">
                         <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{streakPieces.h}</span>
                         <span className="text-[10px] font-black text-slate-400 uppercase">ঘ:</span>
                      </div>
                      <div className="flex items-baseline gap-0.5">
                         <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{streakPieces.m.toString().padStart(2, '0')}</span>
                         <span className="text-[10px] font-black text-slate-400 uppercase">মি:</span>
                      </div>
                      <div className="flex items-baseline gap-0.5">
                         <span className="text-3xl font-black text-emerald-500 tabular-nums">{streakPieces.s.toString().padStart(2, '0')}</span>
                         <span className="text-[10px] font-black text-slate-400 uppercase">সে:</span>
                      </div>
                      <span className="ml-1 text-[10px] font-black text-emerald-500 animate-pulse">LIVE</span>
                    </div>
                  )}
               </div>
            </div>

            <div className="relative aspect-square w-full max-w-[260px] mx-auto flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full blur-[40px] opacity-10 transition-colors duration-1000 ${isLimitExceeded ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
              <svg className="w-full h-full -rotate-90 transform drop-shadow-xl transition-all duration-700">
                <circle cx="50%" cy="50%" r="42%" className="stroke-slate-100 dark:stroke-slate-900 fill-none" strokeWidth="12" />
                <circle cx="50%" cy="50%" r="42%" className={`fill-none transition-all duration-1000 ease-out ${isLimitExceeded ? 'stroke-rose-500' : 'stroke-emerald-500'}`} strokeWidth="12" strokeDasharray="264%" strokeDashoffset={`${264 - (264 * progressPercent) / 100}%`} strokeLinecap="round" />
              </svg>
              <button onClick={() => setIsLogModalOpen(true)} className="absolute inset-0 flex flex-col items-center justify-center text-center group active:scale-95 transition-all outline-none">
                <div className="relative mb-[-10px]">
                   <span className={`text-6xl font-black tracking-tighter leading-none transition-colors ${isLimitExceeded ? 'text-rose-500' : 'text-slate-900 dark:text-white group-hover:text-emerald-500'}`}>{stats.todayUnits}</span>
                   <div className={`absolute -right-6 top-0 w-8 h-8 rounded-full text-white flex items-center justify-center shadow-lg group-hover:scale-125 transition-transform ${isLimitExceeded ? 'bg-rose-500' : 'bg-emerald-500'}`}><i className="fa-solid fa-plus text-xs"></i></div>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 group-hover:text-emerald-400 transition-colors">আজকের ইউনিট</p>
                <span className="mt-3 text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full uppercase">লক্ষ্য: {settings.dailyLimit}</span>
              </button>
            </div>

            {/* Today's Summary for % and Money */}
            <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-1000">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-50 dark:border-slate-800 shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">আজকের মোট %</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{stats.todayTotalPercentage}%</p>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-50 dark:border-slate-800 shadow-sm">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">আজকের খরচ</p>
                <p className="text-xl font-black text-emerald-500">৳{stats.todaySpent}</p>
              </div>
            </div>

            {motivation && (
              <div className={`${isLimitExceeded ? 'bg-rose-500 shadow-rose-500/20' : 'bg-emerald-500 shadow-emerald-500/20'} p-6 rounded-[2rem] text-white shadow-lg relative overflow-hidden animate-in slide-in-from-top-4 transition-colors duration-500`}>
                <p className="relative z-10 text-xs font-bold leading-relaxed italic">"{motivation}"</p>
                <i className={`fa-solid ${isLimitExceeded ? 'fa-triangle-exclamation' : 'fa-award'} absolute -right-2 -top-2 text-6xl opacity-10`}></i>
                {isLimitExceeded && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none"></div>}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 pb-10">
             <div className="flex gap-2 p-2 bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-sm border border-slate-50 dark:border-slate-800">
                <button onClick={() => setHistoryType('smoke')} className={`flex-1 py-4 rounded-[1.8rem] text-xs font-black transition-all ${historyType === 'smoke' ? 'bg-slate-900 dark:bg-emerald-500 text-white shadow-xl' : 'text-slate-400'}`}>সিগারেট ট্র্যাকিং</button>
                <button onClick={() => setHistoryType('streak')} className={`flex-1 py-4 rounded-[1.8rem] text-xs font-black transition-all ${historyType === 'streak' ? 'bg-slate-900 dark:bg-emerald-500 text-white shadow-xl' : 'text-slate-400'}`}>স্ট্রিক ট্র্যাকিং</button>
             </div>

             <div className="flex flex-wrap gap-2 justify-center">
                {(['week', 'month', 'year', 'custom'] as const).map((r) => (
                  <button 
                    key={r} 
                    onClick={() => setHistoryRange(r)}
                    className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${historyRange === r ? 'bg-slate-900 dark:bg-emerald-500 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800'}`}
                  >
                    {r === 'week' ? 'সপ্তাহ' : r === 'month' ? 'মাস' : r === 'year' ? 'বছর' : 'কাস্টম'}
                  </button>
                ))}
             </div>

             <HistoryChart 
                data={historyType === 'smoke' ? aggregatedData : streakData} 
                type={historyType}
                limit={historyRange === 'year' ? settings.dailyLimit * 30 : settings.dailyLimit} 
                title={historyType === 'smoke' ? 'ব্যবহারের অনুপাত' : 'স্ট্রিক পারফরম্যান্স'} 
             />
             <div className="flex justify-center pb-4">
                <button onClick={generatePDF} className="px-8 py-4 bg-rose-500 text-white rounded-[2rem] text-xs font-black flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                  <i className="fa-solid fa-file-pdf"></i> PDF রিপোর্ট ডাউনলোড করুন
                </button>
             </div>
          </div>
        )}

        {activeTab === 'health' && <HealthProgress daysQuit={Math.floor(streakPieces.h / 24) || 0} healthFact={healthFact} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 px-8 pb-10 pt-4 bg-gradient-to-t from-[#F8FAFC] dark:from-slate-950 via-[#F8FAFC] dark:via-slate-950 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[3rem] p-2.5 shadow-2xl border border-white dark:border-slate-800 flex items-center justify-between pointer-events-auto">
          <button onClick={() => setActiveTab('today')} className={`flex-1 flex flex-col items-center py-4 rounded-[2.2rem] transition-all ${activeTab === 'today' ? 'bg-slate-900 dark:bg-emerald-500 text-white shadow-lg' : 'text-slate-400'}`}>
            <i className="fa-solid fa-house mb-1"></i>
            <span className="text-[8px] font-black uppercase tracking-tighter">হোম</span>
          </button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 flex flex-col items-center py-4 rounded-[2.2rem] transition-all ${activeTab === 'history' ? 'bg-slate-900 dark:bg-emerald-500 text-white shadow-xl' : 'text-slate-400'}`}>
            <i className="fa-solid fa-chart-line mb-1"></i>
            <span className="text-[8px] font-black uppercase tracking-tighter">হিস্টোরি</span>
          </button>
          <button onClick={() => setActiveTab('health')} className={`flex-1 flex flex-col items-center py-4 rounded-[2.2rem] transition-all ${activeTab === 'health' ? 'bg-slate-900 dark:bg-emerald-500 text-white shadow-lg' : 'text-slate-400'}`}>
            <i className="fa-solid fa-heart-pulse mb-1"></i>
            <span className="text-[8px] font-black uppercase tracking-tighter">স্বাস্থ্য</span>
          </button>
          <button onClick={() => setIsSettingsModalOpen(true)} className="flex-1 flex flex-col items-center py-4 rounded-[2.2rem] text-slate-400 hover:text-emerald-500 transition-all">
            <i className="fa-solid fa-sliders mb-1"></i>
            <span className="text-[8px] font-black uppercase tracking-tighter">সেটিংস</span>
          </button>
        </div>
      </nav>

      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsSettingsModalOpen(false)}></div>
          
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl w-full max-w-[320px] rounded-[3rem] p-6 shadow-2xl border border-white/20 dark:border-slate-800 relative z-10 animate-in zoom-in duration-300 transform">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">সেটিংস</h3>
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1 inline-block">App Configuration</span>
                </div>
                <button onClick={() => setIsSettingsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
                  <i className="fa-solid fa-xmark"></i>
                </button>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <i className={`fa-solid ${isDarkMode ? 'fa-moon' : 'fa-sun'} text-xs`}></i>
                      </div>
                      <span className="text-xs font-black text-slate-800 dark:text-white">ডার্ক মোড</span>
                   </div>
                   <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isDarkMode ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                   </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">দৈনিক লক্ষ্য</p>
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-bullseye text-[10px] text-emerald-500"></i>
                        <input type="number" value={settings.dailyLimit} onChange={(e) => setSettings({...settings, dailyLimit: parseInt(e.target.value) || 1})} className="w-full bg-transparent text-sm font-black text-slate-900 dark:text-white focus:outline-none" />
                      </div>
                   </div>
                   <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">প্রতিটির দাম</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-emerald-500">৳</span>
                        <input type="number" value={settings.pricePerCigarette} onChange={(e) => setSettings({...settings, pricePerCigarette: parseInt(e.target.value) || 0})} className="w-full bg-transparent text-sm font-black text-slate-900 dark:text-white focus:outline-none" />
                      </div>
                   </div>
                </div>

                <div className="flex gap-2">
                   <button onClick={exportBackup} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all">
                    <i className="fa-solid fa-download"></i> ব্যাকআপ
                   </button>
                   <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all">
                    <i className="fa-solid fa-upload"></i> রিস্টোর
                   </button>
                   <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" />
                </div>

                <div className="mt-4 p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-emerald-950 dark:to-slate-900 text-center relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
                   <p className="text-[8px] font-black text-emerald-500/60 uppercase tracking-[0.3em] mb-1">Developer</p>
                   <h4 className="text-sm font-black text-white tracking-tighter">AHMED SHAMIM</h4>
                   <a 
                      href="https://www.facebook.com/ahmed.shamim.935467" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1877F2] text-white hover:scale-110 transition-transform shadow-lg"
                    >
                      <i className="fa-brands fa-facebook-f text-xs"></i>
                   </a>
                </div>
             </div>
          </div>
        </div>
      )}

      {isLogModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsLogModalOpen(false)}></div>
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[4rem] p-12 shadow-3xl relative z-10 animate-in slide-in-from-bottom-32 duration-500">
             <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto mb-10"></div>
             <div className="text-center mb-10">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">সিগারেটের পরিমাণ</p>
                <h3 className="text-8xl font-black text-slate-900 dark:text-white tracking-tighter">{currentPercentage}<span className="text-emerald-500">%</span></h3>
             </div>
             <div className="px-4 space-y-12">
                <input type="range" min="10" max="100" step="10" value={currentPercentage} onChange={(e) => setCurrentPercentage(parseInt(e.target.value))} className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                <div className="grid grid-cols-4 gap-3">
                   {[25, 50, 75, 100].map(val => (
                      <button key={val} onClick={() => setCurrentPercentage(val)} className={`py-5 rounded-[2rem] font-black text-sm transition-all ${currentPercentage === val ? 'bg-emerald-500 text-white scale-110 shadow-xl' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>{val}%</button>
                   ))}
                </div>
                <button onClick={addLog} className="w-full py-7 bg-emerald-500 text-white rounded-[2.5rem] font-black text-xl shadow-2xl shadow-emerald-500/40 active:scale-95 transition-all">লগ নিশ্চিত করুন</button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; width: 38px; height: 38px; background: #10b981; border-radius: 50%; border: 10px solid white; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4); cursor: pointer; }
        .dark input[type='range']::-webkit-slider-thumb { border-color: #0f172a; }
        .animate-in { animation: animate-in 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes animate-in { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
};

export default App;
