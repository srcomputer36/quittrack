
import React from 'react';

interface HealthProgressProps {
  daysQuit: number;
  healthFact: string;
}

const HealthProgress: React.FC<HealthProgressProps> = ({ daysQuit, healthFact }) => {
  // Metrics based on actual medical milestones
  const metrics = [
    { 
      label: 'রক্তে অক্সিজেন', 
      desc: 'কার্বন মনোক্সাইড কমে রক্তে অক্সিজেন স্বাভাবিক হয়',
      progress: Math.min(100, daysQuit >= 0.5 ? 100 : (daysQuit / 0.5) * 100), 
      color: 'from-blue-400 to-cyan-500', 
      icon: 'fa-lungs-virus',
      timing: '১২ ঘণ্টা'
    },
    { 
      label: 'স্বাদ ও ঘ্রাণশক্তি', 
      desc: 'খাবারের স্বাদ এবং ঘ্রাণ নেওয়ার ক্ষমতা বৃদ্ধি পায়',
      progress: Math.min(100, daysQuit >= 2 ? 100 : (daysQuit / 2) * 100), 
      color: 'from-amber-400 to-orange-500', 
      icon: 'fa-utensils',
      timing: '৪৮ ঘণ্টা'
    },
    { 
      label: 'দাঁত ও মাড়ির স্বাস্থ্য', 
      desc: 'মাড়ির রক্ত সঞ্চালন উন্নত হয় এবং উজ্জ্বলতা ফেরে',
      progress: Math.min(100, (daysQuit / 10) * 100), 
      color: 'from-emerald-400 to-teal-500', 
      icon: 'fa-tooth',
      timing: '১০ দিন'
    },
    { 
      label: 'মানসিক প্রশান্তি', 
      desc: 'নিকোটিন নির্ভরতা কমে অস্থিরতা দূর হয়',
      progress: Math.min(100, (daysQuit / 21) * 100), 
      color: 'from-sky-400 to-blue-500', 
      icon: 'fa-brain',
      timing: '২১ দিন'
    },
    { 
      label: 'ফুসফুসের ক্ষমতা', 
      desc: 'কাশি কমে এবং বুক পরিষ্কার অনুভব হয়',
      progress: Math.min(100, (daysQuit / 90) * 100), 
      color: 'from-indigo-400 to-purple-500', 
      icon: 'fa-wind',
      timing: '৯০ দিন'
    },
    { 
      label: 'হার্ট অ্যাটাকের ঝুঁকি', 
      desc: 'হৃদরোগের ঝুঁকি নাটকীয়ভাবে কমতে থাকে',
      progress: Math.min(100, (daysQuit / 365) * 100), 
      color: 'from-rose-400 to-pink-500', 
      icon: 'fa-heart-pulse',
      timing: '১ বছর'
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">আপনার শরীর যেভাবে <span className="text-emerald-500">সুস্থ হচ্ছে</span></h3>
        <p className="text-sm font-bold text-slate-400 dark:text-slate-500 leading-relaxed">ধূমপানমুক্ত প্রতিটি মুহূর্ত আপনার শরীরকে পুনর্গঠন করছে।</p>
      </div>

      {/* Dynamic Health Fact Section - Daily Health Tip */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden border border-amber-300">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <i className="fa-solid fa-lightbulb text-white"></i>
            </div>
            <h4 className="text-xl font-black">আজকের স্বাস্থ্য টিপস</h4>
          </div>
          <p className="text-lg font-black leading-relaxed italic">
            "{healthFact}"
          </p>
        </div>
        <i className="fa-solid fa-sparkles absolute -right-8 -bottom-8 text-[12rem] opacity-20 rotate-12 pointer-events-none"></i>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {metrics.map((m, i) => (
          <div 
            key={i} 
            className="group bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-black/40 relative overflow-hidden"
          >
            <div className="flex gap-5 relative z-10">
              <div className={`w-16 h-16 rounded-[1.8rem] bg-gradient-to-br ${m.color} text-white flex items-center justify-center shrink-0 shadow-lg shadow-current/20 group-hover:scale-110 transition-transform duration-500`}>
                <i className={`fa-solid ${m.icon} text-3xl`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-base font-black text-slate-800 dark:text-slate-100">{m.label}</h4>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full uppercase tracking-tighter">
                    লক্ষ্য: {m.timing}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-snug mb-4">
                  {m.desc}
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">রিকভারি প্রগ্রেস</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white leading-none">{Math.round(m.progress)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-3 overflow-hidden p-0.5">
                    <div 
                      className={`bg-gradient-to-r ${m.color} h-full rounded-full transition-all duration-1000 ease-out`} 
                      style={{ width: `${m.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <i className={`fa-solid ${m.icon} absolute -right-6 -bottom-6 text-9xl opacity-[0.03] dark:opacity-[0.05] rotate-12 transition-transform duration-700 group-hover:rotate-0 group-hover:scale-110 pointer-events-none`}></i>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HealthProgress;
