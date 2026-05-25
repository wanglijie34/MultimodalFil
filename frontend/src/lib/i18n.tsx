"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"

export type Language = "en" | "zh"

type Dictionary = Record<string, string>

const enDict: Dictionary = {
  "Dashboard": "Dashboard",
  "Files": "Files",
  "Search": "Search",
  "Agent Chat": "Agent Chat",
  "Knowledge Graph": "Knowledge Graph",
  "Reports": "Reports",
  "Settings": "Settings",
  "InsightGraph": "InsightGraph",
  "Language": "Language",
  "Select your preferred language for the interface.": "Select your preferred language for the interface.",
  "Theme": "Theme",
  "Books": "Books",
  "Extract Book": "Extract Book",
  "Extracting...": "Extracting...",
  "Read": "Read",
  "Chapters": "Chapters",
}

const zhDict: Dictionary = {
  "Dashboard": "仪表盘",
  "Files": "文件管理",
  "Search": "检索",
  "Agent Chat": "智能助手",
  "Knowledge Graph": "知识图谱",
  "Reports": "报告",
  "Settings": "设置",
  "InsightGraph": "洞察图谱",
  "Language": "语言",
  "Select your preferred language for the interface.": "选择您偏好的界面语言。",
  "Theme": "主题",
  "Books": "图书馆",
  "Extract Book": "提取图书",
  "Extracting...": "提取中...",
  "Read": "阅读",
  "Chapters": "章节目录",
}

const dictionaries: Record<Language, Dictionary> = {
  en: enDict,
  zh: zhDict,
}

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh") // Default to Chinese as user requested
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const storedLang = localStorage.getItem("insightgraph_lang") as Language
    if (storedLang === "en" || storedLang === "zh") {
      setLanguageState(storedLang)
    }
    setMounted(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("insightgraph_lang", lang)
  }

  const t = (key: string): string => {
    const dict = dictionaries[language]
    return dict[key] || key
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    // Return a dummy context to avoid crashing if used outside provider during testing
    return {
      language: "zh" as Language,
      setLanguage: () => {},
      t: (key: string) => key,
    }
  }
  return context
}
