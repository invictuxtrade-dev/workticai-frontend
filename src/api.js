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

function isInvalidSession(res, data) {
  const msg = String(data?.error || data?.message || '').toLowerCase()

  return (
    res.status === 401 ||
    msg.includes('invalid session') ||
    msg.includes('sesión inválida') ||
    msg.includes('session expired') ||
    msg.includes('token expired') ||
    msg.includes('unauthorized')
  )
}

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

  let res
  let text = ''
  let data = null

  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    })

    text = await res.text()

    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text }
    }

    if (!res.ok) {
      if (isInvalidSession(res, data)) {
        clearSession()

        if (!window.location.pathname.includes('/login')) {
          window.location.reload()
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