function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "")
}

function getBrowserDerivedApiBaseUrl() {
  if (typeof window === "undefined") {
    return "http://localhost:8000/api/v1"
  }

  const protocol = window.location.protocol === "https:" ? "https:" : "http:"
  const hostname = window.location.hostname || "localhost"
  return `${protocol}//${hostname}:8000/api/v1`
}

function getBrowserDerivedWsUrl() {
  if (typeof window === "undefined") {
    return "ws://localhost:8000/api/v1/ws"
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  const hostname = window.location.hostname || "localhost"
  return `${protocol}//${hostname}:8000/api/v1/ws`
}

export function resolveApiBaseUrls() {
  const candidates = [
    process.env.NEXT_PUBLIC_API_URL,
    getBrowserDerivedApiBaseUrl(),
    "http://localhost:8000/api/v1",
    "http://127.0.0.1:8000/api/v1",
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeBaseUrl)

  return Array.from(new Set(candidates))
}

export function resolveWebSocketUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_WS_URL,
    getBrowserDerivedWsUrl(),
    "ws://localhost:8000/api/v1/ws",
    "ws://127.0.0.1:8000/api/v1/ws",
  ].filter((value): value is string => Boolean(value))

  return candidates[0]
}

async function parseApiError(response: Response) {
  const error = await response.json().catch(() => ({ detail: "An error occurred" }))
  return new Error(error.detail || `API request failed (${response.status})`)
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const customHeaders = (options.headers as Record<string, string>) || {}
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...customHeaders,
  }

  const baseUrls = resolveApiBaseUrls()
  let lastError: Error | null = null

  for (let index = 0; index < baseUrls.length; index += 1) {
    const baseUrl = baseUrls[index]
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
      })

      if (response.ok) {
        return response.json()
      }

      const error = await parseApiError(response)
      const shouldFallback = response.status === 404 && index < baseUrls.length - 1
      if (shouldFallback) {
        lastError = error
        continue
      }

      throw error
    } catch (error) {
      if (index === baseUrls.length - 1) {
        throw error instanceof Error ? error : new Error("API request failed")
      }
      lastError = error instanceof Error ? error : new Error("API request failed")
    }
  }

  throw lastError || new Error("API request failed")
}

export const api = {
  files: {
    list: () => fetchApi("/files"),
    get: (id: string) => fetchApi(`/files/${id}`),
    upload: (formData: FormData) =>
      fetchApi("/files/upload", {
        method: "POST",
        body: formData,
        headers: {},
      }),
    delete: (id: string) => fetchApi(`/files/${id}`, { method: "DELETE" }),
  },
  search: {
    query: (query: string) => fetchApi(`/search?query=${encodeURIComponent(query)}`),
    ask: (query: string) => fetchApi(`/search/ask?query=${encodeURIComponent(query)}`, { method: "POST" }),
  },
  agent: {
    createRun: (payload: {
      run_id?: string
      query: string
      file_id?: string
      workspace_id?: string
      conversation_messages?: Array<{ role: string; content: string }>
    }) =>
      fetchApi("/agent/runs", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    listRuns: () => fetchApi("/agent/runs"),
    getRun: (id: string) => fetchApi(`/agent/runs/${id}`),
    renameRun: (id: string, title: string) =>
      fetchApi(`/agent/runs/${id}/title`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      }),
    favoriteRun: (id: string, favorite: boolean) =>
      fetchApi(`/agent/runs/${id}/favorite`, {
        method: "PATCH",
        body: JSON.stringify({ favorite }),
      }),
    deleteRun: (id: string) => fetchApi(`/agent/runs/${id}`, { method: "DELETE" }),
    clearRuns: () => fetchApi("/agent/runs", { method: "DELETE" }),
  },
  graph: {
    search: (query: string, fileId?: string) => {
      let url = `/graph/search?query=${encodeURIComponent(query)}`
      if (fileId && fileId !== "all") url += `&file_id=${fileId}`
      return fetchApi(url)
    },
    listEntities: (fileId?: string) => {
      let url = "/graph/entities"
      if (fileId && fileId !== "all") url += `?file_id=${fileId}`
      return fetchApi(url)
    },
  },
  reports: {
    list: () => fetchApi("/reports"),
    get: (id: string) => fetchApi(`/reports/${id}`),
    generate: (topic: string) => fetchApi(`/reports?topic=${encodeURIComponent(topic)}`, { method: "POST" }),
  },
  system: {
    getStats: () => fetchApi("/system/stats"),
  },
}
