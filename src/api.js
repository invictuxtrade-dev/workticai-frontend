export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8090'

export function getToken() {
  return localStorage.getItem('wsos_token') || ''
}

export function setToken(v) {
  if (v) localStorage.setItem('wsos_token', v)
  else localStorage.removeItem('wsos_token')
}

export function clearSession() {
  localStorage.removeItem('wsos_token')
}

function isAuthExpired(res, data) {
  const msg = String(data?.error || data?.message || data?.raw || '').toLowerCase()

  return (
    res.status === 401 ||
    res.status === 403 ||
    msg.includes('token expired') ||
    msg.includes('unauthorized')
  )
}

let sessionExpiredEmitted = false

export async function api(path, options = {}) {
  const token = getToken()
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    })

    const text = await res.text()

    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text }
    }

    if (!res.ok) {
      if (isAuthExpired(res, data)) {
        clearSession()

        if (!sessionExpiredEmitted) {
          sessionExpiredEmitted = true
          window.dispatchEvent(new CustomEvent('wsos:session-expired'))
        }

        const err = new Error('Sesión vencida. Inicia sesión nuevamente.')
        err.status = res.status
        err.data = data
        throw err
      }

      const err = new Error(
        data?.error ||
        data?.message ||
        data?.raw ||
        'Error de API'
      )
      err.status = res.status
      err.data = data
      throw err
    }

    return data
  } catch (err) {
    if (err.name === 'TypeError') {
      const networkErr = new Error(
        'No se pudo conectar con el servidor. Verifica que el backend esté activo.'
      )
      networkErr.status = 0
      throw networkErr
    }

    throw err
  }
}