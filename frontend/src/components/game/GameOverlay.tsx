'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CircleDollarSign, Wheat, Tent, Swords, Shield, Heart, X, ScrollText, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameState, SimulationResult, simulateEdict } from '@/lib/gameApi';
import { GAME_ASSETS } from '@/lib/gameAssets';

interface GameOverlayProps {
  gameState: GameState;
  onStateChange: (newState: GameState) => void;
  onViewChange: (view: 'standard' | 'famine' | 'stability' | 'tax' | 'military') => void;
}

function formatNumber(val: number, unit: string = '') {
  if (val >= 10000) {
    const w = val / 10000;
    const str = parseFloat(w.toFixed(2)).toString();
    return `${str}万${unit}`;
  }
  return `${val}${unit}`;
}

const FALLBACK_STATE: GameState = {
  year: 1627,
  turn: 1,
  treasury: 20,
  stability: 30,
  famine: 80,
  threat: 70,
  events: ["陕西大旱，饥民遍野", "后金在辽东虎视眈眈", "阉党魏忠贤权倾朝野，国库空虚"]
};

function getChongzhenDate(turn: number) {
  const startMonth = 10;
  const passedMonths = Math.max(0, turn - 1);
  const currentMonth = ((startMonth - 1 + passedMonths) % 12) + 1;
  const currentYear = 1 + Math.floor((startMonth - 1 + passedMonths) / 12);
  
  const chineseNumbers = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
  
  const yearStr = currentYear === 1 ? '元' : (chineseNumbers[currentYear] || currentYear.toString());
  const monthStr = chineseNumbers[currentMonth];
  
  return {
    reignTitle: `崇祯${yearStr}年`,
    monthTitle: `${monthStr}月`
  };
}

