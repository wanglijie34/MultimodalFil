"use client"

import { useI18n } from "@/lib/i18n"

export default function SettingsPage() {
  const { language, setLanguage, t } = useI18n()

  return (
    <div className="flex-1 overflow-auto p-8 relative">
      <div className="absolute inset-0 bg-[#0a0705] -z-10" />
      <div className="absolute inset-0 bg-[url('/images/bg_texture.jpg')] opacity-10 mix-blend-overlay -z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a110b]/80 to-[#0a0705]/95 -z-10" />
      
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#e4cfa1]">{t("Settings")}</h1>
          <p className="text-[#a38a6a] mt-2">
            Manage your interface preferences.
          </p>
        </div>

        <div className="space-y-6">
          <div className="border border-[#c09a53]/40 rounded-sm bg-[#1a110b]/80 p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
            <h2 className="text-xl font-semibold mb-4 text-[#e4cfa1]">{t("Language")}</h2>
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
        </div>
      </div>
    </div>
  )
}
