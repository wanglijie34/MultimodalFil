const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const customHeaders = (options.headers as Record<string, string>) || {};
  const isFormData = options.body instanceof FormData;
  
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...customHeaders,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "An error occurred" }));
    throw new Error(error.detail || "API request failed");
  }

  return response.json();
}

export const api = {
  files: {
    list: () => fetchApi("/files"),
    get: (id: string) => fetchApi(`/files/${id}`),
    upload: (formData: FormData) => 
      fetchApi("/files/upload", {
        method: "POST",
        body: formData,
        headers: {
          // Content-Type is set automatically by fetch for FormData
        },
      }),
    delete: (id: string) => fetchApi(`/files/${id}`, { method: "DELETE" }),
  },
  search: {
    query: (query: string) => fetchApi(`/search?query=${encodeURIComponent(query)}`),
    ask: (query: string) => fetchApi(`/search/ask?query=${encodeURIComponent(query)}`, { method: "POST" }),
  },
  agent: {
    createRun: (query: string, fileId?: string) => {
      const url = `/agent/runs?query=${encodeURIComponent(query)}${fileId && fileId !== "all" ? `&file_id=${fileId}` : ""}`;
      return fetchApi(url, { method: "POST" });
    },
    listRuns: () => fetchApi('/agent/runs'),
  },
  graph: {
    search: (query: string, fileId?: string) => {
      let url = `/graph/search?query=${encodeURIComponent(query)}`;
      if (fileId && fileId !== "all") url += `&file_id=${fileId}`;
      return fetchApi(url);
    },
    listEntities: (fileId?: string) => {
      let url = "/graph/entities";
      if (fileId && fileId !== "all") url += `?file_id=${fileId}`;
      return fetchApi(url);
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
};
