'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, ScrollText, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameState, SimulationResult, simulateEdict, parseEdict, startGame } from '@/lib/gameApi';
import { GAME_ASSETS } from '@/lib/gameAssets';

const POLICY_TYPE_MAP: Record<string, string> = {
  "disaster_relief": "开仓赈灾",
  "anti_corruption": "整饬吏治",
  "tax_reduction": "蠲免赋税",
  "tax_increase": "加派三饷",
  "military_deployment": "调兵遣将",
  "fund_allocation": "调拨内帑",
  "imperial_examination": "开科取士",
  "appease_rebels": "招安流寇",
  "suppress_rebels": "发兵剿寇"
};

const EN_TO_ZH_MAP: Record<string, string> = {
  "shaanxi": "陕西", "shanxi": "山西", "liaodong": "辽东", "jingji": "京畿", "jiangnan": "江南", "sichuan": "四川", "shandong": "山东", "henan": "河南",
  "dongchang": "东厂", "jinyiwei": "锦衣卫", "neige": "内阁", "hubu": "户部", "bingbu": "兵部", "libu": "吏部", "xingbu": "刑部", "gongbu": "工部", "kedao": "科道"
};

function t(val: string | string[] | undefined): string {
  if (!val) return '';
  if (Array.isArray(val)) return val.map(v => EN_TO_ZH_MAP[v.toLowerCase()] || v).join(', ');
  return EN_TO_ZH_MAP[val.toLowerCase()] || val;
}

interface GameOverlayProps {
  gameState: GameState;
  onStateChange: (newState: GameState) => void;
  onViewChange: (view: 'standard' | 'famine' | 'stability' | 'tax' | 'military') => void;
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
  const [edictCategories, setEdictCategories] = useState<string[]>(['政']);
  const [isStamping, setIsStamping] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  const [showDraft, setShowDraft] = useState(false);
  const [draftPolicies, setDraftPolicies] = useState<any[]>([]);
  
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [activeView, setActiveView] = useState<'standard' | 'famine' | 'stability' | 'tax' | 'military'>('standard');
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  useEffect(() => {
    if (propsGameState) setGameState(propsGameState);
  }, [propsGameState]);

  const handleParse = async () => {
    if (!edictText.trim()) return;
    setLoading(true);
    setValidationError('');
    try {
      const policies = await parseEdict(`【${edictCategories.join(',')}】` + edictText);
      
      if (!policies || policies.length === 0) {
        setValidationError("内阁未能领会圣意，请陛下明示诏书的具体指令（如拨银多少、去往何地、交由何人去办）。");
        setLoading(false);
        return;
      }

      for (const p of policies) {
        if (p.policy_type === 'disaster_relief') {
          if (!p.budget_silver && !p.grain_amount) {
            setValidationError("赈灾必须拨付内帑（银）或太仓粟（粮），否则饥民无以果腹，请陛下在诏书中写明数额！");
            setLoading(false);
            return;
          }
          if (!p.target_regions || p.target_regions.length === 0) {
            setValidationError("赈灾必须指明布政使司（如陕西、山西等），否则款项不知发往何处！");
            setLoading(false);
            return;
          }
        }
        if (p.policy_type === 'anti_corruption' || p.policy_type === 'tax_increase' || p.policy_type === 'tax_reduction') {
          if (!p.target_regions || p.target_regions.length === 0) {
             setValidationError(`【${POLICY_TYPE_MAP[p.policy_type] || p.policy_type}】必须指明针对的具体州府或机构！`);
             setLoading(false);
             return;
          }
        }
      }

      setDraftPolicies(policies);
      setShowEdict(false);
      setShowDraft(true);
    } catch (e) {
      console.error(e);
      setValidationError("内阁票拟出现异常，请稍后再试。");
    }
    setLoading(false);
  };

