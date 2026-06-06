"use client";

import React, { useEffect, useState } from "react";
import { getGameState, GameState, Minister, chatWithMinister, ChatMessage, getReserveMinisters, appointMinister, dismissMinister, AppointRequest, DismissRequest, AcceptCandidateRequest } from "@/lib/gameApi";
import { showToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { X, Send, User, MessageSquare, UserMinus, UserPlus, Users } from "lucide-react";

const IMAGE_MAP: Record<string, string> = {
  "朱由检": "/images/characters/朱由检.png",
  "魏忠贤": "/images/characters/魏忠贤.png",
  "袁崇焕": "/images/characters/袁崇焕.png",
  "孙承宗": "/images/characters/孙承宗.png",
  "温体仁": "/images/characters/温体仁.png",
  "钱谦益": "/images/characters/钱谦益.png",
  "毕自严": "/images/characters/毕自严.png",
  "卢象升": "/images/characters/卢象升.png",
  "洪承畴": "/images/characters/洪承畴.png",
  "王承恩": "/images/characters/王承恩.png",
  "徐光启": "/images/characters/徐光启.png",
  "李标": "/images/characters/李标.png",
};

const FACTION_MAP: Record<string, string> = {
  "jiangnan": "江南清流集团",
  "beifang": "北方官僚",
  "frontier_army": "边军集团",
  "eunuch": "阉党"
};

const POLICY_MAP: Record<string, string> = {
  "anti_eunuch": "清扫阉党",
  "tax_increase": "增加赋税",
  "military_spending": "边军军费",
  "relief": "赈灾安民",
  "purge": "兴建大狱",
  "centralization": "中央集权"
};

export default function CourtOrgPage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [ministers, setMinisters] = useState<Minister[]>([]);
  const [selectedMinister, setSelectedMinister] = useState<Minister | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  
  const [reserveTab, setReserveTab] = useState("全部");
  
  const [showAppointment, setShowAppointment] = useState(false);
  const [appointmentTarget, setAppointmentTarget] = useState<string>("");
  const [appointmentDepartment, setAppointmentDepartment] = useState<string>("");
  const [reserveMinisters, setReserveMinisters] = useState<any[]>([]);

  // Candidate States
  const [showCandidates, setShowCandidates] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [isRecruiting, setIsRecruiting] = useState(false);
  const [confirmDismissId, setConfirmDismissId] = useState<string | null>(null);
  const [worldState, setWorldState] = useState<any>({});

  const fetchState = () => {
    getGameState().then(data => {
      setWorldState(data.world_state || {});
      
      const allMinisters = data.available_ministers || [];
      setMinisters(allMinisters);
      
      // Check for candidates
      const pendingCandidates = allMinisters.filter((m: any) => m.status === "candidate");
      if (pendingCandidates.length > 0) {
        setCandidates(pendingCandidates);
      }
    }).catch(console.error);
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleEmptySlotClick = async (slotName: string, department: string) => {
    setAppointmentTarget(slotName);
    setAppointmentDepartment(department);
    const reserves = await getReserveMinisters();
    
    let filteredReserves = reserves;
    if (department === "司礼监" || department === "东厂") {
      filteredReserves = reserves.filter((m: any) => m.faction === "eunuch");
    } else if (department === "锦衣卫") {
      filteredReserves = reserves.filter((m: any) => m.faction === "changwei" || m.faction === "eunuch");
    } else if (["督师", "总督", "巡抚", "总兵"].includes(department)) {
      filteredReserves = reserves.filter((m: any) => m.faction !== "eunuch" && m.faction !== "changwei");
    } else {
      // Civil roles
      filteredReserves = reserves.filter((m: any) => m.faction !== "eunuch" && m.faction !== "changwei" && m.faction !== "frontier_army");
    }
    
    setReserveMinisters(filteredReserves);
    setShowAppointment(true);
  };

  const handleDismiss = async (ministerId: string) => {
    setConfirmDismissId(ministerId);
  };

  const executeDismiss = async () => {
    if (confirmDismissId) {
      await dismissMinister(confirmDismissId);
      setSelectedMinister(null);
      setConfirmDismissId(null);
      fetchState(); // Refresh
    }
  };

  const handleAppoint = async (ministerId: string) => {
    await appointMinister(ministerId, appointmentTarget, appointmentDepartment);
    setShowAppointment(false);
    fetchState(); // Refresh
  };

  // Map ministers to departments
  const departmentMap: Record<string, Minister[]> = {
    "内阁": [],
    "吏部": [],
    "户部": [],
    "礼部": [],
    "兵部": [],
    "刑部": [],
    "工部": [],
    // 言官
    "都察院左右都御史": [],
    "通政司使": [],
    "六科给事中": [],
    "十三道监察御史": [],
    // 武官
    "督师": [],
    "总督": [],
    "巡抚": [],
    "总兵": [],
    // 皇权延伸
    "司礼监": [],
    "锦衣卫": [],
    "东厂": []
  };

  ministers.forEach(m => {
    if (m.status !== "active") return;
    let targetDept = m.department;
    if (!targetDept) {
      if (m.name === "魏忠贤") targetDept = "司礼监,东厂";
      else if (m.name === "王承恩") targetDept = "司礼监";
      else if (m.name === "李标" || m.name === "温体仁" || m.name === "钱谦益") targetDept = "内阁";
      else if (m.name === "毕自严") targetDept = "户部";
      else if (m.name === "徐光启") targetDept = "礼部";
      else if (m.name === "孙承宗") targetDept = "督师";
      else if (m.name === "洪承畴") targetDept = "总督";
      else if (m.name === "袁崇焕") targetDept = "巡抚";
      else if (m.name === "卢象升") targetDept = "总兵";
    }
    
    if (targetDept) {
      const depts = targetDept.split(",");
      depts.forEach((dept: string) => {
        const d = dept.trim();
        if (departmentMap[d]) {
          departmentMap[d].push(m);
        }
      });
    }
  });

  const handleCharacterClick = (character: any) => {
    if (character.minister_id || character.name !== "朱由检") {
      // Find full minister if possible
      const fullMinister = ministers.find(m => m.name === character.name);
      if (fullMinister) {
        setSelectedMinister(fullMinister);
      }
    }
  };

  const renderCharacter = (character: any) => {
    const { name, role, faction } = character;
    const imgSrc = IMAGE_MAP[name] || "/images/characters/default.png";
    return (
      <div 
        key={name} 
        onClick={() => handleCharacterClick(character)}
        className="flex flex-col items-center gap-2 p-2 border border-[#c09a53]/30 bg-[#1a110b]/80 rounded-md shadow-lg transition-transform hover:scale-105 hover:border-[#c09a53] group cursor-pointer"
      >
        <div className="w-20 h-24 relative overflow-hidden rounded-sm border border-[#c09a53]/50 bg-[#2a1d13]">
          {IMAGE_MAP[name] ? (
            <img src={imgSrc} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#c09a53]/30">
              <span className="text-3xl">👤</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
          <div className="absolute bottom-1 w-full text-center text-[#e4cfa1] font-bold text-sm drop-shadow-md">
            {name}
          </div>
        </div>
        {role && <div className="text-[10px] text-[#a38a6a] max-w-[80px] text-center leading-tight">{role}</div>}
      </div>
    );
  };

  const renderDepartment = (title: string, characters: {name: string, role?: string, faction?: string}[], className?: string, slotTitles: string[] = ["官员"]) => {
    const emptySlotsCount = Math.max(0, slotTitles.length - characters.length);
    const emptySlotNames = slotTitles.slice(characters.length);

    return (
      <div className={cn("flex flex-col items-center bg-[#1a110b]/60 border border-[#c09a53]/20 p-4 rounded-sm relative", className)}>
        <div className="absolute -top-3 bg-[#1a110b] px-3 border border-[#c09a53]/40 text-[#c09a53] font-bold text-sm rounded-full whitespace-nowrap z-20">
          {title}
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-2 min-h-[120px] w-full pt-4">
          {characters.map(c => renderCharacter(c))}
          {emptySlotNames.map((slotName, i) => (
            <div 
              key={`empty-${title}-${i}`}
              onClick={() => handleEmptySlotClick(slotName, title)}
              className="w-20 h-24 border border-dashed border-[#c09a53]/40 bg-[#1a110b] rounded-sm flex flex-col items-center justify-center z-10 relative shadow-inner cursor-pointer hover:border-[#c09a53] transition-colors group shrink-0"
            >
               <span className="text-3xl opacity-30 group-hover:opacity-60 transition-opacity">👤</span>
               <div className="text-[10px] text-[#c09a53]/60 mt-1 max-w-[70px] text-center leading-tight">{slotName}</div>
               <div className="absolute -bottom-6 opacity-0 group-hover:opacity-100 text-xs text-[#c09a53] whitespace-nowrap transition-opacity z-20 bg-black/80 px-2 py-1 rounded border border-[#c09a53]/50">简拔</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0705] p-8 font-serif overflow-y-auto custom-scrollbar relative">
      {/* Background Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjxwYXRoIGQ9Ik0wIDBMNCA0Wk00IDBMMCA0WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] mix-blend-screen" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[#e4cfa1] tracking-widest drop-shadow-[0_0_10px_rgba(228,207,161,0.3)]">大明朝堂百官图</h1>
          
          <div className="mt-6 flex justify-center gap-4">
            <button 
              onClick={async () => {
                const reserves = await getReserveMinisters();
                setAppointmentTarget("天下英才");
                setAppointmentDepartment("");
                setReserveMinisters(reserves);
                setShowAppointment(true);
              }}
              className="px-6 py-2 bg-[#1a110b] border border-[#c09a53]/50 text-[#c09a53] hover:text-[#e4cfa1] hover:border-[#c09a53] hover:bg-[#2a1d13] rounded-sm transition-all text-sm tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(192,154,83,0.15)] group"
            >
              <Users size={16} className="group-hover:scale-110 transition-transform" />
              查看候补与在野名册
            </button>
            <button 
              onClick={async () => {
                setIsRecruiting(true);
                try {
                  const { recruitMinisters } = await import('@/lib/gameApi');
                  const res = await recruitMinisters(100000); // 10万两白银
                  if (res.status === "success" && res.candidates) {
                    setCandidates(res.candidates);
                    setSelectedCandidateIds([]);
                    setShowCandidates(true);
                  } else {
                    showToast(res.message || "求贤失败！", "error");
                  }
                } catch (e) {
                  showToast("求贤失败！", "error");
                }
                setIsRecruiting(false);
              }}
              disabled={isRecruiting}
              className="px-6 py-2 bg-[#8b2323]/20 border border-[#8b2323] text-[#e4cfa1] hover:bg-[#8b2323] rounded-sm transition-all text-sm tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(139,35,35,0.2)] group"
            >
              <UserPlus size={16} className="group-hover:scale-110 transition-transform" />
              {isRecruiting ? "下诏中..." : "下诏求贤 (花费十万两)"}
            </button>
          </div>
          
          <div className="h-px w-64 bg-gradient-to-r from-transparent via-[#c09a53] to-transparent mx-auto mt-6" />
        </div>

        <div className="flex flex-col items-center gap-10 relative pb-20 mt-8">
          
          {/* Level 1: Emperor */}
          <div className="relative z-10 w-full flex justify-center border-b border-[#c09a53]/30 pb-10">
            {renderDepartment("大明皇帝", [{ name: "朱由检", role: "天下共主" }], "w-[300px] bg-[#c09a53]/20 border-2 border-[#c09a53]/80 shadow-[0_0_50px_rgba(192,154,83,0.3)]", ["皇帝"])}
          </div>

          <div className="flex w-full gap-6 relative z-10 max-w-[1400px] mx-auto px-4 mt-4 items-start">
            
            {/* Left Column: Civil (文官体系) */}
            <div className="flex-[4] flex flex-col items-center gap-6">
              <h2 className="text-2xl font-bold text-[#e4cfa1] mb-2 drop-shadow-md">【文官与中枢】</h2>
              
              {/* Cabinet */}
              {renderDepartment("内阁", departmentMap["内阁"], "w-full max-w-[500px] bg-[#1a110b]/80 border-[#c09a53]/60", ["首辅", "次辅", "群辅", "群辅", "群辅"])}

              {/* Six Ministries */}
              <div className="grid grid-cols-2 gap-4 w-full mt-4">
                {renderDepartment("吏部", departmentMap["吏部"], "", ["吏部尚书"])}
                {renderDepartment("户部", departmentMap["户部"], "", ["户部尚书"])}
                {renderDepartment("礼部", departmentMap["礼部"], "", ["礼部尚书"])}
                {renderDepartment("兵部", departmentMap["兵部"], "", ["兵部尚书"])}
                {renderDepartment("刑部", departmentMap["刑部"], "", ["刑部尚书"])}
                {renderDepartment("工部", departmentMap["工部"], "", ["工部尚书"])}
              </div>

              {/* Supervision / Ke Dao */}
              <div className="w-full mt-6 border-t-2 border-dashed border-[#c09a53]/30 pt-6">
                <h3 className="text-xl font-bold text-[#c09a53] text-center mb-6 tracking-widest">科道言官系统</h3>
                <div className="grid grid-cols-2 gap-4 w-full mb-4">
                  {renderDepartment("都察院左右都御史", departmentMap["都察院左右都御史"], "", ["左都御史", "右都御史"])}
                  {renderDepartment("通政司使", departmentMap["通政司使"], "", ["通政使"])}
                </div>
                <div className="flex flex-col gap-4 w-full">
                  {renderDepartment("六科给事中", departmentMap["六科给事中"], "w-full", ["吏科", "户科", "礼科", "兵科", "刑科", "工科"])}
                  {renderDepartment("十三道监察御史", departmentMap["十三道监察御史"], "w-full", ["浙江道", "江西道", "福建道", "四川道", "陕西道", "云南道", "河南道", "广西道", "广东道", "山西道", "山东道", "湖广道", "贵州道"])}
                </div>
              </div>
            </div>

            {/* Middle Column: Inner Court (内廷与特务) */}
            <div className="flex-[2] flex flex-col items-center gap-8 border-l border-r border-[#c09a53]/20 px-6 min-w-[280px]">
              <h2 className="text-2xl font-bold text-[#8b2323] mb-2 drop-shadow-md">【内廷与厂卫】</h2>
              
              {renderDepartment("司礼监", departmentMap["司礼监"], "w-full bg-[#8b2323]/10 border-[#8b2323]/50 shadow-[0_0_20px_rgba(139,35,35,0.1)]", ["掌印太监", "秉笔太监", "秉笔太监"])}
              {renderDepartment("锦衣卫", departmentMap["锦衣卫"], "w-full bg-[#1a110b]/80 border-[#8b2323]/30", ["指挥使"])}
              {renderDepartment("东厂", departmentMap["东厂"], "w-full bg-[#1a110b]/80 border-[#8b2323]/30", ["厂督"])}
            </div>

            {/* Right Column: Military (武官体系) */}
            <div className="flex-[3] flex flex-col items-center gap-0 relative">
              <h2 className="text-2xl font-bold text-[#e4cfa1] mb-10 drop-shadow-md">【武官与边防】</h2>
              
              {/* Connecting line for military branch */}
              <div className="absolute top-[80px] bottom-[50px] left-1/2 w-1 bg-[#c09a53]/30 -translate-x-1/2 -z-10" />

              <div className="flex flex-col items-center gap-12 w-full">
                <div className="relative w-full flex justify-center">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0a0705] px-3 border border-[#c09a53]/30 rounded-full text-[#c09a53] text-xs z-20">统率全局</div>
                  {renderDepartment("督师", departmentMap["督师"], "w-full max-w-[320px] border-2 border-[#c09a53]/80 bg-[#1a110b] z-10 shadow-[0_0_20px_rgba(192,154,83,0.1)]")}
                </div>
                
                <div className="relative w-full flex justify-center">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0a0705] px-3 border border-[#c09a53]/30 rounded-full text-[#c09a53] text-xs z-20">军政长官</div>
                  {renderDepartment("总督", departmentMap["总督"], "w-full max-w-[320px] bg-[#1a110b] z-10 border-[#c09a53]/50")}
                </div>
                
                <div className="relative w-full flex justify-center">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0a0705] px-3 border border-[#c09a53]/30 rounded-full text-[#c09a53] text-xs z-20">地方安抚</div>
                  {renderDepartment("巡抚", departmentMap["巡抚"], "w-full max-w-[320px] bg-[#1a110b] z-10 border-[#c09a53]/50")}
                </div>
                
                <div className="relative w-full flex justify-center">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0a0705] px-3 border border-[#c09a53]/30 rounded-full text-[#c09a53] text-xs z-20">一线统兵</div>
                  {renderDepartment("总兵", departmentMap["总兵"], "w-full max-w-[320px] border-2 border-[#8b2323]/50 bg-[#1a110b] z-10")}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Minister Detail Modal */}
      {selectedMinister && !isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#1a110b] border-2 border-[#c09a53] rounded-md max-w-lg w-full p-6 shadow-[0_0_50px_rgba(192,154,83,0.3)] relative">
            <button onClick={() => setSelectedMinister(null)} className="absolute top-4 right-4 text-[#c09a53] hover:text-[#e4cfa1]">
              <X size={24} />
            </button>
            <div className="flex gap-6 mb-6">
              <div className="w-32 h-40 border-2 border-[#c09a53]/60 rounded-sm overflow-hidden flex-shrink-0 bg-[#2a1d13]">
                {IMAGE_MAP[selectedMinister.name] ? (
                  <img src={IMAGE_MAP[selectedMinister.name]} alt={selectedMinister.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#c09a53]/30"><span className="text-5xl">👤</span></div>
                )}
              </div>
              <div className="flex-1 text-[#e4cfa1]">
                <h2 className="text-3xl font-bold mb-1 tracking-wider">{selectedMinister.name}</h2>
                <div className="text-[#c09a53] mb-4">
                  {selectedMinister.role} · {FACTION_MAP[selectedMinister.faction] || selectedMinister.faction} 
                  {selectedMinister.hometown && ` · 籍贯：${selectedMinister.hometown}`}
                </div>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                  <div>忠诚: <span className="font-bold text-blue-400">{selectedMinister.loyalty_to_emperor}</span></div>
                  <div>能力: <span className="font-bold text-green-400">{selectedMinister.competence}</span></div>
                  <div>贪腐: <span className="font-bold text-red-400">{selectedMinister.corruption}</span></div>
                  <div>权势: <span className="font-bold text-yellow-500">{selectedMinister.personal_power}</span></div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#c09a53]/30 text-sm leading-relaxed text-[#d4b392]">
                  <span className="text-[#c09a53] font-bold mb-1 block">【生平列传】</span>
                  <div className="indent-4 text-justify">
                    {selectedMinister.biography || "此人生平事迹尚不为人所知。"}
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-[#2a1d13]/50 border border-[#c09a53]/20 text-[#c09a53] text-xs leading-relaxed italic shadow-inner">
                  【厂卫密报】：此臣行事【{selectedMinister.personality?.join("、") || "深沉不露"}】。若能委以重任，其必将以【{
                    Object.entries(selectedMinister.policy_bias || {})
                      .filter(([_, v]: [string, any]) => v > 0)
                      .map(([k, _]: [string, any]) => POLICY_MAP[k] || k)
                      .join("、") || "统筹大局"
                  }】为施政纲领。但需防其【{selectedMinister.corruption > 50 ? "贪墨成性" : (selectedMinister.loyalty_to_emperor < 50 ? "心怀二意" : "刚愎自用")}】。
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-[#c09a53] border-b border-[#c09a53]/30 pb-1 mb-2 font-bold">性格标签</h3>
              <div className="flex flex-wrap gap-2">
                {selectedMinister.personality?.map(p => (
                  <span key={p} className="px-2 py-1 bg-[#c09a53]/20 border border-[#c09a53]/40 rounded-sm text-xs text-[#e4cfa1]">{p}</span>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-[#c09a53] border-b border-[#c09a53]/30 pb-1 mb-2 font-bold">政策倾向</h3>
              <div className="grid grid-cols-3 gap-2 text-xs text-[#d4b392]">
                {Object.entries(selectedMinister.policy_bias || {}).map(([k, v]) => (
                  <div key={k}>{POLICY_MAP[k] || k}: <span className={v > 0 ? 'text-green-400' : 'text-red-400'}>{v > 0 ? '+' : ''}{v}</span></div>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-6 mt-6">
              <button 
                onClick={() => setIsChatOpen(true)}
                className="bg-[#c09a53]/20 hover:bg-[#c09a53]/40 border border-[#c09a53] text-[#e4cfa1] px-8 py-3 rounded-sm font-bold tracking-widest text-lg transition-all shadow-[0_0_15px_rgba(192,154,83,0.2)] flex items-center gap-2"
              >
                <MessageSquare size={20} />
                御前召见
              </button>

              <button
                onClick={() => handleDismiss(selectedMinister.minister_id)}
                className="bg-[#8b2323]/10 hover:bg-[#8b2323]/30 border border-[#8b2323]/50 text-[#c09a53] hover:text-[#e4cfa1] px-6 py-3 rounded-sm font-bold tracking-widest text-lg transition-all flex items-center gap-2"
                title="打入候补"
              >
                <UserMinus size={20} />
                罢免
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minister Chat Modal */}
      {selectedMinister && isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a110b] border border-[#c09a53] rounded-md max-w-2xl w-full h-[80vh] flex flex-col shadow-[0_0_50px_rgba(192,154,83,0.3)] relative overflow-hidden">
            <div className="bg-[#c09a53]/10 border-b border-[#c09a53]/40 p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3 text-[#e4cfa1]">
                <div className="w-10 h-10 rounded-full border border-[#c09a53] overflow-hidden bg-[#2a1d13]">
                  {IMAGE_MAP[selectedMinister.name] ? (
                    <img src={IMAGE_MAP[selectedMinister.name]} alt={selectedMinister.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#c09a53]/30">👤</div>
                  )}
                </div>
                <div>
                  <div className="font-bold text-lg">{selectedMinister.name}</div>
                  <div className="text-xs text-[#c09a53]">{selectedMinister.role}</div>
                </div>
              </div>
              <button 
                onClick={() => { setIsChatOpen(false); setChatHistory([]); }} 
                className="text-[#c09a53] hover:text-[#e4cfa1]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
              {chatHistory.length === 0 ? (
                <div className="text-center text-[#a38a6a] italic mt-10">
                  {selectedMinister.name} 奉旨觐见。陛下有何吩咐？
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[80%] p-3 rounded-md", 
                      msg.role === 'user' 
                        ? "bg-[#c09a53]/20 border border-[#c09a53]/40 text-[#e4cfa1]" 
                        : "bg-[#2a1d13] border border-[#a38a6a]/30 text-[#d4b392]"
                    )}>
                      {msg.role === 'assistant' && <div className="text-xs text-[#c09a53] mb-1 font-bold">{selectedMinister.name}</div>}
                      {msg.role === 'user' && <div className="text-xs text-[#c09a53] mb-1 font-bold text-right">朕</div>}
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))
              )}
              {isChatting && (
                <div className="flex justify-start w-full">
                  <div className="max-w-[80%] p-3 rounded-md bg-[#2a1d13] border border-[#a38a6a]/30 text-[#d4b392] italic">
                    臣正在思虑...
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#c09a53]/40 bg-[#1a110b] shrink-0">
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!chatInput.trim() || isChatting) return;
                  const newHistory = [...chatHistory, { role: 'user' as const, content: chatInput }];
                  setChatHistory(newHistory);
                  setChatInput("");
                  setIsChatting(true);
                  try {
                    const reply = await chatWithMinister(selectedMinister.minister_id, chatInput, chatHistory);
                    setChatHistory([...newHistory, { role: 'assistant', content: reply }]);
                  } catch (err) {
                    setChatHistory([...newHistory, { role: 'assistant', content: "臣连日风寒，未能深思，请陛下恕罪。" }]);
                  } finally {
                    setIsChatting(false);
                  }
                }}
                className="flex gap-2"
              >
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="陛下请降旨..."
                  className="flex-1 bg-[#2a1d13] border border-[#c09a53]/40 rounded-sm px-4 py-2 text-[#e4cfa1] focus:outline-none focus:border-[#c09a53]"
                  disabled={isChatting}
                />
                <button 
                  type="submit" 
                  disabled={isChatting}
                  className="bg-[#c09a53]/20 hover:bg-[#c09a53]/40 border border-[#c09a53] text-[#e4cfa1] px-4 py-2 rounded-sm transition-colors flex items-center gap-2"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {showAppointment && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500] p-4">
          <div className="bg-[#1a110b] border-2 border-[#c09a53]/50 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-[0_0_50px_rgba(192,154,83,0.3)] rounded-sm">
            <div className="p-4 border-b border-[#c09a53]/30 flex justify-between items-center bg-[#2a1d13]/50">
              <h2 className="text-xl font-bold text-[#e4cfa1] tracking-widest">吏部呈递：【{appointmentTarget}】候补名册</h2>
              <button onClick={() => setShowAppointment(false)} className="text-[#c09a53] hover:text-[#e4cfa1] transition-colors">
                <X size={24} />
              </button>
            </div>

            {appointmentTarget === "天下英才" && (
              <div className="flex bg-[#1a110b] border-b border-[#c09a53]/30 shrink-0">
                {["全部", "江南清流", "北方官僚", "武将", "阉党"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setReserveTab(tab)}
                    className={cn(
                      "flex-1 py-3 text-sm font-bold tracking-widest transition-colors",
                      reserveTab === tab 
                        ? "bg-[#2a1d13] text-[#e4cfa1] border-b-2 border-[#c09a53]" 
                        : "text-[#c09a53]/60 hover:text-[#c09a53] hover:bg-[#2a1d13]/50"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
              {(() => {
                const filtered = appointmentTarget === "天下英才" 
                  ? reserveMinisters.filter((m: any) => {
                      if (reserveTab === "全部") return true;
                      if (reserveTab === "江南清流") return m.faction === "jiangnan";
                      if (reserveTab === "北方官僚") return m.faction === "beifang";
                      if (reserveTab === "武将") return m.faction === "frontier_army";
                      if (reserveTab === "阉党") return m.faction === "eunuch";
                      return true;
                    })
                  : reserveMinisters;
                
                if (filtered.length === 0) {
                  return <div className="text-center text-[#a38a6a] py-8">暂无合适候补官员。</div>;
                }
                
                return filtered.map((m: any) => (
                  <div key={m.minister_id} className="border border-[#c09a53]/30 p-3 rounded-md bg-[#1a110b] flex flex-col gap-3 hover:border-[#c09a53] transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-20 bg-[#2a1d13] border border-[#c09a53]/50 relative overflow-hidden flex-shrink-0">
                          {IMAGE_MAP[m.name] ? (
                            <img src={IMAGE_MAP[m.name]} alt={m.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#c09a53]/30"><span className="text-3xl">👤</span></div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-[#e4cfa1] text-lg mb-1 flex items-center gap-2">
                            {m.name}
                            <span className="text-[#a38a6a] text-xs font-normal bg-[#2a1d13] px-2 py-0.5 rounded border border-[#c09a53]/30">
                              {m.status === "candidate" 
                                ? "科举新贵" 
                                : (m.role !== "在野" 
                                    ? m.role 
                                    : (!FACTION_MAP[m.faction] ? m.faction : "候补"))}
                            </span>
                          </div>
                          <div className="text-xs text-[#c09a53] mb-2">
                            {FACTION_MAP[m.faction] ? FACTION_MAP[m.faction] : ""} 
                            {FACTION_MAP[m.faction] && m.hometown ? " · " : ""}
                            {m.hometown ? `籍贯: ${m.hometown}` : ""}
                          </div>
                          <div className="text-xs grid grid-cols-2 gap-x-4 gap-y-1 bg-[#0a0705] p-2 rounded border border-[#c09a53]/20">
                            <span>能力: <span className="text-green-400">{m.competence}</span></span>
                            <span>清廉: <span className="text-blue-400">{100 - m.corruption}</span></span>
                            <span>忠诚: <span className="text-red-400">{m.loyalty_to_emperor}</span></span>
                            <span className="col-span-2 text-[10px] text-[#a38a6a] mt-1 truncate">
                              性格: {m.personality?.join(" / ")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAppoint(m.minister_id)}
                        className="px-6 py-2 bg-[#8b2323] hover:bg-[#a52a2a] text-[#e4cfa1] rounded-sm font-bold border border-[#c09a53]/50 shadow-[0_0_10px_rgba(139,35,35,0.4)] transition-all hover:scale-105"
                      >
                        简拔
                      </button>
                    </div>
                    
                    {/* Biography section inside appointment card */}
                    <div className="text-xs text-[#d4b392] bg-[#2a1d13]/40 p-3 rounded-sm border-t border-[#c09a53]/20 leading-relaxed italic text-justify">
                      <span className="text-[#c09a53] font-bold not-italic block mb-1">【生平】：</span>
                      <div className="indent-4">{m.biography || "生平不详。"}</div>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Candidates (Palace Exam) Modal */}
      {showCandidates && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500] p-4">
          <div className="bg-[#1a110b] border-2 border-[#8b2323]/50 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-[0_0_50px_rgba(139,35,35,0.3)] rounded-sm">
            <div className="p-4 border-b border-[#c09a53]/30 flex justify-between items-center bg-[#2a1d13]/50">
              <h2 className="text-xl font-bold text-[#e4cfa1] tracking-widest flex items-center gap-2">
                <span className="text-[#8b2323]">◈</span> 特诏求贤 · 擢拔奇才 <span className="text-[#8b2323]">◈</span>
              </h2>
              <button onClick={() => setShowCandidates(false)} className="text-[#c09a53] hover:text-[#e4cfa1] transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
              <p className="text-[#d4b392] italic text-sm text-center mb-2">
                勾选陛下中意的俊才，将其录入天下英才名册备用。未被选中的人将黯然还乡。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((m: any) => {
                  const isSelected = selectedCandidateIds.includes(m.minister_id);
                  return (
                    <div 
                      key={m.minister_id} 
                      onClick={() => {
                        setSelectedCandidateIds(prev => 
                          prev.includes(m.minister_id) 
                            ? prev.filter(id => id !== m.minister_id)
                            : [...prev, m.minister_id]
                        );
                      }}
                      className={cn(
                        "border p-4 rounded-md flex flex-col gap-3 transition-all cursor-pointer",
                        isSelected ? "border-[#c09a53] bg-[#c09a53]/10 shadow-[0_0_15px_rgba(192,154,83,0.2)]" : "border-[#c09a53]/30 bg-[#1a110b] hover:border-[#c09a53]/60"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                          <div className="w-16 h-20 bg-[#2a1d13] border border-[#c09a53]/50 relative overflow-hidden flex-shrink-0">
                            <div className="w-full h-full flex items-center justify-center text-[#c09a53]/30"><span className="text-3xl">👤</span></div>
                          </div>
                          <div>
                            <div className="font-bold text-[#e4cfa1] text-lg mb-1 flex items-center gap-2">
                              {m.name}
                              {isSelected && <span className="text-[#c09a53] text-xs font-bold border border-[#c09a53] px-1 rounded">✓ 赐进士及第</span>}
                              <span className="text-[#a38a6a] text-xs font-normal bg-[#2a1d13] px-2 py-0.5 rounded border border-[#c09a53]/30">
                                {m.status === "candidate" 
                                  ? "科举新贵" 
                                  : (m.role !== "在野" 
                                      ? m.role 
                                      : (!FACTION_MAP[m.faction] ? m.faction : "候补"))}
                              </span>
                            </div>
                            <div className="text-xs text-[#c09a53] mb-2">
                              {FACTION_MAP[m.faction] ? FACTION_MAP[m.faction] : ""} 
                              {FACTION_MAP[m.faction] && m.hometown ? " · " : ""}
                              {m.hometown ? `籍贯: ${m.hometown}` : ""}
                            </div>
                            <div className="text-xs grid grid-cols-2 gap-x-4 gap-y-1 bg-[#0a0705] p-2 rounded border border-[#c09a53]/20">
                              <span>能力: <span className="text-green-400">{m.competence}</span></span>
                              <span>清廉: <span className="text-blue-400">{100 - m.corruption}</span></span>
                              <span>忠诚: <span className="text-red-400">{m.loyalty_to_emperor}</span></span>
                              <span className="col-span-2 text-[10px] text-[#a38a6a] mt-1 truncate">
                                性格: {m.personality?.join(" / ")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-[#d4b392] bg-[#2a1d13]/40 p-3 rounded-sm border-t border-[#c09a53]/20 leading-relaxed italic text-justify">
                        <span className="text-[#c09a53] font-bold not-italic block mb-1">【生平】：</span>
                        <div className="indent-4">{m.biography || "生平不详。"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 border-t border-[#c09a53]/30 flex justify-end gap-4 bg-[#2a1d13]/50 shrink-0">
              <button 
                onClick={() => setShowCandidates(false)}
                className="px-6 py-2 border border-[#c09a53]/40 text-[#a38a6a] hover:bg-[#c09a53]/10 hover:text-[#e4cfa1] transition-colors"
              >
                退朝再议
              </button>
              <button 
                onClick={async () => {
                  try {
                    const { acceptCandidates } = await import('@/lib/gameApi');
                    const success = await acceptCandidates(selectedCandidateIds);
                    if (success) {
                      setShowCandidates(false);
                      fetchState(); // refresh to ensure global state matches
                    }
                  } catch(e) {}
                }}
                disabled={selectedCandidateIds.length === 0}
                className="px-8 py-2 bg-[#8b2323] hover:bg-[#a52a2a] text-[#e4cfa1] rounded-sm font-bold border border-[#c09a53]/50 shadow-[0_0_10px_rgba(139,35,35,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                朱批钦定 ({selectedCandidateIds.length}人)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dismiss Confirmation Dialog */}
      {confirmDismissId && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a110b] border-2 border-[#8b2323]/60 rounded-sm max-w-md w-full p-6 shadow-[0_0_30px_rgba(139,35,35,0.4)] relative">
            <h3 className="text-2xl font-bold text-[#e4cfa1] mb-4 text-center border-b border-[#8b2323]/30 pb-3 flex items-center justify-center gap-2">
              <span className="text-[#8b2323]">◈</span> 御批褫职 <span className="text-[#8b2323]">◈</span>
            </h3>
            <p className="text-[#d4b392] text-center text-lg mb-8 leading-relaxed">
              陛下，是否确认褫夺此人官职，打入候补名册？<br/>
              <span className="text-[#8b2323] text-sm mt-2 block">此举恐引起其所在派系之不满。</span>
            </p>
            <div className="flex justify-center gap-6">
              <button
                onClick={() => setConfirmDismissId(null)}
                className="px-6 py-2 border border-[#c09a53]/40 text-[#a38a6a] hover:bg-[#c09a53]/10 hover:text-[#e4cfa1] transition-colors"
              >
                且慢
              </button>
              <button
                onClick={executeDismiss}
                className="px-8 py-2 bg-[#8b2323]/20 border border-[#8b2323] text-[#e4cfa1] hover:bg-[#8b2323]/50 transition-colors font-bold tracking-widest shadow-inner"
              >
                钦此
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
