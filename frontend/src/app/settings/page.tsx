"use client"

import { useState, useEffect } from "react"
import { useI18n } from "@/lib/i18n"
import { ScrollText, Save, Download } from "lucide-react"
import { showToast } from "@/components/ui/Toast"
import { getSaves, saveGame, loadGame } from '@/lib/gameApi'

export default function SettingsPage() {
  const { language, setLanguage, t } = useI18n()
  const [savesList, setSavesList] = useState<string[]>([])
  const [saveNameInput, setSaveNameInput] = useState("")

  useEffect(() => {
    getSaves().then(setSavesList).catch(console.error)
  }, [])

  return (
    <div className="flex-1 overflow-auto p-8 relative">
      <div className="absolute inset-0 bg-[#0a0705] -z-10" />
      <div className="absolute inset-0 bg-[url('/images/bg_texture.jpg')] opacity-10 mix-blend-overlay -z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a110b]/80 to-[#0a0705]/95 -z-10" />
      
      <div className="max-w-4xl mx-auto space-y-8 font-serif">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-[#e4cfa1]">{t("系统设定")}</h1>
          <p className="text-[#a38a6a] mt-2 tracking-wider">
            管理界面偏好与宗庙秘档
          </p>
        </div>

        <div className="space-y-6">
          <div className="border border-[#c09a53]/40 rounded-sm bg-[#1a110b]/80 p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
            <h2 className="text-xl font-bold tracking-widest mb-4 text-[#e4cfa1]">{t("Language")}</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#d4c4a8]">{t("Language")}</p>
                <p className="text-sm text-[#a38a6a]">
                  {t("Select your preferred language for the interface.")}
                </p>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "zh")}
                className="flex h-10 w-[180px] items-center justify-between rounded-sm border border-[#c09a53]/50 bg-[#2a1d15] px-3 py-2 text-sm text-[#e4cfa1] outline-none focus:border-[#c09a53] transition-colors"
              >
                <option value="en">English</option>
                <option value="zh">中文 (Chinese)</option>
              </select>
            </div>
          </div>

          <div className="border border-[#c09a53]/40 rounded-sm bg-[#1a110b]/80 p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
            <h2 className="text-xl font-bold tracking-widest mb-6 text-[#e4cfa1] flex items-center gap-3">
              <ScrollText /> 御览玉牒 (存档管理)
            </h2>

            <div className="mb-8 border border-[#c09a53]/30 p-4 bg-[#2a1d13]/50">
              <h3 className="text-[#c09a53] font-bold mb-3 tracking-widest flex items-center gap-2">
                <Save size={18} /> 封存宗庙 (新建存档)
              </h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={saveNameInput}
                  onChange={e => setSaveNameInput(e.target.value)}
                  placeholder="如: 崇祯元年大捷"
                  className="flex-1 bg-[#1a110b] border border-[#c09a53]/50 text-[#e4cfa1] px-3 py-2 outline-none focus:border-[#c09a53]"
                />
                <button 
                  onClick={async () => {
                    if (saveNameInput.trim()) {
                      await saveGame(saveNameInput.trim());
                      const saves = await getSaves();
                      setSavesList(saves);
                      setSaveNameInput("");
                      showToast("存档成功！", "success");
                    }
                  }}
                  className="bg-[#8b2323]/40 border border-[#8b2323] text-[#e4cfa1] px-6 py-2 hover:bg-[#8b2323]/60 font-bold tracking-widest"
                >
                  封存
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-[#c09a53] font-bold mb-3 border-b border-[#c09a53]/20 pb-2 tracking-widest flex items-center gap-2">
                <Download size={18} /> 逆转天机 (读取存档)
              </h3>
              <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-2">
                {savesList.length === 0 ? (
                  <div className="text-center text-[#a38a6a] py-8 tracking-widest">暂无宗庙秘档</div>
                ) : (
                  savesList.map(save => (
                    <div key={save} className="flex items-center justify-between p-3 border border-[#c09a53]/20 bg-[#1a110b] hover:border-[#c09a53]/50 transition-colors">
                      <span className="text-[#e4cfa1] font-bold tracking-widest">{save}</span>
                      <button 
                        onClick={async () => {
                          showToast(`陛下，正在逆转时空至【${save}】...`, "info");
                          await loadGame(save);
                          showToast("时空逆转成功！", "success");
                          window.location.reload();
                        }}
                        className="text-[#c09a53] hover:text-[#e4cfa1] bg-[#c09a53]/10 px-4 py-1 border border-[#c09a53]/30 text-sm tracking-widest"
                      >
                        起驾
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