  const handleExecuteDraft = async () => {
    setLoading(true);
    setIsStamping(true);
    
    // Wait for the stamping animation to finish
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const res = await simulateEdict(gameState, '', draftPolicies);
      setSimResult(res);
      const newState = res.new_state || FALLBACK_STATE;
      setGameState(newState);
      onStateChange(newState);
      
      window.dispatchEvent(new Event('gameStateChanged'));
      
      setShowDraft(false);
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
      <div className="absolute inset-0 pointer-events-none z-[1] shadow-[inset_0_0_200px_rgba(10,7,5,0.9)] mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjxwYXRoIGQ9Ik0wIDBMNCA0Wk00IDBMMCA0WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50" />
      
      <div className="absolute top-8 right-8 pointer-events-auto z-[200]">
        <button 
          onClick={async () => {
            const newState = await startGame();
            setGameState(newState);
            onStateChange(newState);
            window.dispatchEvent(new Event('gameStateChanged'));
          }}
          className="flex items-center gap-2 bg-[#8b2323] text-[#f4ebd0] px-4 py-2 text-sm font-bold tracking-widest hover:bg-[#6a1b1b] transition-colors shadow-lg border border-[#3d2b1f] opacity-80 hover:opacity-100"
        >
          <RotateCcw className="w-4 h-4" /> 重置天下
        </button>
      </div>

      <div className="absolute top-24 right-8 pointer-events-auto flex flex-col items-end z-50">
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
          </div>
        </div>

        <button
          onClick={() => setIsRightCollapsed(false)}
          className={cn(
            "w-16 h-16 rounded-full bg-[#1a110b]/95 border-2 border-[#c09a53]/60 shadow-[0_0_15px_rgba(192,154,83,0.3)] flex items-center justify-center transition-all duration-500 text-[#e4cfa1] hover:bg-[#c09a53]/20 hover:scale-110 group mt-4",
            isRightCollapsed ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-50 pointer-events-none absolute right-0"
          )}
        >
          <span className="font-bold text-[17px] font-serif leading-tight drop-shadow-md flex flex-col items-center justify-center">
            <span>视</span>
            <span>图</span>
          </span>
        </button>
      </div>

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
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-[400] font-serif">
          <div className="relative w-[1200px] h-[750px] flex items-center justify-center">
            <div 
              className="absolute inset-0 pointer-events-none z-50 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
              style={{ backgroundImage: `url(${GAME_ASSETS.ui.ming_assets.frame})`, backgroundSize: '100% 100%' }}
            />
            <div 
              className="absolute inset-[6%] flex flex-col p-8 z-10"
              style={{ backgroundImage: `url(${GAME_ASSETS.ui.ming_assets.parchment})`, backgroundSize: 'cover' }}
            >
              <div className="flex justify-between items-center mb-8 pb-4 relative">
                <h2 className="text-4xl font-bold text-[#3d2b1f] tracking-[0.3em] w-full text-center">奉天承运皇帝诏曰</h2>
                <button onClick={() => setShowEdict(false)} className="absolute top-0 right-4 hover:scale-110 transition-transform">
                  <img src={GAME_ASSETS.ui.ming_assets.close} alt="Close" className="w-8 h-8" />
                </button>
              </div>

              <div className="flex gap-12 flex-1 relative z-20">
                <div className="w-1/6 flex flex-col gap-4 justify-center items-center pl-4">
                  {(['军','政','外','他'] as const).map(cat => {
                    const isActive = edictCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setEdictCategories(prev => 
                            prev.includes(cat) 
                              ? (prev.length > 1 ? prev.filter(c => c !== cat) : prev) 
                              : [...prev, cat]
                          );
                        }}
                        className="w-20 h-20 relative flex items-center justify-center text-2xl font-bold transition-all hover:scale-110"
                      >
                        <img 
                          src={isActive ? GAME_ASSETS.ui.ming_assets.tabSelected : GAME_ASSETS.ui.ming_assets.tabNormal} 
                          className="absolute inset-0 w-full h-full object-contain drop-shadow-md" 
                          alt="" 
                        />
                        <span className={cn("relative z-10", isActive ? "text-[#8b2323] drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" : "text-[#3d2b1f]")}>{cat}</span>
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex-1 flex flex-col pr-8 pb-4 relative">
                  <div className="relative flex-1 flex flex-col">
                    <textarea
                      value={edictText}
                      onChange={e => { setEdictText(e.target.value); setValidationError(''); }}
                      className="w-full h-full flex-1 bg-transparent text-[#3d2b1f] font-bold p-8 font-serif text-[22px] resize-none focus:outline-none leading-[2.5] placeholder:text-[#3d2b1f]/30 relative z-10"
                      style={{ textIndent: '2em' }}
                      placeholder={`请输入${edictCategories.join('、')}事诏书内容...\n朕知天下艰难，今特下明诏，凡涉${edictCategories.join('、')}务者，皆依此令，勿敢违。`}
                    />
                    {validationError && (
                      <div className="absolute bottom-4 left-8 right-8 bg-[#8b2323]/95 text-[#f4ebd0] p-4 shadow-xl border-2 border-[#3d2b1f] z-50 animate-in fade-in slide-in-from-bottom-2">
                        <p className="font-bold flex items-center gap-2 tracking-widest"><AlertTriangle className="w-6 h-6"/> {validationError}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex justify-end relative z-50">
                    <button 
                      onClick={handleParse}
                      disabled={loading || !edictText.trim()}
                      className="relative w-48 h-14 flex items-center justify-center text-xl font-bold tracking-widest text-[#f4ebd0] hover:scale-105 active:scale-95 transition-all group disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <img src={GAME_ASSETS.ui.ming_assets.btnNormal} className="absolute inset-0 w-full h-full object-contain group-hover:hidden" alt="" />
                      <img src={GAME_ASSETS.ui.ming_assets.btnHover} className="absolute inset-0 w-full h-full object-contain hidden group-hover:block" alt="" />
                      <span className="relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{loading ? '发布中...' : '发布中旨'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Draft Review Modal */}
      {showDraft && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center pointer-events-auto z-[450] font-serif">
          <div className="relative w-[1000px] h-[750px] flex items-center justify-center">
            <div 
              className="absolute inset-0 pointer-events-none z-50 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
              style={{ backgroundImage: `url(${GAME_ASSETS.ui.ming_assets.frame})`, backgroundSize: '100% 100%' }}
            />
            <div 
              className="absolute inset-[6%] flex flex-col p-8 z-10"
              style={{ backgroundImage: `url(${GAME_ASSETS.ui.ming_assets.parchment})`, backgroundSize: 'cover' }}
            >
              <h2 className="text-3xl font-bold text-[#3d2b1f] text-center mb-6 tracking-widest border-b border-[#cca366]/50 pb-4">内阁票拟草案</h2>
              <div className="flex-1 overflow-y-auto pr-4 flex flex-col gap-6 relative">
                {draftPolicies.map((policy, idx) => (
                  <div key={idx} className="bg-[#e8debe]/50 p-4 border border-[#cca366]/50 relative z-40">
                    <div className="font-bold text-[#8b2323] mb-2 border-b border-[#cca366]/30 pb-1">事项 {idx + 1}: {POLICY_TYPE_MAP[policy.policy_type] || policy.policy_type}</div>
                    <div className="grid grid-cols-2 gap-4 text-lg text-[#3d2b1f]">
                      <div className="flex flex-col">
                        <span className="text-sm text-[#8a7f72]">调拨内帑 (两)</span>
                        <input 
                          type="number" 
                          value={policy.budget_silver || 0} 
                          onChange={(e) => {
                            const newPolicies = [...draftPolicies];
                            newPolicies[idx].budget_silver = parseInt(e.target.value) || 0;
                            setDraftPolicies(newPolicies);
                          }}
                          className="bg-transparent border-b border-[#cca366] focus:border-[#8b2323] outline-none"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-[#8a7f72]">发太仓粟 (石)</span>
                        <input 
                          type="number" 
                          value={policy.grain_amount || 0} 
                          onChange={(e) => {
                            const newPolicies = [...draftPolicies];
                            newPolicies[idx].grain_amount = parseInt(e.target.value) || 0;
                            setDraftPolicies(newPolicies);
                          }}
                          className="bg-transparent border-b border-[#cca366] focus:border-[#8b2323] outline-none"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-[#8a7f72]">调出地 (逗号分隔)</span>
                        <input 
                          type="text" 
                          value={t(policy.source_regions)} 
                          onChange={(e) => {
                            const newPolicies = [...draftPolicies];
                            newPolicies[idx].source_regions = e.target.value.split(',').map(s => s.trim());
                            setDraftPolicies(newPolicies);
                          }}
                          className="bg-transparent border-b border-[#cca366] focus:border-[#8b2323] outline-none"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-[#8a7f72]">行文布政使司 (目标地)</span>
                        <input 
                          type="text" 
                          value={t(policy.target_regions)} 
                          onChange={(e) => {
                            const newPolicies = [...draftPolicies];
                            newPolicies[idx].target_regions = e.target.value.split(',').map(s => s.trim());
                            setDraftPolicies(newPolicies);
                          }}
                          className="bg-transparent border-b border-[#cca366] focus:border-[#8b2323] outline-none"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-[#8a7f72]">圣意峻急 (1-10)</span>
                        <input 
                          type="number" 
                          min="1" max="10"
                          value={policy.strictness || 5} 
                          onChange={(e) => {
                            const newPolicies = [...draftPolicies];
                            newPolicies[idx].strictness = parseInt(e.target.value) || 5;
                            setDraftPolicies(newPolicies);
                          }}
                          className="bg-transparent border-b border-[#cca366] focus:border-[#8b2323] outline-none"
                        />
                      </div>
                      <div className="flex flex-col col-span-2">
                        <span className="text-sm text-[#8a7f72]">督办衙门 (逗号分隔)</span>
                        <input 
                          type="text" 
                          value={t(policy.target_institutions)} 
                          onChange={(e) => {
                            const newPolicies = [...draftPolicies];
                            newPolicies[idx].target_institutions = e.target.value.split(',').map(s => s.trim());
                            setDraftPolicies(newPolicies);
                          }}
                          className="bg-transparent border-b border-[#cca366] focus:border-[#8b2323] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stamp Animation Overlay inside Draft Modal */}
              <div 
                className={cn(
                  "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-50 transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                  isStamping ? "opacity-90 scale-[0.6] rotate-[-5deg]" : "opacity-0 scale-[2] rotate-[30deg]"
                )}
              >
                <img src="/assets/ui/ornaments/奉天之宝.png" alt="奉天之宝" className="w-[300px] h-[300px] drop-shadow-[0_0_20px_rgba(193,44,44,0.6)]" />
              </div>

              <div className="mt-6 flex justify-between relative z-50">
                <button 
                  onClick={() => setShowDraft(false)}
                  className="px-8 py-2 text-[#8b2323] border border-[#8b2323] hover:bg-[#8b2323]/10 font-bold tracking-widest"
                >
                  驳回重拟
                </button>
                <button 
                  onClick={handleExecuteDraft}
                  disabled={loading}
                  className="relative w-48 h-14 flex items-center justify-center text-xl font-bold tracking-widest text-[#f4ebd0] hover:scale-105 active:scale-95 transition-all group disabled:opacity-50 disabled:hover:scale-100"
                >
                  <img src={GAME_ASSETS.ui.ming_assets.btnNormal} className="absolute inset-0 w-full h-full object-contain group-hover:hidden" alt="" />
                  <img src={GAME_ASSETS.ui.ming_assets.btnHover} className="absolute inset-0 w-full h-full object-contain hidden group-hover:block" alt="" />
                  <span className="relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{loading ? '用印中...' : '准奏执行'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Turn Result Modal */}
      {simResult && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center pointer-events-auto z-[500] font-serif">
          <div className="relative w-[1000px] h-[750px] flex items-center justify-center">
            <div 
              className="absolute inset-0 pointer-events-none z-50 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
              style={{ backgroundImage: `url(${GAME_ASSETS.ui.ming_assets.frame})`, backgroundSize: '100% 100%' }}
            />
            <div 
              className="absolute inset-[6%] flex flex-col p-8 z-10 overflow-y-auto"
              style={{ backgroundImage: `url(${GAME_ASSETS.ui.ming_assets.parchment})`, backgroundSize: 'cover' }}
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

              <div className="mt-6 flex justify-end relative z-50">
                <button 
                  onClick={() => setSimResult(null)}
                  className="relative w-48 h-14 flex items-center justify-center text-xl font-bold tracking-widest text-[#f4ebd0] hover:scale-105 active:scale-95 transition-all group"
                >
                  <img src={GAME_ASSETS.ui.ming_assets.btnNormal} className="absolute inset-0 w-full h-full object-contain group-hover:hidden" alt="" />
                  <img src={GAME_ASSETS.ui.ming_assets.btnHover} className="absolute inset-0 w-full h-full object-contain hidden group-hover:block" alt="" />
                  <span className="relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">继续主政</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
