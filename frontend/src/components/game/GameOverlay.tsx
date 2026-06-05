'use client';

import React, { useState, useEffect } from 'react';
import { GameState, SimulationResult, startGame, advise, simulateEdict } from '@/lib/gameApi';
import { ScrollText, X, AlertTriangle, Coins, Users, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GAME_ASSETS } from '@/lib/gameAssets';

interface GameOverlayProps {
  onStateChange: (state: GameState | null) => void;
  onViewChange: (view: 'standard' | 'famine' | 'stability' | 'tax' | 'military') => void;
}

const MINISTERS = [
  { id: 'wei_zhongxian', name: '魏忠贤', title: '司礼监秉笔太监', color: 'text-purple-900', imgPlaceholder: '魏' },
  { id: 'yuan_chonghuan', name: '袁崇焕', title: '蓟辽督师', color: 'text-blue-900', imgPlaceholder: '袁' },
  { id: 'xu_guangqi', name: '徐光启', title: '内阁大学士', color: 'text-green-900', imgPlaceholder: '徐' },
  { id: 'hong_chengchou', name: '洪承畴', title: '三边总督', color: 'text-red-900', imgPlaceholder: '洪' }
];

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
  
  const [showMinister, setShowMinister] = useState(false);
  const [selectedMinister, setSelectedMinister] = useState(MINISTERS[0].id);
  const [adviceText, setAdviceText] = useState('');
  
  const [showEdict, setShowEdict] = useState(false);
  const [edictText, setEdictText] = useState('');
  const [edictCategory, setEdictCategory] = useState<'军'|'政'|'外'|'他'>('政');
  
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [activeView, setActiveView] = useState<'standard' | 'famine' | 'stability' | 'tax' | 'military'>('standard');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  useEffect(() => {
    startGame().then(state => {
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
      const newState = res.new_state || FALLBACK_STATE;
      setGameState(newState);
      onStateChange(newState);
      setShowEdict(false);
      setEdictText('');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleViewChange = (view: 'standard' | 'famine' | 'stability' | 'tax' | 'military') => {
    setActiveView(view);
    onViewChange(view);
  };

  const displayYear = gameState?.year ? (gameState.year - 1627) : 0;
  const reignTitle = displayYear === 0 ? "天启七年" : `崇祯${displayYear}年`;

  return (
    <div className="absolute inset-0 pointer-events-none z-[300] font-serif">
      {/* Global Vignette and Paper Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none z-[1] shadow-[inset_0_0_200px_rgba(10,7,5,0.9)] mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjxwYXRoIGQ9Ik0wIDBMNCA0Wk00IDBMMCA0WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50" />
      
      {/* Top Resource Bar */}
      <div className="absolute top-0 left-0 right-0 h-28 flex items-start pt-6 px-12 justify-between pointer-events-auto bg-gradient-to-b from-[#0a0705]/90 via-[#0a0705]/60 to-transparent">
        <div className="flex items-center gap-6">
          <div className="text-[#e4cfa1] flex flex-col justify-center drop-shadow-lg">
            <span className="text-3xl font-bold tracking-[0.2em]">{reignTitle}</span>
            <span className="text-sm opacity-60 tracking-wider mt-1 font-sans">公元 {gameState?.year || 1627}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-10 bg-[#1a110b]/90 px-10 py-4 rounded-sm border border-[#c09a53]/40 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md relative">
          <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
          <TopStat icon={<Coins className="w-6 h-6" />} label="国库" value={gameState.treasury} />
          <div className="w-[1px] h-8 bg-[#c09a53]/20" />
          <TopStat icon={<Users className="w-6 h-6" />} label="民心" value={gameState.stability} />
          <div className="w-[1px] h-8 bg-[#c09a53]/20" />
          <TopStat icon={<Flame className="w-6 h-6" />} label="灾情" value={gameState.famine} inverse />
          <div className="w-[1px] h-8 bg-[#c09a53]/20" />
          <TopStat icon={<AlertTriangle className="w-6 h-6" />} label="外患" value={gameState.threat} inverse />
        </div>
      </div>

      {/* Right Mode Panel */}
      <div 
        className={cn(
          "absolute top-36 right-0 transition-transform duration-500 pointer-events-auto flex items-start z-50",
          isRightCollapsed ? "translate-x-[calc(100%-2rem)]" : "translate-x-0"
        )}
      >
        <button 
          onClick={() => setIsRightCollapsed(!isRightCollapsed)}
          className="absolute left-1 top-4 bg-[#1a110b]/95 border-y border-l border-[#c09a53]/60 p-1.5 text-[#c09a53] shadow-lg rounded-l-md hover:bg-[#c09a53]/20 hover:text-[#e4cfa1] transition-colors z-20"
        >
          {isRightCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="w-48 p-4 flex flex-col gap-2 bg-[#1a110b]/95 border border-[#c09a53]/40 shadow-2xl rounded-l-sm relative mr-8">
          <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
          <ViewBtn label="标准版图" active={activeView === 'standard'} onClick={() => handleViewChange('standard')} />
          <ViewBtn label="灾情示警" active={activeView === 'famine'} onClick={() => handleViewChange('famine')} />
          <ViewBtn label="民心向背" active={activeView === 'stability'} onClick={() => handleViewChange('stability')} />
          <ViewBtn label="税负徭役" active={activeView === 'tax'} onClick={() => handleViewChange('tax')} />
          <ViewBtn label="边防军备" active={activeView === 'military'} onClick={() => handleViewChange('military')} />
        </div>
      </div>

      {/* Left Panels */}
      <div 
        className={cn(
          "absolute top-36 left-0 transition-transform duration-500 pointer-events-auto flex items-start z-50",
          isLeftCollapsed ? "-translate-x-[calc(100%-2rem)]" : "translate-x-0"
        )}
      >
        <div className="w-[340px] flex flex-col gap-6 ml-8">
          <div className="relative p-6 min-h-[160px] bg-[#1a110b]/95 border border-[#c09a53]/40 shadow-2xl rounded-sm overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(192,154,83,0.05),_transparent_70%)] pointer-events-none" />
            <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
            <div className="absolute left-1 top-1 w-6 h-6 border-t border-l border-[#c09a53]/40 pointer-events-none" />
            <div className="absolute right-1 bottom-1 w-6 h-6 border-b border-r border-[#c09a53]/40 pointer-events-none" />
            
            <h3 className="text-xl font-bold text-[#e4cfa1] tracking-widest mb-4 border-b border-[#c09a53]/30 pb-3 flex items-center gap-2 drop-shadow-md">
              <span className="w-1.5 h-4 bg-[#c09a53] inline-block shadow-[0_0_5px_#c09a53]" />
              天下形势
            </h3>
            <p className="text-[15px] text-[#d4b392] leading-relaxed tracking-wide relative z-10">
              {displayYear === 0 ? "先帝大行，阉党乱政，四海困穷，建州女真于关外虎视眈眈。朕当如何力挽狂澜？" : `天下大势风起云涌。当前威望尚可，然国事维艰，${gameState.events[0] || '百废待兴'}。`}
            </p>
          </div>

          <div className="relative p-6 min-h-[280px] bg-[#1a110b]/95 border border-[#c09a53]/40 shadow-2xl rounded-sm overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(192,154,83,0.05),_transparent_70%)] pointer-events-none" />
            <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
            <div className="absolute left-1 top-1 w-6 h-6 border-t border-l border-[#c09a53]/40 pointer-events-none" />
            <div className="absolute right-1 bottom-1 w-6 h-6 border-b border-r border-[#c09a53]/40 pointer-events-none" />
            
            <h3 className="text-xl font-bold text-[#e4cfa1] tracking-widest mb-4 border-b border-[#c09a53]/30 pb-3 flex items-center gap-2 drop-shadow-md">
              <span className="w-1.5 h-4 bg-[#c09a53] inline-block shadow-[0_0_5px_#c09a53]" />
              要务急报
            </h3>
            <ul className="space-y-4 relative z-10">
              {(gameState.events || []).map((ev, i) => (
                <li key={i} className="text-[15px] text-[#d4b392] leading-relaxed flex items-start gap-3 tracking-wide">
                  <span className="text-[#c09a53] font-bold mt-0.5 opacity-80 drop-shadow-[0_0_2px_#c09a53]">◈</span> 
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          </div>
          <button 
            onClick={() => setShowMinister(true)} 
            className="relative overflow-hidden bg-[#1a110b]/95 text-[#e4cfa1] px-6 py-4 text-[15px] hover:bg-[#c09a53]/20 transition-all shadow-2xl border border-[#c09a53]/50 font-bold tracking-[0.2em] text-center group"
          >
            <div className="absolute inset-1 border border-[#c09a53]/20 pointer-events-none group-hover:border-[#c09a53]/50 transition-colors" />
            召集廷议
          </button>
        </div>
        <button 
          onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
          className="absolute right-1 top-4 bg-[#1a110b]/95 border-y border-r border-[#c09a53]/60 p-1.5 text-[#c09a53] shadow-lg rounded-r-md hover:bg-[#c09a53]/20 hover:text-[#e4cfa1] transition-colors z-20"
        >
          {isLeftCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Right Bottom Edict Button */}
      <div className="absolute bottom-12 right-12 pointer-events-auto flex items-center justify-center">
        <div className="absolute w-36 h-36 bg-[#c09a53]/10 rounded-full animate-ping pointer-events-none opacity-50" />
        <div className="absolute w-32 h-32 border border-[#c09a53]/30 rounded-full animate-[spin_10s_linear_infinite] pointer-events-none" />
        <div className="absolute w-28 h-28 border border-[#c09a53]/40 rounded-full animate-[spin_15s_linear_infinite_reverse] pointer-events-none" />
        <button 
          onClick={() => setShowEdict(true)}
          className="w-24 h-24 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgba(192,154,83,0.4)] active:scale-95 flex items-center justify-center text-transparent shadow-2xl relative group"
          style={{ backgroundImage: `url(${GAME_ASSETS.ui.buttons.edictMainButton})`, backgroundSize: '100% 100%' }}
        >
          <div className="absolute inset-0 rounded-full bg-black/40 group-hover:bg-transparent transition-colors duration-300" />
          <span className="absolute inset-0 flex items-center justify-center text-[22px] font-bold text-[#e4cfa1] tracking-[0.2em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] opacity-0 group-hover:opacity-100 bg-[#8b2323]/80 rounded-full transition-all duration-300 scale-90 group-hover:scale-100 border-2 border-[#c09a53]/50">拟旨</span>
        </button>
      </div>

      {/* Minister Modal */}
      {showMinister && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-[400]">
          <div 
            className="w-[900px] h-[600px] relative flex p-12 pr-16 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            style={{ backgroundImage: `url(${GAME_ASSETS.ui.panels.modalBackground})`, backgroundSize: '100% 100%' }}
          >
            {/* Left Portrait Column */}
            <div className="w-1/3 flex flex-col items-center pt-8 border-r border-[#cca366]/30 pr-6">
              <div className="w-40 h-56 border border-[#3d2b1f] mb-6 bg-[#e8debe] flex items-center justify-center shadow-lg relative">
                 <span className="text-6xl text-[#3d2b1f] opacity-80">{MINISTERS.find(m => m.id === selectedMinister)?.imgPlaceholder}</span>
              </div>
              <h2 className="text-2xl font-bold text-[#3d2b1f] mb-2">{MINISTERS.find(m => m.id === selectedMinister)?.name}</h2>
              <span className="text-[#8b2323] font-bold text-sm px-3 py-1 border border-[#8b2323]">{MINISTERS.find(m => m.id === selectedMinister)?.title}</span>
            </div>
            
            {/* Right Dialogue Column */}
            <div className="w-2/3 pl-10 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                 <h2 className="text-2xl font-bold text-[#3d2b1f] tracking-wider">廷议录</h2>
                 <button onClick={() => setShowMinister(false)} className="text-[#3d2b1f] hover:text-[#8b2323] transition-colors"><X className="w-8 h-8" /></button>
              </div>

              <div className="flex gap-2 mb-6 pb-2">
                {MINISTERS.map(m => (
                  <button 
                    key={m.id}
                    onClick={() => { setSelectedMinister(m.id); setAdviceText(''); }}
                    className={cn("px-4 py-2 text-sm transition-colors border", selectedMinister === m.id ? "bg-[#3d2b1f] text-[#f4ebd0] border-[#3d2b1f]" : "text-[#3d2b1f] border-[#cca366]/50 hover:bg-[#e8debe]")}
                  >
                    {m.name}
                  </button>
                ))}
              </div>

              <div className="flex-1 bg-transparent p-4 min-h-[200px] mb-6 overflow-y-auto relative text-lg leading-relaxed text-[#3d2b1f]">
                {adviceText ? (
                  <p className="font-medium whitespace-pre-wrap">{adviceText}</p>
                ) : (
                  <div className="h-full flex items-center justify-center text-[#8a7f72] italic">请点击下方“赐言”以询问对策...</div>
                )}
              </div>

              <button 
                onClick={handleAskAdvice}
                disabled={loading}
                className="w-full bg-[#2a1d15] hover:bg-[#3d2b1f] text-[#cca366] py-3 text-lg font-bold transition-colors disabled:opacity-50 shadow-md tracking-widest border border-[#cca366]/30"
              >
                {loading ? '沉吟中...' : '赐言'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edict Modal */}
      {showEdict && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-[400]">
          <div 
            className="w-[900px] h-[650px] relative p-16 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col"
            style={{ backgroundImage: `url(${GAME_ASSETS.ui.panels.modalBackground})`, backgroundSize: '100% 100%' }}
          >
            <div className="flex justify-between items-start mb-6 border-b border-[#cca366]/50 pb-4">
               <h2 className="text-3xl font-bold text-[#3d2b1f] tracking-[0.2em] w-full text-center">奉天承运皇帝诏曰</h2>
               <button onClick={() => setShowEdict(false)} className="absolute top-12 right-12 text-[#3d2b1f] hover:text-[#8b2323]"><X className="w-8 h-8" /></button>
            </div>

            <div className="flex gap-8 flex-1">
              {/* Left Side: Category selector */}
              <div className="w-1/5 flex flex-col gap-6 justify-center pl-4">
                {(['军','政','外','他'] as const).map(cat => (
                   <button
                     key={cat}
                     onClick={() => setEdictCategory(cat)}
                     className={cn("w-14 h-14 flex items-center justify-center text-xl font-bold border-2 transform rotate-45 transition-all shadow-sm", 
                      edictCategory === cat ? "border-[#8b2323] text-[#8b2323] bg-[#e8debe]" : "border-[#cca366] text-[#3d2b1f] hover:bg-[#e8debe]/50")}
                   >
                     <span className="-rotate-45">{cat}</span>
                   </button>
                ))}
              </div>
              
              {/* Right Side: Input */}
              <div className="w-4/5 flex flex-col pr-4 pb-4">
                <p className="text-[#8a7f72] mb-3 italic">请输入{edictCategory}事诏书内容...</p>
                <textarea
                  value={edictText}
                  onChange={e => setEdictText(e.target.value)}
                  className="w-full flex-1 bg-transparent text-[#3d2b1f] p-4 font-serif text-xl border border-[#cca366]/50 resize-none focus:outline-none focus:border-[#8b2323] focus:bg-[#e8debe]/20 leading-loose placeholder:text-[#3d2b1f]/30"
                  placeholder={`朕知天下艰难，今特下明诏，凡涉${edictCategory}务者，皆依此令...`}
                />

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={handleSimulate}
                    disabled={loading || !edictText.trim()}
                    className="bg-[#8b2323] text-[#f4ebd0] px-10 py-4 text-xl font-bold tracking-widest hover:bg-[#6a1b1b] transition-colors disabled:opacity-50 shadow-xl border border-[#3d2b1f]"
                  >
                    {loading ? '盖印中...' : '颁布诏书'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Turn Result Modal */}
      {simResult && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center pointer-events-auto z-[500]">
          <div 
            className="w-[800px] min-h-[500px] relative p-16 shadow-[0_0_50px_rgba(139,35,35,0.4)] flex flex-col"
            style={{ backgroundImage: `url(${GAME_ASSETS.ui.panels.modalBackground})`, backgroundSize: '100% 100%' }}
          >
            <h2 className="text-4xl font-bold text-center text-[#3d2b1f] mb-8 tracking-[0.3em]">{reignTitle} · 史官纪事</h2>
            
            <div className="mb-8 p-6 bg-transparent border border-[#cca366]/50 relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#8b2323]"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#8b2323]"></div>
              <p className="text-2xl text-[#3d2b1f] leading-[2.5] indent-10 font-medium">{simResult.narrative}</p>
            </div>

            <div className="pt-4 mb-10 flex-1">
              <h4 className="text-[#8b2323] font-bold text-xl mb-4 flex items-center gap-2">
                <ScrollText className="w-6 h-6" /> 岁末考评
              </h4>
              <ul className="space-y-3 pl-2">
                {(simResult.impact_summary || []).map((impact, i) => (
                  <li key={i} className="text-[#3d2b1f] text-lg font-medium">· {impact}</li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => setSimResult(null)}
              className="w-full bg-[#2a1d15] text-[#cca366] py-4 text-xl font-bold hover:bg-[#3d2b1f] transition-colors tracking-widest border border-[#cca366]/30 shadow-lg"
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
  const isWarning = inverse ? (value > 50 && value <= 70) : (value >= 30 && value < 50);
  
  let barColor = "bg-[#c09a53]"; // normal gold
  let textColor = "text-[#e4cfa1]";
  let iconColor = "text-[#c09a53]";

  if (isDanger) {
    barColor = "bg-[#d32f2f] shadow-[0_0_10px_rgba(211,47,47,0.8)]"; // dark red
    textColor = "text-[#ff6666] animate-pulse";
    iconColor = "text-[#ff6666] animate-pulse drop-shadow-[0_0_5px_rgba(255,102,102,0.8)]";
  } else if (isWarning) {
    barColor = "bg-[#d49a6a]"; // orange/warning
    textColor = "text-[#ffcc99]";
    iconColor = "text-[#d49a6a]";
  }

  return (
    <div className="flex items-center gap-4 relative z-10 group">
      <div className={cn("flex items-center gap-1.5 font-bold tracking-widest transition-colors", iconColor)}>
        {icon} <span className="text-[15px]">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-32 h-2.5 bg-[#0a0705] rounded-sm overflow-hidden border border-[#c09a53]/20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
          <div 
            className={cn("h-full transition-all duration-1000 relative", barColor)} 
            style={{ width: `${value}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/20 mix-blend-overlay" />
          </div>
        </div>
        <span className={cn("text-lg w-8 font-bold font-sans", textColor)}>{value}</span>
      </div>
    </div>
  );
}

function ViewBtn({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-5 py-3.5 text-[15px] text-left transition-all duration-300 font-bold tracking-widest border flex items-center justify-between relative z-10 rounded-sm group overflow-hidden",
        active 
          ? "bg-[#c09a53]/20 border-[#c09a53] text-[#e4cfa1] shadow-[inset_0_0_15px_rgba(192,154,83,0.2)]" 
          : "border-transparent text-[#a38a6a] hover:bg-[#c09a53]/10 hover:text-[#d4b392] hover:border-[#c09a53]/30"
      )}
    >
      {active && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(192,154,83,0.15),_transparent)] pointer-events-none" />}
      <span className="relative z-10 group-hover:translate-x-1 transition-transform">{label}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-[#c09a53] shadow-[0_0_5px_#c09a53] relative z-10" />}
    </button>
  );
}
