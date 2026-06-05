'use client';

import React, { useState, useEffect } from 'react';
import { GameState, SimulationResult, startGame, advise, simulateEdict } from '@/lib/gameApi';
import { ScrollText, Send, X, AlertTriangle, Coins, Users, Flame, Map as MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameOverlayProps {
  onStateChange: (state: GameState | null) => void;
  onViewChange: (view: 'standard' | 'famine' | 'stability' | 'threat') => void;
}

const MINISTERS = [
  { id: 'wei_zhongxian', name: '施凤来', title: '内阁首辅', color: 'text-purple-900', imgPlaceholder: '施' },
  { id: 'yuan_chonghuan', name: '袁崇焕', title: '蓟辽督师', color: 'text-blue-900', imgPlaceholder: '袁' },
  { id: 'xu_guangqi', name: '徐光启', title: '内阁大学士', color: 'text-green-900', imgPlaceholder: '徐' },
  { id: 'hong_chengchou', name: '洪承畴', title: '三边总督', color: 'text-red-900', imgPlaceholder: '洪' }
];

// Fallback initial state in case API fails
const FALLBACK_STATE: GameState = {
  year: 1627,
  turn: 1,
  treasury: 20,
  stability: 30,
  famine: 80,
  threat: 70,
  events: ["陕西大旱，饥民遍野", "后金在辽东虎视眈眈", "阉党魏忠贤权倾朝野，国库空虚"]
};

export default function GameOverlay({ onStateChange, onViewChange }: GameOverlayProps) {
  const [gameState, setGameState] = useState<GameState>(FALLBACK_STATE);
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showMinister, setShowMinister] = useState(false);
  const [selectedMinister, setSelectedMinister] = useState(MINISTERS[0].id);
  const [adviceText, setAdviceText] = useState('');
  
  const [showEdict, setShowEdict] = useState(false);
  const [edictText, setEdictText] = useState('');
  const [edictCategory, setEdictCategory] = useState<'军'|'政'|'外'|'他'>('政');
  
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  
  const [activeView, setActiveView] = useState<'standard' | 'famine' | 'stability' | 'threat'>('standard');

  useEffect(() => {
    startGame().then(state => {
      // Validate year to prevent NaN
      const validState = (state && typeof state.year === 'number' && !isNaN(state.year)) ? state : FALLBACK_STATE;
      setGameState(validState);
      onStateChange(validState);
    }).catch(() => {
      setGameState(FALLBACK_STATE);
      onStateChange(FALLBACK_STATE);
    });
  }, []);

  const handleAskAdvice = async () => {
    setLoading(true);
    setAdviceText('臣正在思虑...');
    try {
      const res = await advise(gameState, selectedMinister);
      setAdviceText(res.advice);
    } catch (e) {
      setAdviceText('微臣惶恐，未能进言。');
    }
    setLoading(false);
  };

  const handleSimulate = async () => {
    if (!edictText.trim()) return;
    setLoading(true);
    try {
      const res = await simulateEdict(gameState, `【${edictCategory}】` + edictText);
      setSimResult(res);
      setGameState(res.new_state || FALLBACK_STATE);
      onStateChange(res.new_state || FALLBACK_STATE);
      setShowEdict(false);
      setEdictText('');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleViewChange = (view: 'standard' | 'famine' | 'stability' | 'threat') => {
    setActiveView(view);
    onViewChange(view);
  };

  // Safe year display
  const displayYear = gameState?.year ? (gameState.year - 1627) : 0;
  const reignTitle = displayYear === 0 ? "天启七年" : `崇祯${displayYear}年`;

  return (
    <div className="absolute inset-0 pointer-events-none z-[300] font-serif">
      
      {/* Top Bar (Black & Gold) */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-[#111] border-b border-[#cca366] flex items-center px-4 justify-between pointer-events-auto shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#cca366] flex items-center justify-center text-[#111] font-bold text-xl border-2 border-[#ffdb99] shadow-[0_0_10px_#cca366]">明</div>
          <div className="text-[#cca366] flex flex-col justify-center">
            <span className="text-sm font-bold tracking-widest">{reignTitle}</span>
            <span className="text-[10px] opacity-70">公元 {gameState?.year || 1627}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <TopStat icon={<Coins className="w-4 h-4" />} label="国库" value={gameState.treasury} />
          <TopStat icon={<Users className="w-4 h-4" />} label="民心" value={gameState.stability} />
          <TopStat icon={<Flame className="w-4 h-4" />} label="灾情" value={gameState.famine} inverse />
          <TopStat icon={<AlertTriangle className="w-4 h-4" />} label="外患" value={gameState.threat} inverse />
        </div>
      </div>

      {/* Right Side Map Views */}
      <div className="absolute top-20 right-4 bg-[#f4ebd0] border border-[#cca366] rounded flex flex-col p-1 pointer-events-auto shadow-lg text-[#3d2b1f] text-sm">
        <ViewBtn label="标准视图" active={activeView === 'standard'} onClick={() => handleViewChange('standard')} />
        <ViewBtn label="灾情视图" active={activeView === 'famine'} onClick={() => handleViewChange('famine')} />
        <ViewBtn label="民心视图" active={activeView === 'stability'} onClick={() => handleViewChange('stability')} />
        <ViewBtn label="动乱视图" active={activeView === 'threat'} onClick={() => handleViewChange('threat')} />
      </div>

      {/* Events Scroll (Left) */}
      <div className="absolute top-20 left-4 w-80 bg-[#f4ebd0] border-l-4 border-l-[#8b2323] rounded p-5 pointer-events-auto shadow-2xl relative overflow-hidden">
        {/* Ink blot aesthetic */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-black opacity-5 rounded-full blur-2xl"></div>
        
        <div className="flex justify-between items-center border-b-2 border-[#8b2323] pb-2 mb-4">
          <h3 className="text-xl font-bold text-[#3d2b1f] tracking-wider">天下大势</h3>
          <span className="bg-[#111] text-[#cca366] text-xs px-2 py-1">{reignTitle}</span>
        </div>
        <ul className="space-y-4">
          {(gameState.events || []).map((ev, i) => (
            <li key={i} className="text-sm text-[#4a3627] leading-relaxed flex gap-2">
              <span className="text-[#8b2323] font-bold">·</span> {ev}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setShowMinister(true)} className="bg-[#f4ebd0] text-[#3d2b1f] border border-[#3d2b1f] px-3 py-1.5 text-sm hover:bg-[#e6dcc0] transition-colors shadow-sm">
            召集廷议
          </button>
          <button onClick={() => setShowEdict(true)} className="bg-[#111] text-[#cca366] px-4 py-1.5 text-sm hover:bg-[#222] transition-colors shadow-sm">
            撰写诏书
          </button>
        </div>
      </div>

      {/* Minister Modal (廷议) */}
      {showMinister && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="bg-[#f4ebd0] w-[900px] h-[600px] shadow-2xl relative flex overflow-hidden border border-[#cca366]">
            {/* Left Portrait Column */}
            <div className="w-1/3 bg-[#e8debe] border-r border-[#cca366]/40 flex flex-col items-center pt-10 relative">
              <div className="w-40 h-64 border-2 border-[#3d2b1f] mb-4 bg-gradient-to-b from-[#f4ebd0] to-[#e8debe] flex items-center justify-center shadow-lg relative overflow-hidden">
                 <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] mix-blend-multiply"></div>
                 <span className="text-6xl text-[#3d2b1f] opacity-80">{MINISTERS.find(m => m.id === selectedMinister)?.imgPlaceholder}</span>
              </div>
              <h2 className="text-2xl font-bold text-[#3d2b1f] mb-1">{MINISTERS.find(m => m.id === selectedMinister)?.name}</h2>
              <span className="text-[#8b2323] font-bold text-sm px-3 py-1 border border-[#8b2323]">{MINISTERS.find(m => m.id === selectedMinister)?.title}</span>
              
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
            </div>
            
            {/* Right Dialogue Column */}
            <div className="w-2/3 p-8 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                 <h2 className="text-2xl font-bold text-[#3d2b1f] tracking-wider">{MINISTERS.find(m => m.id === selectedMinister)?.name}</h2>
                 <button onClick={() => setShowMinister(false)} className="text-[#3d2b1f] hover:text-[#8b2323]"><X className="w-6 h-6" /></button>
              </div>

              <div className="flex gap-2 mb-6 border-b border-[#cca366]/30 pb-2">
                {MINISTERS.map(m => (
                  <button 
                    key={m.id}
                    onClick={() => { setSelectedMinister(m.id); setAdviceText(''); }}
                    className={cn("px-3 py-1 text-sm transition-colors", selectedMinister === m.id ? "bg-[#3d2b1f] text-[#f4ebd0]" : "text-[#3d2b1f] hover:bg-[#e8debe]")}
                  >
                    {m.name}
                  </button>
                ))}
              </div>

              <div className="flex-1 bg-[#e8debe]/50 p-6 rounded-sm min-h-[200px] mb-6 overflow-y-auto border border-[#cca366]/30 relative shadow-inner">
                {adviceText ? (
                  <p className="text-[#3d2b1f] text-lg leading-loose whitespace-pre-wrap font-medium">{adviceText}</p>
                ) : (
                  <div className="h-full flex items-center justify-center text-[#8a7f72] italic">请点击下方“赐言”以询问对策...</div>
                )}
              </div>

              <button 
                onClick={handleAskAdvice}
                disabled={loading}
                className="w-full bg-[#111] hover:bg-[#222] text-[#cca366] py-3 text-lg font-bold transition-colors disabled:opacity-50 shadow-md"
              >
                {loading ? '沉吟中...' : '赐言 (Ask Advice)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edict Modal (诏书) */}
      {showEdict && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="w-[850px] relative">
            {/* Scroll Ends (Visual only) */}
            <div className="absolute -left-6 top-0 bottom-0 w-8 bg-[#3d2b1f] rounded-l-full shadow-2xl flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#2a1d15] shadow-inner mb-4"></div>
              <div className="w-10 h-10 rounded-full bg-[#2a1d15] shadow-inner"></div>
            </div>
            <div className="absolute -right-6 top-0 bottom-0 w-8 bg-[#3d2b1f] rounded-r-full shadow-2xl flex flex-col items-center justify-center">
               <div className="w-10 h-10 rounded-full bg-[#2a1d15] shadow-inner mb-4"></div>
               <div className="w-10 h-10 rounded-full bg-[#2a1d15] shadow-inner"></div>
            </div>
            
            {/* Main Scroll Content */}
            <div className="bg-[#f4ebd0] p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-y-[10px] border-[#e8debe] min-h-[500px]">
              <div className="flex justify-between items-start mb-8 border-b-2 border-[#8b2323] pb-4">
                 <h2 className="text-3xl font-bold text-[#3d2b1f] tracking-[0.2em] text-center w-full">奉天承运皇帝诏曰</h2>
                 <button onClick={() => setShowEdict(false)} className="absolute top-8 right-8 text-[#3d2b1f] hover:text-[#8b2323]"><X className="w-8 h-8" /></button>
              </div>

              <div className="flex gap-8">
                {/* Left Side: Category selector */}
                <div className="w-1/4 flex flex-col gap-4">
                  {(['军','政','外','他'] as const).map(cat => (
                     <button
                       key={cat}
                       onClick={() => setEdictCategory(cat)}
                       className={cn("w-16 h-16 flex items-center justify-center text-2xl font-bold border-2 transform rotate-45 mx-auto transition-all", 
                        edictCategory === cat ? "border-[#8b2323] text-[#8b2323] bg-[#e8debe]" : "border-[#cca366] text-[#cca366] hover:bg-[#e8debe]/50")}
                     >
                       <span className="-rotate-45">{cat}</span>
                     </button>
                  ))}
                </div>
                
                {/* Right Side: Input */}
                <div className="w-3/4 flex flex-col">
                  <p className="text-[#8a7f72] mb-2 italic">请输入{edictCategory}事诏书内容...</p>
                  <textarea
                    value={edictText}
                    onChange={e => setEdictText(e.target.value)}
                    className="w-full h-64 bg-transparent text-[#3d2b1f] p-4 font-serif text-xl border border-[#cca366] resize-none focus:outline-none focus:border-[#8b2323] focus:bg-[#e8debe]/20 leading-loose"
                    placeholder={`朕知天下艰难，今特下明诏，凡涉${edictCategory}务者，皆依此令...`}
                  />

                  <div className="mt-8 flex justify-end">
                    <button 
                      onClick={handleSimulate}
                      disabled={loading || !edictText.trim()}
                      className="bg-[#111] text-[#cca366] px-10 py-4 text-xl font-bold tracking-widest hover:bg-[#222] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xl"
                    >
                      {loading ? '盖印中...' : '颁布诏书'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Turn Result Modal */}
      {simResult && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center pointer-events-auto z-[400]">
          <div className="bg-[#f4ebd0] w-[800px] border-[6px] border-double border-[#8b2323] p-10 relative shadow-[0_0_50px_rgba(139,35,35,0.4)]">
            <h2 className="text-4xl font-bold text-center text-[#3d2b1f] mb-8 tracking-[0.3em]">{reignTitle} · 史官纪事</h2>
            
            <div className="mb-10 p-6 bg-[#e8debe]/50 border border-[#cca366]">
              <p className="text-2xl text-[#3d2b1f] leading-[2.5] indent-10 font-medium">{simResult.narrative}</p>
            </div>

            <div className="border-t border-dashed border-[#cca366] pt-6 mb-10">
              <h4 className="text-[#8b2323] font-bold text-xl mb-4 flex items-center gap-2">
                <ScrollText className="w-6 h-6" /> 岁末考评
              </h4>
              <ul className="space-y-3">
                {(simResult.impact_summary || []).map((impact, i) => (
                  <li key={i} className="text-[#3d2b1f] text-lg">· {impact}</li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => setSimResult(null)}
              className="w-full border-2 border-[#3d2b1f] text-[#3d2b1f] py-4 text-xl font-bold hover:bg-[#3d2b1f] hover:text-[#f4ebd0] transition-colors tracking-widest"
            >
              继续主政
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function TopStat({ icon, label, value, inverse = false }: { icon: React.ReactNode, label: string, value: number, inverse?: boolean }) {
  const isDanger = inverse ? value > 70 : value < 30;
  
  return (
    <div className="flex items-center gap-3 text-[#cca366]">
      <div className="flex items-center gap-1 opacity-80">
        {icon} <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-24 h-1.5 bg-[#333] rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-1000", isDanger ? "bg-[#8b2323]" : "bg-[#cca366]")} 
            style={{ width: `${value}%` }}
          />
        </div>
        <span className={cn("text-xs w-6 font-mono", isDanger && "text-[#ff6b6b]")}>{value}</span>
      </div>
    </div>
  );
}

function ViewBtn({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-left hover:bg-[#e8debe] transition-colors font-bold",
        active && "bg-[#3d2b1f] text-[#f4ebd0] hover:bg-[#3d2b1f]"
      )}
    >
      {label}
    </button>
  );
}