export default function GameOverlay({ gameState: propsGameState, onStateChange, onViewChange }: GameOverlayProps) {
  const [gameState, setGameState] = useState<GameState>(propsGameState || FALLBACK_STATE);
  const [loading, setLoading] = useState(false);
  
  const [showEdict, setShowEdict] = useState(false);
  const [edictText, setEdictText] = useState('');
  const [edictCategory, setEdictCategory] = useState<'军'|'政'|'外'|'他'>('政');
  const [isStamping, setIsStamping] = useState(false);
  
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [activeView, setActiveView] = useState<'standard' | 'famine' | 'stability' | 'tax' | 'military'>('standard');
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  useEffect(() => {
    if (propsGameState) setGameState(propsGameState);
  }, [propsGameState]);

  const handleSimulate = async () => {
    if (!edictText.trim()) return;
    setLoading(true);
    setIsStamping(true);
    
    // Wait for the stamping animation to finish
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const res = await simulateEdict(gameState, `【${edictCategory}】` + edictText);
      setSimResult(res);
      const newState = res.new_state || FALLBACK_STATE;
      setGameState(newState);
      onStateChange(newState);
      
      // Dispatch event to tell AppShell to update institutions/factions
      window.dispatchEvent(new Event('gameStateChanged'));
      
      setShowEdict(false);
      setEdictText('');
      setIsStamping(false);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleViewChange = (view: 'standard' | 'famine' | 'stability' | 'tax' | 'military') => {
    setActiveView(view);
    onViewChange(view);
  };

  const { reignTitle, monthTitle } = getChongzhenDate(gameState?.turn || 1);

  return (
    <div className="absolute inset-0 pointer-events-none z-[300] font-serif">
      {/* Global Vignette and Paper Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none z-[1] shadow-[inset_0_0_200px_rgba(10,7,5,0.9)] mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjxwYXRoIGQ9Ik0wIDBMNCA0Wk00IDBMMCA0WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50" />
      
      {/* Top Resource Bar (Updated to horizontal dark bar design) */}
      <div className="absolute top-0 left-0 right-0 h-[56px] pointer-events-auto bg-[#0a0705] border-t-[3px] border-b-[3px] border-[#3a2818] flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.9)] relative z-50">
        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjxwYXRoIGQ9Ik0wIDBMNCA0Wk00IDBMMCA0WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] mix-blend-screen pointer-events-none" />
        <div className="absolute inset-0 border-t border-b border-[#cca366]/20 pointer-events-none" />
        
        <div className="flex items-center gap-10 relative z-10 px-8 w-full max-w-[1200px] justify-between">
          <TopStat icon={<CircleDollarSign className="w-8 h-8" strokeWidth={1.5} />} label="国库" valueStr={formatNumber(gameState.treasury, '两')} />
          <TopStat icon={<Wheat className="w-8 h-8" strokeWidth={1.5} />} label="粮草" valueStr={formatNumber(gameState.grain || 2880000, '石')} />
          <TopStat icon={<Tent className="w-8 h-8" strokeWidth={1.5} />} label="兵力" valueStr={formatNumber(gameState.troops || 576000, '')} />
          <TopStat icon={<Swords className="w-8 h-8" strokeWidth={1.5} />} label="军备" valueStr={formatNumber(gameState.supplies || 90700, '')} />
          <TopStat icon={<Shield className="w-8 h-8" strokeWidth={1.5} />} label="威望" valueStr={String(gameState.prestige || 10)} />
          <TopStat icon={<Heart className="w-8 h-8" strokeWidth={1.5} />} label="民心" valueStr={String(gameState.stability || 45)} />
        </div>
      </div>

      {/* Right Mode Panel */}
      <div className="absolute top-36 right-8 pointer-events-auto flex flex-col items-end z-50">
        <div 
          className={cn(
            "transition-all duration-500 origin-right",
            isRightCollapsed ? "opacity-0 scale-95 pointer-events-none absolute right-0" : "opacity-100 scale-100 relative"
          )}
        >
          <div className="w-48 p-4 flex flex-col gap-2 bg-[#1a110b]/95 border border-[#c09a53]/40 shadow-2xl rounded-sm relative">
            <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
            <button 
              onClick={() => setIsRightCollapsed(true)}
              className="absolute -left-3 top-4 bg-[#1a110b] border border-[#c09a53]/60 p-1 text-[#c09a53] shadow-lg rounded-full hover:bg-[#c09a53]/20 hover:text-[#e4cfa1] transition-colors z-20"
            >
              <ChevronRight size={14} />
            </button>
            <ViewBtn label="标准版图" active={activeView === 'standard'} onClick={() => handleViewChange('standard')} />
            <ViewBtn label="灾情示警" active={activeView === 'famine'} onClick={() => handleViewChange('famine')} />
            <ViewBtn label="民心向背" active={activeView === 'stability'} onClick={() => handleViewChange('stability')} />
            <ViewBtn label="税负徭役" active={activeView === 'tax'} onClick={() => handleViewChange('tax')} />
            <ViewBtn label="边防军备" active={activeView === 'military'} onClick={() => handleViewChange('military')} />

            {/* Map Legend */}
            {activeView !== 'standard' && (
              <div className="mt-2 pt-2 border-t border-[#c09a53]/30">
                <div className="text-[#e4cfa1] text-xs mb-1 font-bold">图例 (Legend)</div>
                {activeView === 'famine' && (
                  <div className="flex flex-col gap-1 text-[10px] text-[#d4c4a8]">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#6b0000] border border-[#1a110b]"></div> 极旱 / 易子而食</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#9e1a1a] border border-[#1a110b]"></div> 大灾 / 流民四起</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#cc3300] border border-[#1a110b]"></div> 中灾 / 欠收</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#e65c00] border border-[#1a110b]"></div> 小灾 / 旱情</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#c6a982] border border-[#1a110b]"></div> 正常 / 丰收</div>
                  </div>
                )}
                {activeView === 'stability' && (
                  <div className="flex flex-col gap-1 text-[10px] text-[#d4c4a8]">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#2980b9] border border-[#1a110b]"></div> 民心思定</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#3498db] border border-[#1a110b]"></div> 治安良好</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#c6a982] border border-[#1a110b]"></div> 勉强维持</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#e74c3c] border border-[#1a110b]"></div> 动荡不安</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#c0392b] border border-[#1a110b]"></div> 民变聚啸</div>
                  </div>
                )}
                {activeView === 'tax' && (
                  <div className="flex flex-col gap-1 text-[10px] text-[#d4c4a8]">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#3e2723] border border-[#1a110b]"></div> 赋役剥皮</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#5d4037] border border-[#1a110b]"></div> 连年加派</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#8d6e63] border border-[#1a110b]"></div> 赋役沉重</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#bcaaa4] border border-[#1a110b]"></div> 赋役适中</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#c6a982] border border-[#1a110b]"></div> 轻徭薄赋</div>
                  </div>
                )}
                {activeView === 'military' && (
                  <div className="flex flex-col gap-1 text-[10px] text-[#d4c4a8]">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#1b5e20] border border-[#1a110b]"></div> 重兵云集</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#388e3c] border border-[#1a110b]"></div> 防备森严</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#81c784] border border-[#1a110b]"></div> 军备尚可</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#f57f17] border border-[#1a110b]"></div> 军备废弛</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#bf360c] border border-[#1a110b]"></div> 极度危险</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* The ancient circular button when collapsed */}
        <button
          onClick={() => setIsRightCollapsed(false)}
          className={cn(
            "w-16 h-16 rounded-full bg-[#1a110b]/95 border-2 border-[#c09a53]/60 shadow-[0_0_15px_rgba(192,154,83,0.3)] flex items-center justify-center transition-all duration-500 text-[#e4cfa1] hover:bg-[#c09a53]/20 hover:scale-110 group",
            isRightCollapsed ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-50 pointer-events-none absolute right-0"
          )}
        >
          <div className="absolute inset-1 border border-[#c09a53]/30 rounded-full pointer-events-none group-hover:border-[#c09a53]/60 transition-colors" />
          <div className="absolute inset-2 border border-dashed border-[#c09a53]/20 rounded-full pointer-events-none animate-[spin_20s_linear_infinite]" />
          <span className="font-bold text-[17px] font-serif leading-tight drop-shadow-md flex flex-col items-center justify-center">
            <span>视</span>
            <span>图</span>
          </span>
        </button>
      </div>

      {/* Right Bottom Edict Button */}
      <div className="absolute bottom-12 right-12 pointer-events-auto flex items-center justify-center">
        <button 
          onClick={() => setShowEdict(true)}
          className="w-24 h-24 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgba(192,154,83,0.4)] active:scale-95 flex items-center justify-center text-transparent shadow-2xl relative group bg-transparent border-0"
          style={{ backgroundImage: `url(${GAME_ASSETS.ui.buttons.edictMainButton})`, backgroundSize: '100% 100%' }}
        >
          <span className="absolute inset-0 flex items-center justify-center text-[22px] font-bold text-[#e4cfa1] tracking-[0.2em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] opacity-0 group-hover:opacity-100 bg-[#8b2323]/80 rounded-full transition-all duration-300 scale-90 group-hover:scale-100 border-2 border-[#c09a53]/50">拟旨</span>
        </button>
      </div>

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
              <div className="w-4/5 flex flex-col pr-4 pb-4 relative">
                <p className="text-[#8a7f72] mb-3 italic">请输入{edictCategory}事诏书内容...</p>
                <textarea
                  value={edictText}
                  onChange={e => setEdictText(e.target.value)}
                  className="w-full flex-1 bg-transparent text-[#3d2b1f] p-4 font-serif text-xl border border-[#cca366]/50 resize-none focus:outline-none focus:border-[#8b2323] focus:bg-[#e8debe]/20 leading-loose placeholder:text-[#3d2b1f]/30"
                  placeholder={`朕知天下艰难，今特下明诏，凡涉${edictCategory}务者，皆依此令...`}
                />

                {/* Stamp Animation Overlay */}
                <div 
                  className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-50 transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                    isStamping ? "opacity-90 scale-[0.6] rotate-[-5deg]" : "opacity-0 scale-[2] rotate-[30deg]"
                  )}
                >
                  <img src="/assets/ui/ornaments/奉天之宝.png" alt="奉天之宝" className="w-[300px] h-[300px] drop-shadow-[0_0_20px_rgba(193,44,44,0.6)]" />
                </div>

                <div className="mt-8 flex justify-end relative z-50">
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
            <h2 className="text-4xl font-bold text-center text-[#3d2b1f] mb-8 tracking-[0.3em]">{reignTitle}{monthTitle} · 史官纪事</h2>
            
            <div className="mb-8 p-6 bg-transparent border border-[#cca366]/50 relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#8b2323]"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#8b2323]"></div>
              <p className="text-2xl text-[#3d2b1f] leading-[2.5] indent-10 font-medium">{simResult.narrative}</p>
            </div>

            <div className="pt-4 mb-6 flex-1">
              <h4 className="text-[#8b2323] font-bold text-xl mb-4 flex items-center gap-2">
                <ScrollText className="w-6 h-6" /> 岁末考评
              </h4>
              <ul className="space-y-3 pl-2">
                {(simResult.impact_summary || []).map((impact, i) => (
                  <li key={i} className="text-[#3d2b1f] text-lg font-medium">· {impact}</li>
                ))}
              </ul>
            </div>

            {/* Court Flow Tracker */}
            {simResult.court_flow_results?.length > 0 && (
              <div className="mb-8 p-4 bg-[#1a110b]/10 border border-[#8b2323]/30">
                <h4 className="text-[#8b2323] font-bold text-lg mb-3 flex items-center gap-2">
                  政令流转轨迹
                </h4>
                <div className="flex flex-col gap-3">
                  {simResult.court_flow_results.map((flow, idx) => (
                    <div key={idx} className="flex items-center text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        {flow.stages.map((stage, i) => (
                          <React.Fragment key={i}>
                            <span className="bg-[#cca366] text-[#3d2b1f] px-2 py-0.5 rounded font-bold">{stage}</span>
                            {i < flow.stages.length - 1 && <ArrowRight className="w-4 h-4 text-[#8b2323]" />}
                          </React.Fragment>
                        ))}
                      </div>
                      {(flow.corruption_loss > 0 || flow.delay_days > 0) && (
                        <div className="ml-4 flex items-center gap-2 text-[#8b2323] font-bold text-xs bg-[#8b2323]/10 px-2 py-1 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          {flow.delay_days > 0 && <span>延误 {flow.delay_days} 天</span>}
                          {flow.corruption_loss > 0 && <span>漂没 {Math.round(flow.corruption_loss * 100)}%</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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

function TopStat({ icon, label, valueStr }: { icon: React.ReactNode, label: string, valueStr: string }) {
  return (
    <div className="flex items-center gap-3 relative z-10 group cursor-default">
      <div className="text-[#a38a6a] flex-shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {icon}
      </div>
      <div className="flex flex-col justify-center">
        <span className="text-[14px] text-[#8a7a60] font-bold tracking-widest leading-none mb-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">{label}</span>
        <span className="text-[17px] text-[#e8debe] font-serif tracking-wider leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{valueStr}</span>
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
