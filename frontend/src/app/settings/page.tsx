"use client"

import { useI18n } from "@/lib/i18n"

export default function SettingsPage() {
  const { language, setLanguage, t } = useI18n()

  return (
    <div className="flex-1 overflow-auto p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("Settings")}</h1>
          <p className="text-muted-foreground mt-2">
            Manage your interface preferences.
          </p>
        </div>

        <div className="space-y-6">
          <div className="border rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">{t("Language")}</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("Language")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("Select your preferred language for the interface.")}
                </p>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "zh")}
                className="flex h-10 w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
