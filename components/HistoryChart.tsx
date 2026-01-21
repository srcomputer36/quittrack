
import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';
import { DailySummary, StreakSummary } from '../types';

interface HistoryChartProps {
  data: (DailySummary | StreakSummary)[];
  limit: number;
  title?: string;
  type?: 'smoke' | 'streak';
}

const HistoryChart: React.FC<HistoryChartProps> = ({ data, limit, title = 'বিশ্লেষণ', type = 'smoke' }) => {
  const isSmoke = type === 'smoke';
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Ensure chart only renders after component is fully mounted to parent DOM
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => {
        clearTimeout(timer);
        setIsMounted(false);
    };
  }, []);

  const formatHMS = (totalHours: number) => {
    const totalSeconds = Math.floor(totalHours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}ঘ:${m}মি:${s}সে`;
  };
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-black text-slate-900 dark:text-white mb-2">{item.date}</p>
          <div className="space-y-1">
            {isSmoke ? (
              <>
                <p className="text-[10px] font-bold text-slate-500">ইউনিট: <span className="text-emerald-500">{(item as DailySummary).totalUnits}</span></p>
                <p className="text-[10px] font-bold text-slate-500">খরচ: <span className="text-emerald-500">৳{(item as DailySummary).cost}</span></p>
              </>
            ) : (
              <p className="text-[10px] font-bold text-slate-500">স্থায়িত্ব: <span className="text-indigo-400">{formatHMS((item as StreakSummary).durationHours)}</span></p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const totalValue = isSmoke 
    ? (data as DailySummary[]).reduce((acc, curr) => acc + (curr.totalUnits || 0), 0).toFixed(1)
    : (data as StreakSummary[]).reduce((acc, curr) => acc + (curr.durationHours || 0), 0).toFixed(1);

  if (!isMounted) return <div className="h-[280px] min-h-[280px] w-full bg-slate-50 dark:bg-slate-900 rounded-[3rem] animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="w-full bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-50 dark:border-slate-800 relative overflow-hidden transition-all hover:shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{title}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              {isSmoke ? 'ব্যবহারের অনুপাত' : 'পারফরম্যান্স ট্রেন্ড'}
            </p>
          </div>
        </div>
        
        <div className="w-full h-[280px] min-h-[280px] relative">
          {data && data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              {isSmoke ? (
                <PieChart>
                  <Pie
                    data={data as any[]}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="totalUnits"
                    animationDuration={1000}
                    stroke="none"
                  >
                    {data.map((entry, index) => {
                      const val = (entry as DailySummary).totalUnits || 0;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={val > limit ? '#F43F5E' : '#10B981'} 
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              ) : (
                <BarChart data={data as any[]} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar 
                    dataKey="durationHours" 
                    radius={[8, 8, 8, 8]} 
                    animationDuration={1000}
                  >
                    {data.map((entry, index) => {
                      const val = (entry as StreakSummary).durationHours || 0;
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={val >= 24 ? '#6366F1' : '#818CF8'} 
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center flex-col gap-4 text-slate-300">
              <i className={`fa-solid ${isSmoke ? 'fa-chart-pie' : 'fa-chart-simple'} text-6xl`}></i>
              <p className="text-sm font-black uppercase tracking-widest">ডেটা পাওয়া যায়নি</p>
            </div>
          )}

          {isSmoke && data && data.length > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{totalValue}</span>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2">মোট ইউনিট</span>
            </div>
          )}
        </div>
      </div>

      {!isSmoke && data && data.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-6 shadow-sm border border-slate-50 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4">
           <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center">
                 <i className="fa-solid fa-list-check"></i>
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">বিস্তারিত স্ট্রিক হিস্টোরি</h4>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-slate-100 dark:border-slate-800">
                   <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">তারিখ</th>
                   <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">সময়কাল (H:M:S)</th>
                   <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">টার্গেট</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                 {data.slice().reverse().map((item, idx) => {
                   const s = item as StreakSummary;
                   const progress = Math.min(100, (s.durationHours / 24) * 100);
                   return (
                     <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                       <td className="py-4 px-2">
                         <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{s.date}</p>
                       </td>
                       <td className="py-4 px-2">
                         <p className="text-xs font-black text-indigo-500 tabular-nums">{formatHMS(s.durationHours)}</p>
                       </td>
                       <td className="py-4 px-2 flex justify-center">
                          <div className="w-8 h-8 relative">
                            <svg className="w-full h-full -rotate-90">
                               <circle cx="50%" cy="50%" r="40%" className="stroke-slate-100 dark:stroke-slate-800 fill-none" strokeWidth="3" />
                               <circle cx="50%" cy="50%" r="40%" className={`fill-none stroke-indigo-500`} strokeWidth="3" strokeDasharray="100%" strokeDashoffset={`${100 - progress}%`} strokeLinecap="round" />
                            </svg>
                          </div>
                       </td>
                     </tr>
                   )
                 })}
               </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default HistoryChart;
