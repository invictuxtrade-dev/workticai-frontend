export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8090'

export function getToken() {
  return localStorage.getItem('wsos_token') || ''
}

export function setToken(v) {
  if (v) localStorage.setItem('wsos_token', v)
  else localStorage.removeItem('wsos_token')
}

export async function api(path, options = {}) {
  const token = getToken()
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  }

  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const text = await res.text()

  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!res.ok) throw new Error(data?.error || 'Error de API')
  return data
}