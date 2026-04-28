import React, { useEffect, useMemo, useState, useRef, memo, useCallback } from 'react'
import QRCode from 'qrcode'
import { api, API_BASE, setToken, getToken } from './api'

const emptyConfig = {
  system_prompt: '',
  business_name: '',
  business_description: '',
  offer: '',
  target_audience: '',
  tone: 'Profesional y cercano',
  cta_button_text: 'Quiero avanzar',
  cta_link: '',
  fallback_message: 'Gracias por escribirnos. En breve te ayudamos.',
  human_handoff_phone: '',
  temperature: 0.7,
  model: 'gpt-4o-mini',
  followup_enabled: true,
  followup_delay_mins: 60,
  reply_mode: 'manual',
  template_id: ''
}

const emptyTemplate = {
  name: '',
  category: 'sales',
  business_type: 'general',
  stage: 'new',
  prompt_snippet: '',
  message_template: ''
}

const emptyLanding = {
  name: '',
  prompt: '',
  style_preset: 'dark_premium',
  logo_url: '',
  favicon_url: '',
  hero_image_url: '',
  youtube_url: '',
  facebook_pixel_id: '',
  google_analytics: '',
  primary_color: '#2563eb',
  secondary_color: '#0f172a',
  show_video: false,
  show_image: false,
  tracking_mode: 'auto',
  tracking_base_url: ''
}

const emptySocialCredential = {
  id: '',
  platform: 'facebook',
  access_token: '',
  page_id: '',
  page_name: '',
  enabled: true,
  ad_account_id: ''
}

const emptySocialCampaign = {
  id: '',
  name: '',
  objective: 'whatsapp',
  bot_id: '',
  landing_id: '',
  prompt: '',
  image_mode: 'ai',
  manual_image_url: '',
  manual_link_url: '',
  call_to_action: 'Escríbenos ahora',
  publish_mode: 'now',
  recurring_minutes: 60,
  days_of_week: '',
  scheduled_at: '',
  image_prompt: ''
}

// Lista de países para el selector (bandera + código)
const countries = [
  { code: 'CO', dialCode: '57', flag: '🇨🇴', name: 'Colombia' },
  { code: 'AR', dialCode: '54', flag: '🇦🇷', name: 'Argentina' },
  { code: 'MX', dialCode: '52', flag: '🇲🇽', name: 'México' },
  { code: 'ES', dialCode: '34', flag: '🇪🇸', name: 'España' },
  { code: 'US', dialCode: '1', flag: '🇺🇸', name: 'Estados Unidos' },
  { code: 'PE', dialCode: '51', flag: '🇵🇪', name: 'Perú' },
  { code: 'CL', dialCode: '56', flag: '🇨🇱', name: 'Chile' },
  { code: 'VE', dialCode: '58', flag: '🇻🇪', name: 'Venezuela' },
  { code: 'EC', dialCode: '593', flag: '🇪🇨', name: 'Ecuador' },
  { code: 'UY', dialCode: '598', flag: '🇺🇾', name: 'Uruguay' },
  { code: 'PY', dialCode: '595', flag: '🇵🇾', name: 'Paraguay' },
  { code: 'BO', dialCode: '591', flag: '🇧🇴', name: 'Bolivia' },
  { code: 'CR', dialCode: '506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: 'PA', dialCode: '507', flag: '🇵🇦', name: 'Panamá' },
  { code: 'DO', dialCode: '1', flag: '🇩🇴', name: 'República Dominicana' },
  { code: 'PR', dialCode: '1', flag: '🇵🇷', name: 'Puerto Rico' },
]

function LoginScreen({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    company_name: '',
    phone: '',
    access_role: 'client'
  })
  const [selectedCountry, setSelectedCountry] = useState(countries[0])
  const [localPhone, setLocalPhone] = useState('')
  const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 0, num2: 0, answer: 0 })
  const [captchaUserInput, setCaptchaUserInput] = useState('')
  const [captchaError, setCaptchaError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [countrySearch, setCountrySearch] = useState('')
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const dropdownRef = useRef(null)

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries
    const searchLower = countrySearch.toLowerCase()
    return countries.filter(c => 
      c.name.toLowerCase().includes(searchLower) || 
      c.dialCode.includes(searchLower) ||
      c.code.toLowerCase().includes(searchLower)
    )
  }, [countrySearch])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCountryDropdown(false)
        setCountrySearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1
    const num2 = Math.floor(Math.random() * 10) + 1
    setCaptchaQuestion({ num1, num2, answer: num1 + num2 })
    setCaptchaUserInput('')
    setCaptchaError('')
  }

  useEffect(() => {
    generateCaptcha()
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setCaptchaError('')
    setLoading(true)

    if (form.access_role === 'client' && mode === 'register') {
      const userAnswer = parseInt(captchaUserInput, 10)
      if (isNaN(userAnswer) || userAnswer !== captchaQuestion.answer) {
        setCaptchaError('Respuesta de seguridad incorrecta. Inténtalo de nuevo.')
        setLoading(false)
        generateCaptcha()
        return
      }
    }

    try {
      if (form.access_role === 'admin') {
        const data = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: form.email, password: form.password })
        })
        if (data.user.role !== 'admin') {
          setError('Este usuario no es administrador')
          setLoading(false)
          return
        }
        setToken(data.token)
        onAuth(data.user)
        return
      }

      if (form.access_role === 'client' && mode === 'login') {
        const data = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: form.email, password: form.password })
        })
        if (!['client_admin', 'client_user', 'client'].includes(data.user.role)) {
          setError('Este usuario no tiene acceso como cliente')
          setLoading(false)
          return
        }
        setToken(data.token)
        onAuth(data.user)
        return
      }

      if (form.access_role === 'client' && mode === 'register') {
        if (!form.name.trim()) { setError('Escribe tu nombre'); setLoading(false); return }
        if (!form.company_name.trim()) { setError('Escribe el nombre de la empresa'); setLoading(false); return }
        if (!form.email.trim()) { setError('Escribe tu correo'); setLoading(false); return }
        if (!form.password.trim()) { setError('Escribe tu contraseña'); setLoading(false); return }
        if (form.password !== form.confirm_password) { setError('Las contraseñas no coinciden'); setLoading(false); return }
        if (!localPhone.trim()) { setError('Ingresa tu número de teléfono'); setLoading(false); return }

        const cleanLocal = localPhone.replace(/\D/g, '')
        const fullPhone = `${selectedCountry.dialCode}${cleanLocal}`

        const data = await api('/api/auth/register-client', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            company_name: form.company_name,
            phone: fullPhone
          })
        })
        if (data.user.role !== 'client_admin') {
          setError('No se pudo crear la cuenta de cliente correctamente')
          setLoading(false)
          return
        }
        setToken(data.token)
        onAuth(data.user)
        return
      }
    } catch (err) {
      setError(err.message || 'No se pudo completar la operación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell auth-shell-pro">
      <div className="ambient-bg"></div>
      <div className="glow-aura"></div>
      <div className="floating-particles">
        {[...Array(50)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 20}s`,
            width: `${Math.random() * 4 + 1}px`,
            height: `${Math.random() * 4 + 1}px`,
            opacity: Math.random() * 0.4 + 0.1
          }} />
        ))}
      </div>

      <div className="auth-card auth-card-pro">
        <div className="auth-brand">
          <div className="auth-logo">
            <img src="/logo.png" alt="Worktic AI Logo" />
          </div>
        </div>

        <div className="auth-role-switch">
          <button
            type="button"
            className={form.access_role === 'client' ? 'role-chip active' : 'role-chip'}
            onClick={() => {
              setForm({ ...form, access_role: 'client' })
              setMode('login')
              setError('')
            }}
          >
            <i className="fas fa-building"></i> Cliente
          </button>
          <button
            type="button"
            className={form.access_role === 'admin' ? 'role-chip active' : 'role-chip'}
            onClick={() => {
              setForm({ ...form, access_role: 'admin' })
              setMode('login')
              setError('')
            }}
          >
            <i className="fas fa-shield-alt"></i> Colaborador
          </button>
        </div>

        {form.access_role === 'client' && (
          <div className="auth-subtabs">
            <button
              type="button"
              className={mode === 'login' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => {
                setMode('login')
                setError('')
              }}
            >
              <i className="fas fa-right-to-bracket"></i> Ingresar
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => {
                setMode('register')
                setError('')
                generateCaptcha()
              }}
            >
              <i className="fas fa-user-plus"></i> Crear cuenta
            </button>
          </div>
        )}

        <form onSubmit={submit} className="stack auth-form-pro">
          {form.access_role === 'client' && mode === 'register' && (
            <div className="field-group">
              <label>Nombre completo</label>
              <input type="text" placeholder="Tu nombre completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          )}

          {form.access_role === 'client' && mode === 'register' && (
            <div className="field-group">
              <label>Empresa</label>
              <input type="text" placeholder="Nombre de tu empresa" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
          )}

          {form.access_role === 'client' && mode === 'register' && (
            <div className="field-group">
              <label>Teléfono / WhatsApp</label>
              <div className="phone-input-group" ref={dropdownRef}>
                <div className="country-selector">
                  <div 
                    className="country-selector-trigger"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  >
                    <span className="country-flag">{selectedCountry.flag}</span>
                    <span className="country-name">{selectedCountry.name}</span>
                    <span className="country-dial">+{selectedCountry.dialCode}</span>
                    <i className={`fas fa-chevron-down ${showCountryDropdown ? 'rotate' : ''}`}></i>
                  </div>
                  {showCountryDropdown && (
                    <div className="country-dropdown">
                      <input
                        type="text"
                        className="country-search"
                        placeholder="Buscar país..."
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        autoFocus
                      />
                      <div className="country-list">
                        {filteredCountries.map(country => (
                          <div
                            key={country.code}
                            className="country-option"
                            onClick={() => {
                              setSelectedCountry(country)
                              setShowCountryDropdown(false)
                              setCountrySearch('')
                            }}
                          >
                            <span className="country-flag">{country.flag}</span>
                            <span className="country-name">{country.name}</span>
                            <span className="country-dial">+{country.dialCode}</span>
                          </div>
                        ))}
                        {filteredCountries.length === 0 && (
                          <div className="country-no-results">No se encontraron países</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <input 
                  type="tel" 
                  placeholder="Ej: 3118777641" 
                  value={localPhone} 
                  onChange={(e) => setLocalPhone(e.target.value)} 
                />
              </div>
              <div className="field-hint">Se almacenará con el código de país (+{selectedCountry.dialCode})</div>
            </div>
          )}

          <div className="field-group">
            <label>Correo electrónico</label>
            <input type="email" placeholder={form.access_role === 'admin' ? 'admin@empresa.com' : 'cliente@empresa.com'} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          <div className="field-group">
            <label>Contraseña</label>
            <input type="password" placeholder="Ingresa tu contraseña" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>

          {form.access_role === 'client' && mode === 'register' && (
            <div className="field-group">
              <label>Confirmar contraseña</label>
              <input type="password" placeholder="Confirma tu contraseña" value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} />
            </div>
          )}

          {form.access_role === 'client' && mode === 'register' && (
            <div className="captcha-container">
              <div className="captcha-question">
                <span className="captcha-text">¿Cuánto es {captchaQuestion.num1} + {captchaQuestion.num2}?</span>
                <button type="button" className="captcha-refresh" onClick={generateCaptcha} title="Nueva operación">
                  <i className="fas fa-sync-alt"></i>
                </button>
              </div>
              <input type="number" placeholder="Escribe el resultado" value={captchaUserInput} onChange={(e) => setCaptchaUserInput(e.target.value)} className="captcha-input" />
              {captchaError && <div className="captcha-error">{captchaError}</div>}
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <><i className="fas fa-circle-notch fa-spin"></i> Procesando...</>
            ) : (
              <>
                <i className={form.access_role === 'client' && mode === 'register' ? 'fas fa-user-plus' : 'fas fa-arrow-right'}></i>
                {form.access_role === 'client' && mode === 'register' ? 'Crear cuenta' : 'Entrar al panel'}
              </>
            )}
          </button>

          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  )
}

// ========== COMPONENTE ADS IA MEJORADO (CON GRÁFICOS PRO Y SIN SCROLL HORIZONTAL) ==========
const AdsPanel = memo(function AdsPanel({ 
  adsForm, setAdsForm, 
  adsResult, adsLoading, 
  generateAdsCampaign, 
  showNotice 
}) {
  const roi = adsResult?.roi || {}
  const currency = adsResult?.currency || adsForm.currency || 'USD'
  const adsets = adsResult?.adsets || []
  const variants = adsResult?.creative_variants || []
  const funnel = adsResult?.funnel || {}
  const roiScenarios = adsResult?.roi_scenarios || []
  const automationRules = adsResult?.automation_rules || []
  const scaleRules = adsResult?.scale_rules || []
  const killRules = adsResult?.kill_rules || []

  // Preparar datos para gráficos
  const chartData = useMemo(() => {
    if (!roiScenarios.length) return null
    const scenarios = roiScenarios
    const maxROI = Math.max(...scenarios.map(s => s.estimated_roi || 0))
    const maxCPL = Math.max(...scenarios.map(s => s.estimated_cpl || 0))
    const maxLeads = Math.max(...scenarios.map(s => s.estimated_leads || 0))
    return { scenarios, maxROI, maxCPL, maxLeads }
  }, [roiScenarios])

  // Componente Donut Chart (CSS puro)
  const DonutChart = ({ percentage, label, color }) => {
    const degree = (percentage / 100) * 360
    return (
      <div className="donut-container">
        <div className="donut-ring">
          <div className="donut-segment" style={{ transform: `rotate(${degree}deg)`, borderColor: color }}></div>
          <div className="donut-inner">{percentage}%</div>
        </div>
        <div className="donut-label">{label}</div>
      </div>
    )
  }

  return (
    <div className="ads-pro-page">
      <div className="ads-pro-hero">
        <div>
          <div className="eyebrow">Worktic AI Ads Engine</div>
          <h1>Motor profesional de adquisición de clientes</h1>
          <p>
            Diseña campañas, segmentación, creativos, funnel, WhatsApp y proyección de ROI con IA.
          </p>
        </div>
        <div className="ads-pro-status">
          <span className="status-dot"></span>
          Modo estrategia IA
        </div>
      </div>

      <div className="ads-pro-layout">
        <section className="ads-builder-card">
          <div className="section-head">
            <div>
              <h2>Crear campaña</h2>
              <p>Completa los datos base para que la IA construya una campaña accionable.</p>
            </div>
            <i className="fas fa-wand-magic-sparkles"></i>
          </div>

          <div className="ads-pro-form">
            <label>
              Negocio
              <input
                type="text"
                placeholder="Ej: CYO Digital"
                value={adsForm.business_name}
                onChange={(e) => setAdsForm({ ...adsForm, business_name: e.target.value })}
              />
            </label>
            <label>
              Producto o servicio
              <input
                type="text"
                placeholder="Ej: Libros mandala para niños"
                value={adsForm.product}
                onChange={(e) => setAdsForm({ ...adsForm, product: e.target.value })}
              />
            </label>
            <label>
              Oferta principal
              <input
                type="text"
                placeholder="Ej: Mejora concentración, creatividad y reduce ansiedad"
                value={adsForm.offer}
                onChange={(e) => setAdsForm({ ...adsForm, offer: e.target.value })}
              />
            </label>
            <label>
              Público objetivo
              <input
                type="text"
                placeholder="Ej: Padres con hijos de 4 a 10 años"
                value={adsForm.target}
                onChange={(e) => setAdsForm({ ...adsForm, target: e.target.value })}
              />
            </label>
            <label>
              País / mercado
              <input
                type="text"
                placeholder="Ej: Colombia"
                value={adsForm.country}
                onChange={(e) => setAdsForm({ ...adsForm, country: e.target.value })}
              />
            </label>
            <label>
              Moneda
              <select
                value={adsForm.currency}
                onChange={(e) => setAdsForm({ ...adsForm, currency: e.target.value })}
              >
                <option value="USD">USD</option>
                <option value="COP">COP</option>
                <option value="MXN">MXN</option>
                <option value="EUR">EUR</option>
                <option value="USDT">USDT</option>
              </select>
            </label>
            <label>
              Objetivo
              <select
                value={adsForm.objective}
                onChange={(e) => setAdsForm({ ...adsForm, objective: e.target.value })}
              >
                <option value="lead_generation">Generación de leads</option>
                <option value="messages">Mensajes WhatsApp</option>
                <option value="conversions">Conversiones</option>
                <option value="traffic">Tráfico a landing</option>
              </select>
            </label>
            <label>
              Destino
              <select
                value={adsForm.destination}
                onChange={(e) => setAdsForm({ ...adsForm, destination: e.target.value })}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="landing">Landing page</option>
                <option value="form">Formulario</option>
              </select>
            </label>
            <label>
              Presupuesto diario
              <input
                type="number"
                min="1"
                value={adsForm.budget_daily}
                onChange={(e) => setAdsForm({ ...adsForm, budget_daily: Number(e.target.value) })}
              />
            </label>
            <label>
              Ticket promedio
              <input
                type="number"
                min="1"
                value={adsForm.ticket_average}
                onChange={(e) => setAdsForm({ ...adsForm, ticket_average: Number(e.target.value) })}
              />
            </label>
          </div>

          <button className="ads-generate-btn" onClick={generateAdsCampaign} disabled={adsLoading}>
            {adsLoading ? (
              <>
                <i className="fas fa-circle-notch fa-spin"></i>
                Analizando mercado y construyendo campaña...
              </>
            ) : (
              <>
                <i className="fas fa-rocket"></i>
                Generar campaña profesional
              </>
            )}
          </button>
        </section>

        <aside className="ads-side-card">
          <h3>Arquitectura de adquisición</h3>
          <div className="ads-flow">
            <div><i className="fas fa-bullhorn"></i> Anuncio</div>
            <span></span>
            <div><i className="fas fa-filter"></i> Funnel</div>
            <span></span>
            <div><i className="fab fa-whatsapp"></i> WhatsApp Bot</div>
            <span></span>
            <div><i className="fas fa-chart-line"></i> ROI</div>
          </div>
          <p>
            La IA no solo genera texto: estructura oferta, público, creativos, seguimiento y medición.
          </p>
        </aside>
      </div>

      {adsResult && (
        <section className="ads-output">
          <div className="ads-output-head">
            <div>
              <div className="eyebrow">Campaña generada</div>
              <h2>{adsResult.name}</h2>
              <p>{adsResult.campaign_summary}</p>
            </div>
            <div className="campaign-pill">{adsResult.objective}</div>
          </div>

          {/* KPI Grid - totalmente responsive sin scroll horizontal */}
          <div className="ads-kpi-grid">
            <div className="ads-kpi">
              <span>Presupuesto mensual</span>
              <strong>{currency} {roi.budget_monthly || adsResult.budget_monthly}</strong>
            </div>
            <div className="ads-kpi">
              <span>CPL estimado</span>
              <strong>{currency} {roi.estimated_cpl || adsResult.estimated_cpl}</strong>
            </div>
            <div className="ads-kpi">
              <span>Leads estimados</span>
              <strong>{roi.estimated_leads || adsResult.estimated_leads}</strong>
            </div>
            <div className="ads-kpi">
              <span>Ventas estimadas</span>
              <strong>{roi.estimated_sales || adsResult.estimated_sales}</strong>
            </div>
            <div className="ads-kpi">
              <span>Ingresos estimados</span>
              <strong>{currency} {roi.estimated_revenue || adsResult.estimated_revenue}</strong>
            </div>
            <div className={`ads-kpi ${Number(roi.estimated_roi || adsResult.estimated_roi) >= 0 ? 'positive' : 'negative'}`}>
              <span>ROI estimado</span>
              <strong>{roi.estimated_roi || adsResult.estimated_roi}%</strong>
            </div>
            <div className="ads-kpi">
              <span>Break-even CPL</span>
              <strong>{currency} {(roi.break_even_cpl || 0).toFixed(2)}</strong>
            </div>
            <div className="ads-kpi">
              <span>Tasa cierre</span>
              <strong>{(roi.conversion_rate || 0)}%</strong>
            </div>
          </div>

          {/* SECCIÓN EJECUTIVA CON GRÁFICOS */}
          {chartData && (
            <div className="executive-charts">
              <h3>📊 Resumen ejecutivo de escenarios</h3>
              <div className="charts-grid">
                {/* Gráfico de barras vertical: ROI por escenario */}
                <div className="chart-card">
                  <div className="chart-title">ROI por escenario (%)</div>
                  <div className="bar-chart-vertical">
                    {chartData.scenarios.map((s, idx) => (
                      <div key={idx} className="bar-item-vertical">
                        <div 
                          className="bar-fill-vertical" 
                          style={{ 
                            height: `${Math.min(100, (s.estimated_roi / chartData.maxROI) * 100)}%`,
                            backgroundColor: s.estimated_roi >= 0 ? '#10b981' : '#ef4444'
                          }}
                        ></div>
                        <span className="bar-label-vertical">{s.name.slice(0, 8)}</span>
                        <span className="bar-value-vertical">{s.estimated_roi}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gráfico de barras horizontal: CPL */}
                <div className="chart-card">
                  <div className="chart-title">CPL estimado ({currency})</div>
                  <div className="bar-chart-horizontal">
                    {chartData.scenarios.map((s, idx) => (
                      <div key={idx} className="bar-item-horizontal">
                        <span className="bar-label-horizontal">{s.name}</span>
                        <div className="bar-track">
                          <div 
                            className="bar-fill-horizontal" 
                            style={{ width: `${(s.estimated_cpl / chartData.maxCPL) * 100}%` }}
                          ></div>
                        </div>
                        <span className="bar-value-horizontal">{currency} {s.estimated_cpl}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Donut chart de leads (primer escenario) */}
                <div className="chart-card">
                  <div className="chart-title">Distribución de leads</div>
                  <div className="donut-chart-wrapper">
                    <DonutChart 
                      percentage={Math.round((chartData.scenarios[0]?.estimated_leads / (chartData.maxLeads || 1)) * 100)} 
                      label={chartData.scenarios[0]?.name || 'Escenario'} 
                      color="#3b82f6"
                    />
                    <div className="donut-note">
                      <span>Leads totales: <strong>{chartData.scenarios[0]?.estimated_leads}</strong></span>
                      <span>Máximo potencial: <strong>{chartData.maxLeads}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Diagnóstico y alertas */}
          <div className="ads-diagnosis-grid">
            <div className="ads-diagnosis-card real">
              <span>Score real</span>
              <strong>{adsResult.campaign_score_real ?? 0}/100</strong>
              <p>{adsResult.campaign_decision_real}</p>
            </div>
            <div className="ads-diagnosis-card optimized">
              <span>Score optimizado</span>
              <strong>{adsResult.campaign_score_optimized ?? 0}/100</strong>
              <p>{adsResult.campaign_decision_optimized}</p>
            </div>
          </div>

          {adsResult.campaign_issues?.length > 0 && (
            <div className="ads-issues-card">
              <h3>Alertas detectadas</h3>
              <ul>
                {adsResult.campaign_issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Escenarios ROI */}
          {roiScenarios.length > 0 && (
            <div className="ads-section">
              <div className="section-head compact">
                <h3>Motor matemático ROI</h3>
                <span>{roiScenarios.length} escenarios</span>
              </div>
              <div className="roi-scenarios-grid">
                {roiScenarios.map((scenario, i) => (
                  <div
                    className={`roi-scenario-card ${scenario.estimated_roi >= 0 ? 'positive' : 'negative'}`}
                    key={i}
                  >
                    <div className="scenario-head">
                      <div>
                        <span className="scenario-label">Escenario</span>
                        <h4>{scenario.name}</h4>
                      </div>
                      <strong>{scenario.estimated_roi}%</strong>
                    </div>
                    <div className="scenario-metrics">
                      <div><span>CPM</span><b>{scenario.currency} {scenario.estimated_cpm}</b></div>
                      <div><span>CTR</span><b>{scenario.estimated_ctr}%</b></div>
                      <div><span>CPC</span><b>{scenario.currency} {scenario.estimated_cpc}</b></div>
                      <div><span>CPL</span><b>{scenario.currency} {scenario.estimated_cpl}</b></div>
                      <div><span>Leads</span><b>{scenario.estimated_leads}</b></div>
                      <div><span>Ventas</span><b>{scenario.estimated_sales}</b></div>
                      <div><span>Ingresos</span><b>{scenario.currency} {scenario.estimated_revenue}</b></div>
                      <div><span>Profit</span><b>{scenario.currency} {scenario.estimated_profit}</b></div>
                    </div>
                    <div className="scenario-note"><strong>Decisión:</strong> {scenario.decision}</div>
                    <div className="scenario-note"><strong>Escalado:</strong> {scenario.scale_signal}</div>
                    <div className="scenario-note"><strong>Optimizar si:</strong> {scenario.optimization_trigger}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resto del contenido (Avatar, Copy, etc.) */}
          <div className="ads-pro-grid">
            <div className="ads-pro-card">
              <h3>🎯 Avatar y análisis</h3>
              <p><strong>Avatar:</strong> {adsResult.customer_avatar || adsResult.target_audience}</p>
              <p><strong>Mercado:</strong> {adsResult.market_analysis}</p>
              <p><strong>Propuesta de valor:</strong> {adsResult.value_proposition}</p>
            </div>
            <div className="ads-pro-card">
              <h3>💬 Copy principal</h3>
              <p>{adsResult.primary_text}</p>
              <div className="copy-preview">
                <strong>{adsResult.headline}</strong>
                <span>{adsResult.description}</span>
                <button type="button">{adsResult.cta || 'Enviar mensaje'}</button>
              </div>
            </div>
            <div className="ads-pro-card">
              <h3>🧠 Dolores y ángulos</h3>
              <div className="tag-list">
                {(adsResult.pain_points || []).map((x, i) => <span key={`p-${i}`}>{x}</span>)}
              </div>
              <hr />
              <div className="tag-list">
                {(adsResult.angles || []).map((x, i) => <span key={`a-${i}`}>{x}</span>)}
              </div>
            </div>
            <div className="ads-pro-card">
              <h3>🖼️ Prompt creativo IA</h3>
              <p>{adsResult.creative_prompt}</p>
            </div>
          </div>

          <div className="ads-section">
            <div className="section-head compact">
              <h3>Segmentaciones recomendadas</h3>
              <span>{adsets.length} adsets</span>
            </div>
            <div className="ads-card-row">
              {adsets.map((set, i) => (
                <div className="adset-card" key={i}>
                  <h4>{set.name}</h4>
                  <p>{set.message}</p>
                  <div><strong>Edad:</strong> {set.age_range}</div>
                  <div><strong>Género:</strong> {set.gender}</div>
                  <div><strong>Ubicación:</strong> {(set.locations || []).join(', ')}</div>
                  <div className="tag-list mini">
                    {(set.interests || []).map((x, idx) => <span key={idx}>{x}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ads-section">
            <div className="section-head compact">
              <h3>Variaciones de anuncios</h3>
              <span>{variants.length} creativos</span>
            </div>
            <div className="ads-card-row">
              {variants.map((ad, i) => (
                <div className="creative-card" key={i}>
                  <div className="creative-thumb"><i className="fas fa-image"></i></div>
                  <h4>{ad.name}</h4>
                  <div className="creative-angle">{ad.angle}</div>
                  <p>{ad.primary_text}</p>
                  <strong>{ad.headline}</strong>
                  <small>{ad.description}</small>
                  <button type="button">{ad.cta || 'Enviar mensaje'}</button>
                </div>
              ))}
            </div>
          </div>

          <div className="ads-pro-grid">
            <div className="ads-pro-card">
              <h3>🧲 Funnel recomendado</h3>
              <p><strong>Destino:</strong> {funnel.destination}</p>
              <p>{funnel.recommended_bot_flow}</p>
              <ul>{(funnel.landing_structure || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="ads-pro-card">
              <h3>📲 Secuencia WhatsApp</h3>
              <p>{adsResult.whatsapp_script}</p>
              <ul>{(funnel.follow_up_sequence || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="ads-pro-card">
              <h3>📈 Optimización IA</h3>
              <ul>{(adsResult.optimization_plan || adsResult.recommendations || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="ads-pro-card">
              <h3>✅ Checklist de lanzamiento</h3>
              <ul>{(adsResult.launch_checklist || adsResult.next_actions || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="ads-pro-card">
              <h3>🤖 Reglas automáticas</h3>
              <ul>{automationRules.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="ads-pro-card">
              <h3>🚀 Reglas de escalado</h3>
              <ul>{scaleRules.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="ads-pro-card">
              <h3>🛑 Reglas de pausa</h3>
              <ul>{killRules.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          </div>
        </section>
      )}
    </div>
  )
})

// ========== COMPONENTE PLAN GATE (MEMOIZADO) ==========
const PlanGate = memo(function PlanGate({ 
  plans, billingCycle, setBillingCycle, selectPlan, 
  showInvoice, selectedPlan, subscription, 
  paymentTxHash, setPaymentTxHash, submitPlanPayment, 
  cancelInvoice, paymentQR, me, onLogout 
}) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (showInvoice && selectedPlan && subscription) {
    return (
      <div className="plan-page">
        <div style={{ maxWidth: '1180px', margin: '0 auto 1rem auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="auth-logo" style={{ margin: 0 }}>
            <img src="/logo.png" alt="Worktic AI Logo" style={{ maxWidth: '180px' }} />
          </div>
          <button className="secondary" onClick={onLogout} style={{ background: '#1e293b', color: 'white' }}>
            <i className="fas fa-sign-out-alt"></i> Cerrar sesión
          </button>
        </div>
        <div className="invoice-card">
          <div className="invoice-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div className="invoice-logo">WORKTIC AI</div>
            <div className="invoice-id">Factura # {subscription.id.slice(0, 8)}</div>
          </div>
          <div className="invoice-details">
            <div className="detail-line"><div className="detail-label">Cliente</div><div className="detail-value">{me?.name || me?.email}</div></div>
            <div className="detail-line"><div className="detail-label">Plan</div><div className="detail-value">{selectedPlan.name} · {billingCycle}</div></div>
            <div className="detail-line"><div className="detail-label">Estado</div><div className="detail-value"><span className="pill warning">Pendiente de pago</span></div></div>
            <div className="detail-line"><div className="detail-label">Fecha emisión</div><div className="detail-value">{new Date().toLocaleDateString()}</div></div>
          </div>
          <div className="qr-section">
            <div className="qr-code">
              {paymentQR ? <img src={paymentQR} alt="QR Wallet" width="160" height="160" /> : <div className="loader" style={{ width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando QR...</div>}
            </div>
            <div className="wallet-info">
              <div className="detail-label">Dirección de la wallet (BEP20)</div>
              <div className="detail-value" style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {subscription.wallet_address || 'No configurada'}
                <button className="copy-btn" onClick={() => copyToClipboard(subscription.wallet_address)}>
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <div className="payment-method" style={{ marginTop: '1rem' }}>
                <i className="fab fa-bitcoin"></i> USDT (BEP20)
              </div>
            </div>
          </div>
          <div style={{ margin: '1rem 0', textAlign: 'center' }}>
            <div className="detail-label">Monto a pagar</div>
            <div className="total-amount">${subscription.amount} USD</div>
          </div>
          <div className="step-progress">
            <div className="step active"><span className="step-number">1</span><span className="step-text">Seleccionar plan</span></div>
            <i className="fas fa-arrow-right"></i>
            <div className="step active"><span className="step-number">2</span><span className="step-text">Transferir USDT</span></div>
            <i className="fas fa-arrow-right"></i>
            <div className="step"><span className="step-number">3</span><span className="step-text">Reportar hash</span></div>
            <i className="fas fa-arrow-right"></i>
            <div className="step"><span className="step-number">4</span><span className="step-text">Validación admin</span></div>
          </div>
          <input
            type="text"
            placeholder="Pega aquí el hash de la transacción"
            value={paymentTxHash}
            onChange={(e) => setPaymentTxHash(e.target.value)}
            style={{ marginTop: '1rem', width: '100%' }}
          />
          <div className="row" style={{ marginTop: '1rem', gap: '1rem' }}>
            <button type="button" onClick={submitPlanPayment} style={{ flex: 1 }}>Reportar pago</button>
            <button type="button" onClick={cancelInvoice} className="secondary" style={{ flex: 1 }}>Volver a planes</button>
          </div>
          <div className="muted" style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: '1rem' }}>
            El administrador validará el pago y activará tu plan en <strong>24 horas hábiles</strong>.<br/>
            Puedes volver a la lista de planes para seleccionar otro si lo deseas.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="plan-page">
      <div style={{ maxWidth: '1180px', margin: '0 auto 1rem auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="auth-logo" style={{ margin: 0 }}>
          <img src="/logo.png" alt="Worktic AI Logo" style={{ maxWidth: '180px' }} />
        </div>
        <button className="secondary" onClick={onLogout} style={{ background: '#1e293b', color: 'white' }}>
          <i className="fas fa-sign-out-alt"></i> Cerrar sesión
        </button>
      </div>

      <div className="plan-hero">
        <div>
          <div className="eyebrow">Worktic AI</div>
          <h1>Elige el plan ideal para tu negocio</h1>
          <p>
            Automatiza WhatsApp, landings, embudos, contenido, campañas e IA comercial desde un solo lugar.
          </p>
        </div>

        <div className="billing-toggle">
          <button
            type="button"
            className={billingCycle === 'monthly' ? 'active' : ''}
            onClick={() => setBillingCycle('monthly')}
          >
            Mensual
          </button>
          <button
            type="button"
            className={billingCycle === 'yearly' ? 'active' : ''}
            onClick={() => setBillingCycle('yearly')}
          >
            Anual
            <span>Ahorra</span>
          </button>
        </div>
      </div>

      {plans.length === 0 && (
        <div className="stripe-card" style={{ maxWidth: 400, margin: '0 auto 2rem auto' }}>
          <div className="loader">Cargando planes disponibles...</div>
        </div>
      )}

      <div className="plans-grid">
        {plans.length > 0 && plans.map((plan) => {
          let features = []
          try {
            features = JSON.parse(plan.features || '[]')
          } catch {}

          const price = billingCycle === 'yearly'
            ? plan.price_yearly
            : plan.price_monthly

          const monthlyEquivalent = billingCycle === 'yearly' && price > 0
            ? Math.round(price / 12)
            : price

          return (
            <div key={plan.id} className={`plan-card ${plan.slug === 'pro' ? 'featured' : ''}`}>
              {plan.slug === 'pro' && <div className="popular-badge">Más recomendado</div>}

              <div>
                <h3>{plan.name}</h3>
                <p className="muted">{plan.description}</p>
              </div>

              <div className="plan-price">
                {price === 0 ? (
                  <span>Gratis</span>
                ) : (
                  <>
                    <span>${billingCycle === 'yearly' ? monthlyEquivalent : price}</span>
                    <small>USD / mes</small>
                  </>
                )}

                {billingCycle === 'yearly' && price > 0 && (
                  <div className="yearly-note">
                    Facturado anual: ${price} USD/año
                  </div>
                )}
              </div>

              <button type="button" onClick={() => selectPlan(plan.slug)}>
                {plan.is_free ? 'Comenzar gratis' : 'Seleccionar plan'}
              </button>

              <div className="features-list">
                {features.map((f, i) => (
                  <div key={i} className="feature-row">
                    <i className="fas fa-check-circle"></i>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {subscription && subscription.status === 'pending' && subscription.plan_slug !== 'free' && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button type="button" onClick={() => { const p = plans.find(pl => pl.slug === subscription.plan_slug); setSelectedPlan(p); setShowInvoice(true); }} className="secondary">
            <i className="fas fa-receipt"></i> Ver factura pendiente
          </button>
        </div>
      )}
    </div>
  )
})

export default function App() {
  useEffect(() => {
    if (!document.getElementById('pro-styles')) {
      const fontAwesome = document.createElement('link')
      fontAwesome.rel = 'stylesheet'
      fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
      document.head.appendChild(fontAwesome)

      const style = document.createElement('style')
      style.id = 'pro-styles'
      style.textContent = `
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #f0f2f5;
          color: #1e293b;
          line-height: 1.5;
        }

        .app-shell {
          display: flex;
          min-height: 100vh;
        }

        .left-rail {
          width: 280px;
          background: linear-gradient(180deg, #0b1120 0%, #0f172a 100%);
          color: #e2e8f0;
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          gap: 1.5rem;
          box-shadow: 4px 0 20px rgba(0,0,0,0.15);
        }

        .brand-card {
          text-align: center;
          padding-bottom: 1rem;
          border-bottom: 1px solid #334155;
        }

        .brand-card h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0.5rem 0 0.25rem;
          background: linear-gradient(135deg, #fff, #94a3b8);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .eyebrow {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #94a3b8;
        }

        .user-profile {
          background: rgba(255,255,255,0.05);
          border-radius: 1rem;
          padding: 1rem;
          margin-top: 0.5rem;
          text-align: center;
          border: 1px solid #334155;
        }

        .user-avatar {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .user-name {
          font-weight: 600;
          font-size: 1rem;
          color: white;
        }

        .user-role {
          font-size: 0.7rem;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .user-email {
          font-size: 0.7rem;
          color: #cbd5e1;
          word-break: break-all;
        }

        .menu {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .menu-item {
          background: transparent;
          border: none;
          color: #cbd5e1;
          padding: 0.75rem 1rem;
          text-align: left;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9rem;
        }

        .menu-item i {
          width: 1.25rem;
          font-size: 1rem;
        }

        .menu-item:hover {
          background: #1e293b;
          color: white;
          transform: translateX(4px);
        }

        .menu-item.active {
          background: #3b82f6;
          color: white;
          box-shadow: 0 4px 8px rgba(59,130,246,0.3);
        }

        .secondary {
          background: #1e293b;
          border: none;
          color: #e2e8f0;
          padding: 0.6rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: 500;
          transition: 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .secondary:hover {
          background: #334155;
        }

        .main-pane {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
          background: #f8fafc;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 1rem 1.5rem;
          border-radius: 1rem;
          margin-bottom: 2rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border: 1px solid #eef2f6;
        }

        .stripe-card {
          background: white;
          border-radius: 1.25rem;
          padding: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          transition: all 0.2s;
          border: 1px solid #eef2f6;
        }

        .stripe-card:hover {
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        .metric {
          text-align: center;
          padding: 1rem;
          border-left: 4px solid #3b82f6;
        }

        .metric-label {
          font-size: 0.8rem;
          text-transform: uppercase;
          font-weight: 600;
          color: #64748b;
        }

        .metric-value {
          font-size: 2.2rem;
          font-weight: 700;
          color: #0f172a;
        }

        .panel-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .list.two-col {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .bot-card {
          background: #ffffff;
          border-radius: 1rem;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
          cursor: pointer;
        }
        .bot-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 8px rgba(0,0,0,0.05);
        }
        .bot-card.active {
          border-left: 4px solid #10b981;
          background: #f0fdf4;
        }

        .pill {
          display: inline-block;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .pill.connected, .pill.waiting_qr { background: #d1fae5; color: #065f46; }
        .pill.disconnected, .pill.stopped, .pill.error { background: #fee2e2; color: #991b1b; }
        .pill.new { background: #e0e7ff; color: #3730a3; }
        .pill.qualified { background: #fed7aa; color: #9a3412; }
        .pill.interested { background: #bfdbfe; color: #1e40af; }
        .pill.hot { background: #fecaca; color: #b91c1c; }
        .pill.closed { background: #d1d5db; color: #1f2937; }

        button {
          background: #3b82f6;
          border: none;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: 0.2s;
          font-size: 0.85rem;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }

        button:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        button.secondary {
          background: #94a3b8;
          color: #0f172a;
        }

        button.secondary:hover {
          background: #64748b;
        }

        button.danger {
          background: #ef4444;
          color: white;
        }

        button.danger:hover {
          background: #dc2626;
        }

        .tiny-btn {
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
        }

        .row {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .row.between {
          justify-content: space-between;
        }

        .stack {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .gap-lg {
          gap: 1.5rem;
        }

        .gap-sm {
          gap: 0.5rem;
        }

        .grow {
          flex: 1;
        }

        input, select, textarea {
          padding: 0.6rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          background: white;
          font-family: inherit;
          font-size: 0.9rem;
          transition: 0.2s;
        }

        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .full {
          grid-column: span 2;
        }

        .qr {
          max-width: 200px;
          border-radius: 1rem;
          margin: 1rem 0;
        }

        .empty-box {
          background: #f1f5f9;
          padding: 2rem;
          text-align: center;
          border-radius: 1rem;
          color: #475569;
        }

        .inbox-layout {
          display: grid;
          grid-template-columns: 340px 1fr 300px;
          gap: 1.5rem;
          height: calc(100vh - 120px);
        }

        .inbox-list, .inbox-chat, .inbox-side {
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .chat-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .chat-item {
          background: white;
          border: 1px solid #e2e8f0;
          text-align: left;
          padding: 0.75rem;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: 0.2s;
        }

        .chat-item.active {
          background: #eff6ff;
          border-color: #3b82f6;
        }

        .messages {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 400px;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .bubble {
          max-width: 80%;
          padding: 0.6rem 1rem;
          border-radius: 1.2rem;
          font-size: 0.9rem;
        }

        .bubble.inbound {
          background: #f1f5f9;
          align-self: flex-start;
          border-bottom-left-radius: 0.2rem;
        }

        .bubble.outbound {
          background: #3b82f6;
          color: white;
          align-self: flex-end;
          border-bottom-right-radius: 0.2rem;
        }

        .chat-compose {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .chat-compose textarea {
          flex: 1;
        }

        .pagination {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .pagination button {
          padding: 0.3rem 0.8rem;
          font-size: 0.8rem;
        }

        .search-input {
          width: 220px;
        }

        /* ========== LOGIN SUTIL Y ESPECTACULAR ========== */
        .auth-shell {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        .auth-shell-pro {
          background: linear-gradient(145deg, #f3f6fc 0%, #eef2f8 100%);
        }

        .ambient-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 30% 40%, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0) 60%),
                      radial-gradient(circle at 70% 60%, rgba(37,99,235,0.05) 0%, rgba(37,99,235,0) 60%);
          animation: slowBreathing 12s infinite alternate ease-in-out;
          z-index: 0;
        }

        @keyframes slowBreathing {
          0% { opacity: 0.4; transform: scale(1); }
          100% { opacity: 0.9; transform: scale(1.05); }
        }

        .glow-aura {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 80vmax;
          height: 80vmax;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0) 70%);
          animation: pulseAura 8s infinite alternate;
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
        }

        @keyframes pulseAura {
          0% { opacity: 0.3; transform: translate(-50%, -50%) scale(0.9); }
          100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.2); }
        }

        .floating-particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
          pointer-events: none;
        }

        .particle {
          position: absolute;
          background: #3b82f6;
          border-radius: 50%;
          filter: blur(0.5px);
          animation: floatGentle 18s infinite linear;
        }

        @keyframes floatGentle {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          20% {
            opacity: 0.5;
          }
          80% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(-100vh) translateX(20px);
            opacity: 0;
          }
        }

        .auth-card {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          padding: 2.4rem;
          border-radius: 2rem;
          width: 460px;
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(59,130,246,0.1);
          border: 1px solid rgba(255, 255, 255, 0.5);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          z-index: 2;
          animation: cardEntry 0.5s ease-out;
        }

        @keyframes cardEntry {
          0% {
            opacity: 0;
            transform: translateY(15px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .auth-card:hover {
          box-shadow: 0 30px 50px -16px rgba(59,130,246,0.25), 0 0 0 1px rgba(59,130,246,0.2);
        }

        .auth-brand {
          text-align: center;
          margin-bottom: 2rem;
        }

        .auth-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .auth-logo img {
          max-width: 300px;
          width: 100%;
          height: auto;
          object-fit: contain;
        }

        .auth-brand h1 {
          font-size: 1.9rem;
          font-weight: 700;
          margin: 0.5rem 0 0.25rem;
          background: linear-gradient(135deg, #1e293b, #621bbb);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .auth-brand .muted {
          color: #475569;
          font-size: 0.9rem;
        }

        .auth-role-switch {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 2rem;
          justify-content: center;
        }

        .role-chip {
          background: white;
          border: 1px solid #cbd5e1;
          color: #1e293b;
          padding: 0.6rem 1.2rem;
          border-radius: 60px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 1;
          justify-content: center;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .role-chip i {
          font-size: 1rem;
        }

        .role-chip:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          transform: translateY(-1px);
        }

        .role-chip.active {
          background: #621bbb;
          border-color: #621bbb;
          color: white;
          box-shadow: 0 4px 12px -4px #621bbb;
        }

        .auth-subtabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.75rem;
          justify-content: center;
          border-bottom: 1px solid #e2e8f0;
        }

        .tab-btn {
          background: transparent;
          border: none;
          color: #64748b;
          padding: 0.5rem 1rem;
          font-weight: 500;
          font-size: 0.9rem;
          border-radius: 0;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          flex: 1;
          justify-content: center;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tab-btn i {
          font-size: 0.9rem;
        }

        .tab-btn:hover {
          color: #621bbb;
          background: transparent;
          transform: translateY(-1px);
        }

        .tab-btn.active {
          color: #621bbb;
          background: transparent;
          box-shadow: none;
        }

        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #621bbb;
          border-radius: 2px;
        }

        .auth-form-pro {
          gap: 1.25rem;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .field-group label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
        }

        .auth-form-pro input {
          background: white;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 0.8rem 1rem;
          border-radius: 0.75rem;
          transition: all 0.2s;
        }

        .auth-form-pro input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
          outline: none;
        }

        .auth-form-pro input::placeholder {
          color: #94a3b8;
        }

        /* Estilos para el selector de país con búsqueda */
        .phone-input-group {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .country-selector {
          position: relative;
          min-width: 220px;
          flex: 1;
        }
        .country-selector-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.8rem 0.8rem;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .country-selector-trigger:hover {
          border-color: #621bbb;
        }
        .country-flag {
          font-size: 1.2rem;
        }
        .country-name {
          flex: 1;
          font-size: 0.9rem;
          color: #1e293b;
        }
        .country-dial {
          font-size: 0.8rem;
          color: #64748b;
        }
        .country-selector-trigger i {
          transition: transform 0.2s;
          color: #94a3b8;
        }
        .country-selector-trigger i.rotate {
          transform: rotate(180deg);
        }
        .country-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          z-index: 10;
          max-height: 260px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .country-search {
          padding: 0.6rem 0.8rem;
          border: none;
          border-bottom: 1px solid #e2e8f0;
          outline: none;
          font-size: 0.85rem;
        }
        .country-list {
          overflow-y: auto;
          max-height: 200px;
        }
        .country-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.6rem 0.8rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .country-option:hover {
          background: #f8fafc;
        }
        .country-no-results {
          padding: 0.6rem 0.8rem;
          text-align: center;
          color: #64748b;
          font-size: 0.8rem;
        }
        .field-hint {
          font-size: 0.7rem;
          color: #64748b;
          margin-top: 0.25rem;
          width: 100%;
        }

        /* Estilos para captcha */
        .captcha-container {
          background: #f8fafc;
          border-radius: 0.75rem;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          margin-top: 0.5rem;
        }
        .captcha-question {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        .captcha-text {
          font-weight: 500;
          color: #1e293b;
          font-size: 0.9rem;
        }
        .captcha-refresh {
          background: transparent;
          border: none;
          color: #621bbb;
          cursor: pointer;
          padding: 0.25rem;
          font-size: 1rem;
          transition: transform 0.2s;
        }
        .captcha-refresh:hover {
          transform: rotate(15deg);
          background: transparent;
        }
        .captcha-input {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          background: white;
        }
        .captcha-error {
          color: #dc2626;
          font-size: 0.75rem;
          margin-top: 0.5rem;
        }

        .auth-submit-btn {
          background: linear-gradient(95deg, #c655ff, #4b139e);
          border: none;
          padding: 0.85rem;
          border-radius: 0.9rem;
          font-weight: 600;
          font-size: 1rem;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 0.5rem;
        }

        .auth-submit-btn:hover {
          background: linear-gradient(95deg, #c655ff, #4b139e);
          transform: translateY(-2px);
          box-shadow: 0 12px 20px -10px #4b139e;
        }

        .auth-submit-btn:disabled {
          opacity: 0.7;
          transform: none;
        }

        .auth-footnote {
          margin-top: 2rem;
          text-align: center;
          border-top: 1px solid #e2e8f0;
          padding-top: 1.2rem;
        }

        .auth-footnote span {
          color: #64748b;
        }

        .error {
          color: #dc2626;
          font-size: 0.85rem;
          margin-top: 0.5rem;
          text-align: center;
          background: rgba(220,38,38,0.05);
          padding: 0.6rem;
          border-radius: 0.75rem;
        }

        @media (max-width: 480px) {
          .auth-logo img {
            max-width: 110px;
          }
          .tab-btn {
            padding: 0.4rem 0.6rem;
            font-size: 0.8rem;
          }
          .phone-input-group {
            flex-direction: column;
            align-items: stretch;
          }
          .country-selector {
            width: 100%;
          }
        }

        /* Resto de estilos existentes */
        .muted {
          color: #64748b;
          font-size: 0.85rem;
        }

        .tiny {
          font-size: 0.7rem;
        }

        .toast-notice {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #1e293b;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .chart-container {
          display: flex;
          gap: 2rem;
          justify-content: space-around;
          flex-wrap: wrap;
        }
        .chart {
          flex: 1;
          min-width: 200px;
        }
        .chart-title {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #334155;
        }
        .bar-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .bar-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .bar-label {
          width: 100px;
          font-size: 0.8rem;
        }
        .bar-fill {
          background: #3b82f6;
          height: 24px;
          border-radius: 12px;
          transition: width 0.5s;
        }
        .bar-value {
          font-size: 0.75rem;
          color: #475569;
        }

        .loading-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(6px);
        }

        .loading-card {
          width: min(92%, 520px);
          background: #fff;
          border-radius: 1.25rem;
          padding: 1.5rem;
          box-shadow: 0 30px 60px rgba(0,0,0,0.25);
          border: 1px solid #e2e8f0;
        }

        .loading-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 0.35rem;
        }

        .loading-subtitle {
          font-size: 0.9rem;
          color: #64748b;
          margin-bottom: 1rem;
        }

        .loading-bar {
          width: 100%;
          height: 14px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 0.75rem;
        }

        .loading-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #06b6d4, #2563eb);
          background-size: 200% 100%;
          border-radius: 999px;
          transition: width 0.5s ease;
          animation: shimmer 2s infinite linear;
        }

        @keyframes shimmer {
          0% { background-position: 0% }
          100% { background-position: 200% }
        }

        .loading-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: #475569;
        }

        .toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 0.55rem 0.85rem;
          border-radius: 0.65rem;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .template-card {
          background: #ffffff;
          border-radius: 1rem;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }

        .template-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 8px rgba(0,0,0,0.05);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        th {
          text-align: left;
          padding: 0.75rem 0.5rem;
          font-weight: 600;
          color: #334155;
          border-bottom: 1px solid #e2e8f0;
        }
        td {
          padding: 0.75rem 0.5rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .loader {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #3b82f6;
          font-weight: 500;
        }
        .loader:before {
          content: '';
          width: 1rem;
          height: 1rem;
          border: 2px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .panel-grid { grid-template-columns: 1fr; }
          .inbox-layout { grid-template-columns: 1fr; height: auto; gap: 1rem; }
          .left-rail { width: 240px; }
        }

        /* ========== ESTILOS NUEVOS PARA PlanGate (OpenAI style) ========== */
        .plan-page {
          min-height: 100vh;
          padding: 4rem 2rem;
          background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        }

        .plan-hero {
          max-width: 1180px;
          margin: 0 auto 2.5rem;
          display: flex;
          justify-content: space-between;
          gap: 2rem;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .plan-hero h1 {
          font-size: 2.6rem;
          line-height: 1.05;
          color: #0f172a;
          margin: 0.4rem 0;
        }

        .plan-hero p {
          max-width: 650px;
          color: #64748b;
          font-size: 1rem;
        }

        .billing-toggle {
          background: #e2e8f0;
          padding: 0.35rem;
          border-radius: 999px;
          display: flex;
          gap: 0.35rem;
        }

        .billing-toggle button {
          background: transparent;
          color: #334155;
          border-radius: 999px;
          padding: 0.75rem 1rem;
        }

        .billing-toggle button.active {
          background: white;
          color: #0f172a;
          box-shadow: 0 8px 20px rgba(15,23,42,0.12);
        }

        .billing-toggle span {
          margin-left: 0.35rem;
          background: #dcfce7;
          color: #166534;
          padding: 0.1rem 0.35rem;
          border-radius: 999px;
          font-size: 0.7rem;
        }

        .plans-grid {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
        }

        .plan-card {
          position: relative;
          background: white;
          border-radius: 1.5rem;
          padding: 1.8rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 20px 35px -10px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
        }

        .plan-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 30px 45px -12px rgba(0,0,0,0.15);
          border-color: #cbd5e1;
        }

        .plan-card.featured {
          border: 2px solid #621bbb;
          box-shadow: 0 24px 45px rgba(98,27,187,0.12);
          transform: scale(1.02);
        }

        .popular-badge {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: #621bbb;
          color: white;
          padding: 0.35rem 0.8rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .plan-card h3 {
          font-size: 1.5rem;
          color: #0f172a;
        }

        .plan-price span {
          font-size: 2.8rem;
          font-weight: 800;
          color: #0f172a;
        }

        .plan-price small {
          color: #64748b;
          margin-left: 0.35rem;
        }

        .yearly-note {
          color: #16a34a;
          font-size: 0.8rem;
          margin-top: 0.3rem;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          margin: 0.5rem 0;
        }

        .feature-row {
          display: flex;
          gap: 0.65rem;
          align-items: flex-start;
          color: #334155;
          font-size: 0.9rem;
        }

        .feature-row i {
          color: #16a34a;
          margin-top: 0.2rem;
        }

        /* Estilos mejorados para la factura (inline, sin animaciones) */
        .invoice-card {
          background: white;
          border-radius: 2rem;
          padding: 2rem;
          margin: 2rem auto;
          border: 1px solid #e2e8f0;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          position: relative;
          max-width: 960px;
        }

        .invoice-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(90deg, #3b82f6, #06b6d4, #3b82f6);
        }

        .invoice-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          background: #f8fafc;
          padding: 1.2rem;
          border-radius: 1rem;
          margin-bottom: 1.5rem;
        }

        .detail-line {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .detail-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 600;
          color: #64748b;
        }

        .qr-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.5rem;
          margin: 1.5rem 0;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          padding: 1.5rem;
        }

        .qr-code {
          background: white;
          padding: 0.75rem;
          border-radius: 1rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }

        .copy-btn {
          background: #f1f5f9;
          border: none;
          padding: 0.25rem 0.6rem;
          border-radius: 0.5rem;
          font-size: 0.7rem;
          cursor: pointer;
          margin-left: 0.5rem;
        }

        .step-progress {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 2rem 0 1.5rem;
          flex-wrap: wrap;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .step-number {
          width: 32px;
          height: 32px;
          background: #e2e8f0;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: bold;
          color: #475569;
        }

        .step.active .step-number {
          background: #3b82f6;
          color: white;
        }

        .total-amount {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
        }

        @media (max-width: 768px) {
          .plan-hero { flex-direction: column; align-items: flex-start; }
          .plan-hero h1 { font-size: 2rem; }
          .plan-card.featured { transform: none; }
          .invoice-details { grid-template-columns: 1fr; }
          .qr-section { flex-direction: column; align-items: center; text-align: center; }
          .step-progress { flex-direction: column; align-items: flex-start; }
        }

        /* ========== ADS ENGINE PRO (nuevo diseño - SIN SCROLL HORIZONTAL) ========== */
        .ads-pro-page {
          max-width: 100%;
          margin: 0 auto;
          padding: 1rem 0 3rem;
          overflow-x: hidden;
        }

        .ads-pro-hero {
          background:
            radial-gradient(circle at top left, rgba(98, 27, 187, 0.16), transparent 35%),
            linear-gradient(135deg, #0f172a, #111827 60%, #1e1b4b);
          color: white;
          border-radius: 2rem;
          padding: 2rem;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          gap: 1.5rem;
          align-items: flex-end;
          box-shadow: 0 25px 60px rgba(15,23,42,.25);
        }

        .ads-pro-hero h1 {
          font-size: clamp(2rem, 4vw, 3.4rem);
          line-height: 1;
          margin: .35rem 0;
          letter-spacing: -0.04em;
        }

        .ads-pro-hero p {
          max-width: 760px;
          color: #cbd5e1;
          font-size: 1rem;
        }

        .ads-pro-status {
          background: rgba(255,255,255,.1);
          border: 1px solid rgba(255,255,255,.16);
          padding: .75rem 1rem;
          border-radius: 999px;
          display: flex;
          gap: .5rem;
          align-items: center;
          white-space: nowrap;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          background: #22c55e;
          border-radius: 999px;
          box-shadow: 0 0 0 6px rgba(34,197,94,.15);
        }

        .ads-pro-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 1.5rem;
          align-items: start;
        }

        .ads-builder-card,
        .ads-side-card,
        .ads-output,
        .ads-pro-card,
        .adset-card,
        .creative-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 1.5rem;
          box-shadow: 0 18px 35px rgba(15,23,42,.06);
        }

        .ads-builder-card {
          padding: 1.5rem;
        }

        .ads-side-card {
          padding: 1.5rem;
          position: sticky;
          top: 1rem;
        }

        .section-head {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
          margin-bottom: 1.25rem;
        }

        .section-head h2,
        .section-head h3 {
          margin: 0;
          color: #0f172a;
        }

        .section-head p {
          color: #64748b;
          font-size: .9rem;
        }

        .section-head > i {
          font-size: 1.8rem;
          color: #621bbb;
        }

        .section-head.compact {
          align-items: center;
          margin-bottom: 1rem;
        }

        .section-head.compact span {
          background: #f1f5f9;
          color: #334155;
          padding: .35rem .75rem;
          border-radius: 999px;
          font-size: .8rem;
        }

        .ads-pro-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .ads-pro-form label {
          display: flex;
          flex-direction: column;
          gap: .4rem;
          font-size: .75rem;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: .04em;
          color: #64748b;
        }

        .ads-pro-form input,
        .ads-pro-form select {
          text-transform: none;
          font-weight: 500;
          letter-spacing: normal;
          color: #0f172a;
          padding: .8rem .9rem;
          border-radius: .9rem;
        }

        .ads-generate-btn {
          width: 100%;
          margin-top: 1.25rem;
          justify-content: center;
          padding: 1rem;
          border-radius: 1rem;
          background: linear-gradient(135deg, #621bbb, #3b82f6);
          font-size: 1rem;
          box-shadow: 0 14px 26px rgba(59,130,246,.22);
        }

        .ads-flow {
          display: flex;
          flex-direction: column;
          gap: .6rem;
          margin: 1rem 0;
        }

        .ads-flow div {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: .8rem;
          border-radius: 1rem;
          display: flex;
          gap: .7rem;
          align-items: center;
          font-weight: 700;
          color: #0f172a;
        }

        .ads-flow span {
          height: 18px;
          width: 2px;
          background: #cbd5e1;
          margin-left: 1.35rem;
        }

        .ads-output {
          margin-top: 1.5rem;
          padding: 1.5rem;
        }

        .ads-output-head {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .ads-output-head h2 {
          font-size: 2rem;
          color: #0f172a;
          margin: .2rem 0;
        }

        .campaign-pill {
          background: #eef2ff;
          color: #3730a3;
          padding: .45rem .85rem;
          border-radius: 999px;
          font-weight: 800;
          font-size: .8rem;
        }

        /* KPI Grid - Responsive y sin scroll horizontal */
        .ads-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .ads-kpi {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 1.2rem;
          padding: 1rem;
        }

        .ads-kpi span {
          display: block;
          color: #64748b;
          font-size: .72rem;
          text-transform: uppercase;
          font-weight: 800;
          margin-bottom: .35rem;
        }

        .ads-kpi strong {
          color: #0f172a;
          font-size: 1.35rem;
          word-break: break-word;
        }

        .ads-kpi.positive {
          background: #ecfdf5;
          border-color: #bbf7d0;
        }

        .ads-kpi.negative {
          background: #fef2f2;
          border-color: #fecaca;
        }

        /* Nuevos estilos para gráficos ejecutivos */
        .executive-charts {
          background: white;
          border-radius: 1.5rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
          border: 1px solid #e2e8f0;
        }

        .executive-charts h3 {
          margin-bottom: 1rem;
          padding-left: 0.5rem;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .chart-card {
          background: #f8fafc;
          border-radius: 1.2rem;
          padding: 1rem;
          border: 1px solid #e2e8f0;
        }

        .chart-card .chart-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 1rem;
          text-align: center;
        }

        /* Gráfico vertical (barras hacia arriba) */
        .bar-chart-vertical {
          display: flex;
          justify-content: space-around;
          align-items: flex-end;
          gap: 0.5rem;
          height: 180px;
        }

        .bar-item-vertical {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          gap: 0.35rem;
        }

        .bar-fill-vertical {
          width: 100%;
          background-color: #3b82f6;
          border-radius: 8px 8px 0 0;
          transition: height 0.5s;
          min-height: 4px;
        }

        .bar-label-vertical {
          font-size: 0.7rem;
          font-weight: 600;
          color: #334155;
        }

        .bar-value-vertical {
          font-size: 0.7rem;
          color: #475569;
        }

        /* Gráfico horizontal */
        .bar-chart-horizontal {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .bar-item-horizontal {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .bar-label-horizontal {
          width: 70px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #1e293b;
        }

        .bar-track {
          flex: 1;
          background: #e2e8f0;
          border-radius: 12px;
          height: 20px;
          overflow: hidden;
        }

        .bar-fill-horizontal {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #06b6d4);
          border-radius: 12px;
          transition: width 0.5s;
        }

        .bar-value-horizontal {
          font-size: 0.75rem;
          font-weight: 600;
          color: #0f172a;
          min-width: 60px;
          text-align: right;
        }

        /* Donut chart wrapper */
        .donut-chart-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        /* Gráfico donut */
        .donut-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .donut-ring {
          position: relative;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: #e2e8f0;
          overflow: hidden;
        }
        .donut-segment {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 8px solid transparent;
          border-top-color: currentColor;
          transform: rotate(0deg);
        }
        .donut-inner {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.2rem;
          color: #0f172a;
        }
        .donut-label {
          font-size: 0.7rem;
          color: #475569;
        }
        .donut-note {
          font-size: 0.75rem;
          color: #334155;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          text-align: center;
        }

        .ads-diagnosis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .ads-diagnosis-card {
          border-radius: 1.4rem;
          padding: 1.2rem;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .ads-diagnosis-card span {
          display: block;
          font-size: .72rem;
          text-transform: uppercase;
          font-weight: 800;
          color: #64748b;
          margin-bottom: .3rem;
        }

        .ads-diagnosis-card strong {
          display: block;
          font-size: 2rem;
          color: #0f172a;
          margin-bottom: .4rem;
        }

        .ads-diagnosis-card.real {
          background: #fff7ed;
          border-color: #fed7aa;
        }

        .ads-diagnosis-card.optimized {
          background: #ecfdf5;
          border-color: #bbf7d0;
        }

        .ads-issues-card {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 1.4rem;
          padding: 1.2rem;
          margin-bottom: 1.5rem;
        }

        .ads-issues-card h3 {
          color: #991b1b;
          margin-bottom: .75rem;
        }

        .ads-issues-card li {
          color: #7f1d1d;
        }

        .ads-pro-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .ads-pro-card {
          padding: 1.25rem;
        }

        .ads-pro-card h3 {
          color: #0f172a;
          margin-bottom: .8rem;
        }

        .ads-pro-card p,
        .ads-pro-card li {
          color: #334155;
          font-size: .92rem;
          line-height: 1.55;
        }

        .ads-pro-card ul {
          padding-left: 1.1rem;
          display: grid;
          gap: .45rem;
        }

        .copy-preview {
          margin-top: 1rem;
          background: #f8fafc;
          border-radius: 1rem;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          display: grid;
          gap: .4rem;
        }

        .copy-preview span {
          color: #64748b;
        }

        .copy-preview button {
          width: fit-content;
          margin-top: .5rem;
        }

        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: .5rem;
        }

        .tag-list span {
          background: #eef2ff;
          color: #3730a3;
          padding: .35rem .65rem;
          border-radius: 999px;
          font-size: .78rem;
          font-weight: 700;
        }

        .tag-list.mini span {
          background: #f1f5f9;
          color: #334155;
        }

        .ads-pro-card hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 1rem 0;
        }

        .ads-section {
          margin-bottom: 1.5rem;
        }

        .ads-card-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1rem;
        }

        .adset-card,
        .creative-card {
          padding: 1.15rem;
        }

        .adset-card h4,
        .creative-card h4 {
          color: #0f172a;
          margin-bottom: .45rem;
        }

        .adset-card p,
        .creative-card p {
          color: #475569;
          font-size: .9rem;
          line-height: 1.5;
          margin-bottom: .8rem;
        }

        .creative-thumb {
          height: 120px;
          border-radius: 1rem;
          background:
            radial-gradient(circle at 20% 20%, rgba(98,27,187,.35), transparent 35%),
            linear-gradient(135deg, #e0e7ff, #f8fafc);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #621bbb;
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .creative-angle {
          display: inline-block;
          background: #fef3c7;
          color: #92400e;
          padding: .25rem .55rem;
          border-radius: 999px;
          font-size: .75rem;
          font-weight: 800;
          margin-bottom: .6rem;
        }

        .creative-card small {
          display: block;
          color: #64748b;
          margin-top: .35rem;
        }

        .creative-card button {
          margin-top: .85rem;
        }

        /* Nuevos estilos para escenarios ROI y reglas */
        .roi-scenarios-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
          gap: 1rem;
        }

        .roi-scenario-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 1.5rem;
          padding: 1.2rem;
          box-shadow: 0 18px 35px rgba(15,23,42,.06);
        }

        .roi-scenario-card.positive {
          border-color: #bbf7d0;
          background: linear-gradient(180deg, #ecfdf5, #ffffff);
        }

        .roi-scenario-card.negative {
          border-color: #fecaca;
          background: linear-gradient(180deg, #fef2f2, #ffffff);
        }

        .scenario-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .scenario-label {
          font-size: .7rem;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 800;
        }

        .scenario-head h4 {
          margin: .15rem 0 0;
          color: #0f172a;
          font-size: 1.2rem;
        }

        .scenario-head strong {
          font-size: 1.4rem;
          color: #0f172a;
        }

        .scenario-metrics {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: .65rem;
          margin-bottom: 1rem;
        }

        .scenario-metrics div {
          background: rgba(255,255,255,.72);
          border: 1px solid #e2e8f0;
          border-radius: .9rem;
          padding: .7rem;
        }

        .scenario-metrics span {
          display: block;
          font-size: .68rem;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 800;
          margin-bottom: .2rem;
        }

        .scenario-metrics b {
          color: #0f172a;
          font-size: .95rem;
        }

        .scenario-note {
          background: #f8fafc;
          border-radius: .9rem;
          padding: .7rem;
          color: #334155;
          font-size: .85rem;
          margin-top: .5rem;
        }

        @media (max-width: 1100px) {
          .ads-pro-layout {
            grid-template-columns: 1fr;
          }

          .ads-side-card {
            position: static;
          }
        }

        @media (max-width: 720px) {
          .ads-pro-hero,
          .ads-output-head {
            flex-direction: column;
            align-items: flex-start;
          }

          .ads-pro-form,
          .ads-pro-grid,
          .roi-scenarios-grid,
          .charts-grid {
            grid-template-columns: 1fr;
          }

          .scenario-metrics {
            grid-template-columns: 1fr;
          }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    const onExpired = () => {
      setToken('')
      setMe(null)
    }
    window.addEventListener('wsos:session-expired', onExpired)
    return () => {
      window.removeEventListener('wsos:session-expired', onExpired)
    }
  }, [])

  // ======================== TODA LA LÓGICA DEL ESTADO Y FUNCIONES ========================
  const [me, setMe] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  // ========== NUEVOS ESTADOS PARA PLANES Y SUSCRIPCIONES ==========
  const [plans, setPlans] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [billingConfig, setBillingConfig] = useState({
    usdt_bep20_wallet: '',
    card_payments_enabled: false,
    default_free_plan_slug: 'free',
    require_plan_selection: true
  })
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [selectedPlanSlug, setSelectedPlanSlug] = useState('')
  const [paymentTxHash, setPaymentTxHash] = useState('')
  const [forcePlanScreen, setForcePlanScreen] = useState(false)
  const [pendingSubscriptions, setPendingSubscriptions] = useState([])

  // NUEVOS ESTADOS PARA VISTA INLINE DE FACTURA (sin modal)
  const [showInvoice, setShowInvoice] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paymentQR, setPaymentQR] = useState('')

  // ========== ADS IA NUEVO ESTADO (PRO) ==========
  const [adsPlans, setAdsPlans] = useState([])
  const [adsForm, setAdsForm] = useState({
    business_name: '',
    product: '',
    offer: '',
    target: '',
    country: 'Colombia',
    currency: 'USD',
    objective: 'lead_generation',
    destination: 'whatsapp',
    budget_daily: 10,
    ticket_average: 50
  })
  const [adsResult, setAdsResult] = useState(null)
  const [adsLoading, setAdsLoading] = useState(false)

  // ========== REDIRECCIÓN DE PESTAÑAS PROHIBIDAS ==========
  useEffect(() => {
    if (!me) return
    const adminOnlyTabs = ['clients', 'users', 'billing']
    if (me.role !== 'admin' && adminOnlyTabs.includes(tab)) {
      setTab('dashboard')
    }
  }, [me, tab])

  const [clients, setClients] = useState([])
  const [users, setUsers] = useState([])
  const [bots, setBots] = useState([])
  const [templates, setTemplates] = useState([])
  const [metrics, setMetrics] = useState({})
  const [funnelMetrics, setFunnelMetrics] = useState({})

  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedBotId, setSelectedBotId] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState(null)

  const [qrDataUrlBot, setQrDataUrlBot] = useState('')
  const [leads, setLeads] = useState([])
  const [messages, setMessages] = useState([])
  const [config, setConfig] = useState(emptyConfig)

  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', plan: 'pro' })
  const [newUser, setNewUser] = useState({ client_id: '', name: '', email: '', password: '', role: 'client_admin' })
  const [newBotName, setNewBotName] = useState('')
  const [sendNumber, setSendNumber] = useState('')
  const [sendMessage, setSendMessage] = useState('Hola 👋')
  const [chatMessage, setChatMessage] = useState('')
  const [templateForm, setTemplateForm] = useState(emptyTemplate)

  const [landingForm, setLandingForm] = useState(emptyLanding)
  const [landings, setLandings] = useState([])
  const [editingLandingId, setEditingLandingId] = useState('')
  const [landingHTML, setLandingHTML] = useState('')
  const [landingLoading, setLandingLoading] = useState(false)
  const [landingLoadingText, setLandingLoadingText] = useState('')
  const [landingLoadingStep, setLandingLoadingStep] = useState(0)

  const [socialCredential, setSocialCredential] = useState(emptySocialCredential)
  const [socialCampaign, setSocialCampaign] = useState(emptySocialCampaign)
  const [socialPosts, setSocialPosts] = useState([])
  const [socialLogs, setSocialLogs] = useState([])
  const [socialImageURL, setSocialImageURL] = useState('')
  const [socialLoadingStep, setSocialLoadingStep] = useState(0)
  const [socialLoadingText, setSocialLoadingText] = useState('')
  const [socialContent, setSocialContent] = useState('')
  const [socialLoading, setSocialLoading] = useState(false)
  const [socialImagePrompt, setSocialImagePrompt] = useState('')
  const [socialImageLoading, setSocialImageLoading] = useState(false)
  const [socialUploadLoading, setSocialUploadLoading] = useState(false)
  const [socialActionLoading, setSocialActionLoading] = useState(false)
  const [socialActionText, setSocialActionText] = useState('')
  const [socialActionStep, setSocialActionStep] = useState(0)

  const [searchBot, setSearchBot] = useState('')
  const [botPage, setBotPage] = useState(1)
  const [searchLead, setSearchLead] = useState('')
  const [leadPage, setLeadPage] = useState(1)
  const [searchTemplate, setSearchTemplate] = useState('')
  const [templatePage, setTemplatePage] = useState(1)
  const [searchClient, setSearchClient] = useState('')
  const [clientPage, setClientPage] = useState(1)
  const [searchUser, setSearchUser] = useState('')
  const [userPage, setUserPage] = useState(1)

  const pageSize = 5

  const selectedClient = useMemo(() => clients.find((x) => x.id === selectedClientId), [clients, selectedClientId])
  const selectedBot = useMemo(() => bots.find((x) => x.id === selectedBotId), [bots, selectedBotId])
  const selectedLead = useMemo(() => leads.find((x) => x.id === selectedLeadId), [leads, selectedLeadId])

  const activeBots = useMemo(
    () => bots.filter((b) => b.status === 'connected' || b.status === 'waiting_qr'),
    [bots]
  )

  const inactiveBots = useMemo(
    () => bots.filter((b) => b.status !== 'connected' && b.status !== 'waiting_qr'),
    [bots]
  )

  const filteredActiveBots = useMemo(() => {
    return activeBots.filter(b => b.name.toLowerCase().includes(searchBot.toLowerCase()) || (b.phone && b.phone.includes(searchBot)))
  }, [activeBots, searchBot])

  const paginatedActiveBots = useMemo(() => {
    const start = (botPage - 1) * pageSize
    return filteredActiveBots.slice(start, start + pageSize)
  }, [filteredActiveBots, botPage])

  const filteredInactiveBots = useMemo(() => {
    return inactiveBots.filter(b => b.name.toLowerCase().includes(searchBot.toLowerCase()) || (b.phone && b.phone.includes(searchBot)))
  }, [inactiveBots, searchBot])

  const paginatedInactiveBots = useMemo(() => {
    const start = (botPage - 1) * pageSize
    return filteredInactiveBots.slice(start, start + pageSize)
  }, [filteredInactiveBots, botPage])

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => 
      (lead.display_name || lead.phone).toLowerCase().includes(searchLead.toLowerCase()) ||
      (lead.client_name && lead.client_name.toLowerCase().includes(searchLead.toLowerCase()))
    )
  }, [leads, searchLead])

  const paginatedLeads = useMemo(() => {
    const start = (leadPage - 1) * pageSize
    return filteredLeads.slice(start, start + pageSize)
  }, [filteredLeads, leadPage])

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => t.name.toLowerCase().includes(searchTemplate.toLowerCase()))
  }, [templates, searchTemplate])

  const paginatedTemplates = useMemo(() => {
    const start = (templatePage - 1) * pageSize
    return filteredTemplates.slice(start, start + pageSize)
  }, [filteredTemplates, templatePage])

  const filteredClients = useMemo(() => {
    return clients.filter(c => c.name.toLowerCase().includes(searchClient.toLowerCase()) || c.email.toLowerCase().includes(searchClient.toLowerCase()))
  }, [clients, searchClient])

  const paginatedClients = useMemo(() => {
    const start = (clientPage - 1) * pageSize
    return filteredClients.slice(start, start + pageSize)
  }, [filteredClients, clientPage])

  const filteredUsers = useMemo(() => {
    return users.filter(u => u.name.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase()))
  }, [users, searchUser])

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, userPage])

  const botLeadsByStage = useMemo(() => {
    if (!selectedBot) return { stages: [], counts: [] }
    const stages = ['new', 'qualified', 'interested', 'hot', 'closed']
    const counts = stages.map(s => leads.filter(l => l.bot_id === selectedBot.id && l.stage === s).length)
    return { stages, counts }
  }, [selectedBot, leads])

  const showNotice = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  function resolveMediaURL(url) {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url
    }
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`
  }

  function htmlToPlainText(input) {
    if (!input) return ''
    const div = document.createElement('div')
    div.innerHTML = input
    return (div.textContent || div.innerText || '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  // ======================== FUNCIONES DE PLANES Y FACTURACIÓN ========================
  async function loadPlans() {
    try {
      const data = await api('/api/plans')
      setPlans(data || [])
    } catch (err) {
      console.error(err)
      if (err.status === 402 && err.message === 'plan_required') setForcePlanScreen(true)
    }
  }

  async function loadCurrentSubscription() {
    if (forcePlanScreen) return
    try {
      const data = await api('/api/subscriptions/current')
      setSubscription(data || null)
      if (me && me.role !== 'admin') {
        if (!data || data.status !== 'active') {
          setForcePlanScreen(true)
        } else {
          setForcePlanScreen(false)
        }
      }
    } catch (err) {
      console.error(err)
      if (err.status === 402 && err.message === 'plan_required') setForcePlanScreen(true)
      setSubscription(null)
    }
  }

  async function loadBillingConfig() {
    try {
      const data = await api('/api/billing/config')
      setBillingConfig(data || billingConfig)
    } catch (err) {
      console.error(err)
    }
  }

  async function saveBillingConfig() {
    try {
      await api('/api/billing/config', {
        method: 'PUT',
        body: JSON.stringify(billingConfig)
      })
      showNotice('Configuración de billing guardada')
    } catch (err) {
      showNotice(err.message || 'Error guardando billing')
    }
  }

  async function selectPlan(planSlug) {
    try {
      const sub = await api('/api/subscriptions/select', {
        method: 'POST',
        body: JSON.stringify({
          plan_slug: planSlug,
          billing_cycle: billingCycle
        })
      })
      setSubscription(sub)

      if (planSlug === 'free') {
        setForcePlanScreen(false)
        await bootstrap()
        await loadInitial()
        showNotice('Plan Free activado')
        return
      }

      setSelectedPlanSlug(planSlug)
      const selected = plans.find(p => p.slug === planSlug)
      setSelectedPlan(selected)
      setShowInvoice(true)
      if (sub.wallet_address) {
        QRCode.toDataURL(sub.wallet_address, { margin: 1, width: 220 }, (err, url) => {
          if (!err) setPaymentQR(url)
          else setPaymentQR('')
        })
      }
      showNotice('Plan seleccionado. Completa el pago en la factura.')
    } catch (err) {
      showNotice(err.message || 'Error seleccionando plan')
    }
  }

  async function submitPlanPayment() {
    if (!subscription?.id) {
      showNotice('Primero selecciona un plan')
      return
    }
    if (!paymentTxHash.trim()) {
      showNotice('Ingresa el hash de la transacción')
      return
    }

    try {
      await api('/api/subscriptions/pay', {
        method: 'POST',
        body: JSON.stringify({
          subscription_id: subscription.id,
          tx_hash: paymentTxHash
        })
      })
      showNotice('Pago reportado. Espera validación del administrador.')
      await loadCurrentSubscription()
      setPaymentTxHash('')
      setShowInvoice(false)
      setSelectedPlan(null)
    } catch (err) {
      showNotice(err.message || 'Error reportando pago')
    }
  }

  async function cancelInvoice() {
    setShowInvoice(false)
    setSelectedPlan(null)
    setPaymentTxHash('')
    setPaymentQR('')
  }

  async function loadPendingSubscriptions() {
    try {
      const data = await api('/api/subscriptions/pending')
      setPendingSubscriptions(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  async function approveSubscription(id) {
    try {
      await api(`/api/subscriptions/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Validado por admin' })
      })
      showNotice('Suscripción aprobada')
      await loadPendingSubscriptions()
      await loadClients()
    } catch (err) {
      showNotice(err.message || 'Error aprobando suscripción')
    }
  }

  // ========== ADS IA FUNCIÓN (PRO) ==========
  const generateAdsCampaign = useCallback(async () => {
    if (!adsForm.business_name.trim()) {
      showNotice('Escribe el nombre del negocio')
      return
    }
    if (!adsForm.product.trim()) {
      showNotice('Escribe el producto o servicio')
      return
    }
    if (!adsForm.offer.trim()) {
      showNotice('Escribe la oferta principal')
      return
    }
    if (!adsForm.target.trim()) {
      showNotice('Describe el público objetivo')
      return
    }

    try {
      setAdsLoading(true)
      setAdsResult(null)

      const clientParam =
        me?.role === 'admin' && selectedClientId
          ? `?client_id=${selectedClientId}`
          : ''

      if (me?.role === 'admin' && !selectedClientId) {
        showNotice('Selecciona un cliente antes de generar la campaña')
        return
      }

      const res = await api(`/api/ads/generate-campaign${clientParam}`, {
        method: 'POST',
        body: JSON.stringify({
          ...adsForm,
          budget_daily: Number(adsForm.budget_daily || 10),
          ticket_average: Number(adsForm.ticket_average || 50),
          save: true
        })
      })

      setAdsResult(res.plan)
      showNotice('Campaña IA generada correctamente')
    } catch (err) {
      const msg = err.message || 'Error generando campaña'
      showNotice(msg.length > 180 ? msg.slice(0, 180) + '...' : msg)
    } finally {
      setAdsLoading(false)
    }
  }, [adsForm, me, selectedClientId, showNotice])

  // ======================== FUNCIONES EXISTENTES CON GUARDIA PLAN ========================
  async function loadLandings() {
    if (forcePlanScreen) return
    try {
      const data = await api(`/api/landings${selectedClientId ? `?client_id=${selectedClientId}` : ''}`)
      setLandings(data || [])
    } catch (err) {
      console.error('loadLandings', err)
      if (err.status === 402) setForcePlanScreen(true)
      setLandings([])
    }
  }

  async function loadFunnelMetrics() {
    if (forcePlanScreen) return
    try {
      const data = await api(`/api/funnel${selectedClientId ? `?client_id=${selectedClientId}` : ''}`)
      setFunnelMetrics(data || {})
    } catch (err) {
      console.error(err)
      if (err.status === 402) setForcePlanScreen(true)
      setFunnelMetrics({})
    }
  }

  async function bootstrap() {
    if (!getToken()) return
    try {
      const user = await api('/api/auth/me')
      setMe(user)
      setForcePlanScreen(false)
    } catch (err) {
      if (err.status === 402 && err.message === 'plan_required') {
        setForcePlanScreen(true)
        try {
          const user = await api('/api/auth/me')
          setMe(user)
        } catch {}
        return
      }
      setToken('')
    }
  }

  useEffect(() => {
    bootstrap()
    loadPlans()
  }, [])

  useEffect(() => {
    if (!me) return
    loadPlans()
    loadCurrentSubscription()

    if (me.role === 'admin') {
      loadBillingConfig()
    }
  }, [me])

  // ======================== FUNCIONES DE LANDING ========================
  async function generateLanding() {
    if (!selectedBotId) {
      showNotice('Selecciona un bot primero')
      return
    }
    if (!landingForm.name.trim()) {
      showNotice('Asigna un nombre a la landing')
      return
    }
    if (!landingForm.prompt.trim()) {
      showNotice('Describe el contenido de la landing (campo prompt)')
      return
    }
    if (landingForm.tracking_mode === 'external') {
      if (!landingForm.tracking_base_url.trim()) {
        showNotice('Debes indicar la URL base del backend para el tracking externo')
        return
      }
      if (!/^https?:\/\//i.test(landingForm.tracking_base_url.trim())) {
        showNotice('La URL del tracking debe comenzar con http:// o https://')
        return
      }
    }

    setBusy(true)
    setLandingLoading(true)
    setLandingLoadingStep(10)
    setLandingLoadingText('Analizando estructura de la landing...')

    const progress = [
      { step: 20, text: 'Construyendo propuesta de valor y hero...' },
      { step: 40, text: 'Diseñando secciones visuales y CTA...' },
      { step: 60, text: 'Integrando FAQ, testimonios y responsive...' },
      { step: 80, text: 'Preparando preview final...' }
    ]

    let idx = 0
    const interval = setInterval(() => {
      if (idx < progress.length) {
        setLandingLoadingStep(progress[idx].step)
        setLandingLoadingText(progress[idx].text)
        idx++
      }
    }, 1800)

    try {
      const res = await api('/api/landings/generate', {
        method: 'POST',
        body: JSON.stringify({
          bot_id: selectedBotId,
          ...landingForm
        })
      })
      clearInterval(interval)
      setLandingLoadingStep(100)
      setLandingLoadingText('Landing generada correctamente')
      setLandingHTML(res.html || '')
      setEditingLandingId(res.id || '')
      await loadLandings()
      showNotice('Landing generada correctamente')
      setTimeout(() => {
        const previewElement = document.getElementById('landing-preview')
        if (previewElement) {
          previewElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300)
    } catch (err) {
      clearInterval(interval)
      showNotice(err.message || 'Error al generar landing')
    } finally {
      setTimeout(() => {
        setLandingLoading(false)
        setLandingLoadingText('')
        setLandingLoadingStep(0)
      }, 700)
      setBusy(false)
    }
  }

  async function saveLandingChanges() {
    if (!editingLandingId) {
      showNotice('No hay landing seleccionada para editar')
      return
    }
    if (landingForm.tracking_mode === 'external') {
      if (!landingForm.tracking_base_url.trim()) {
        showNotice('Debes indicar la URL base del backend para el tracking externo')
        return
      }
      if (!/^https?:\/\//i.test(landingForm.tracking_base_url.trim())) {
        showNotice('La URL del tracking debe comenzar con http:// o https://')
        return
      }
    }
    setBusy(true)
    try {
      await api(`/api/landings/${editingLandingId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...landingForm,
          html: landingHTML,
          preview_html: landingHTML
        })
      })
      await loadLandings()
      showNotice('Landing actualizada')
    } catch (err) {
      showNotice(err.message || 'Error al actualizar landing')
    } finally {
      setBusy(false)
    }
  }

  async function deleteLanding(id) {
    if (!window.confirm('¿Eliminar esta landing?')) return
    try {
      await api(`/api/landings/${id}`, { method: 'DELETE' })
      if (editingLandingId === id) {
        resetLandingForm()
      }
      await loadLandings()
      showNotice('Landing eliminada')
    } catch (err) {
      showNotice(err.message || 'Error al eliminar landing')
    }
  }

  function loadLandingForEdit(landing) {
    setLandingForm({
      name: landing.name || '',
      prompt: landing.prompt || '',
      style_preset: landing.style_preset || 'dark_premium',
      logo_url: landing.logo_url || '',
      favicon_url: landing.favicon_url || '',
      hero_image_url: landing.hero_image_url || '',
      youtube_url: landing.youtube_url || '',
      facebook_pixel_id: landing.facebook_pixel_id || '',
      google_analytics: landing.google_analytics || '',
      primary_color: landing.primary_color || '#2563eb',
      secondary_color: landing.secondary_color || '#0f172a',
      show_video: !!landing.show_video,
      show_image: !!landing.show_image,
      tracking_mode: landing.tracking_mode || 'auto',
      tracking_base_url: landing.tracking_base_url || ''
    })
    setEditingLandingId(landing.id)
    setLandingHTML(landing.html || landing.preview_html || '')
    showNotice('Landing cargada para editar')
  }

  function resetLandingForm() {
    setLandingForm(emptyLanding)
    setEditingLandingId('')
    setLandingHTML('')
  }

  function downloadHTML() {
    if (!landingHTML) return
    const blob = new Blob([landingHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `landing_${landingForm.name || 'sin_nombre'}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ======================== FUNCIONES SOCIAL IA ========================
  async function loadSocialCredential() {
    if (forcePlanScreen) return
    try {
      const data = await api(`/api/social/credentials${selectedClientId ? `?client_id=${selectedClientId}` : ''}`)
      setSocialCredential({ ...emptySocialCredential, ...(data || {}) })
    } catch (err) {
      console.error(err)
      if (err.status === 402) setForcePlanScreen(true)
      setSocialCredential(emptySocialCredential)
    }
  }

  async function saveSocialCredential() {
    try {
      await api('/api/social/credentials', {
        method: 'PUT',
        body: JSON.stringify({
          ...socialCredential,
          client_id: selectedClientId
        })
      })
      showNotice('Credenciales de Facebook guardadas')
      await loadSocialCredential()
    } catch (err) {
      showNotice(err.message || 'Error guardando credenciales')
    }
  }

  async function loadSocialPosts() {
    if (forcePlanScreen) return
    try {
      const data = await api(`/api/social/posts${selectedClientId ? `?client_id=${selectedClientId}` : ''}`)
      setSocialPosts(data || [])
    } catch (err) {
      console.error(err)
      if (err.status === 402) setForcePlanScreen(true)
      setSocialPosts([])
    }
  }

  async function loadSocialLogs() {
    if (forcePlanScreen) return
    try {
      const data = await api(`/api/social/logs${selectedClientId ? `?client_id=${selectedClientId}` : ''}`)
      setSocialLogs(data || [])
    } catch (err) {
      console.error(err)
      if (err.status === 402) setForcePlanScreen(true)
      setSocialLogs([])
    }
  }

  async function createSocialCampaign() {
    if (!socialCampaign.name.trim()) {
      showNotice('Escribe un nombre para la campaña')
      return null
    }
    if (!socialCampaign.prompt.trim()) {
      showNotice('Describe la campaña en el prompt')
      return null
    }
    const payload = {
      ...socialCampaign,
      client_id: selectedClientId,
      recurring_minutes: Number(socialCampaign.recurring_minutes || 0),
      scheduled_at: socialCampaign.publish_mode === 'scheduled' && socialCampaign.scheduled_at
        ? new Date(socialCampaign.scheduled_at).toISOString()
        : null
    }
    try {
      const created = await api('/api/social/campaigns', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      setSocialCampaign({ ...emptySocialCampaign, bot_id: selectedBotId || '' })
      showNotice('Campaña creada')
      return created
    } catch (err) {
      showNotice(err.message || 'Error creando campaña')
      return null
    }
  }

  async function publishSocialNow() {
    if (!selectedClientId) {
      showNotice('Selecciona un cliente primero')
      return
    }
    if (!socialContent.trim()) {
      showNotice('Primero genera el contenido')
      return
    }
    if (socialCampaign.image_mode === 'ai' && !socialImageURL) {
      showNotice('Genera una imagen IA primero o selecciona otro modo de imagen')
      return
    }
    if (socialCampaign.objective === 'whatsapp' && !socialCampaign.bot_id) {
      showNotice('Selecciona un bot para enviar a WhatsApp')
      return
    }
    if (socialCampaign.objective === 'landing' && !socialCampaign.landing_id) {
      showNotice('Selecciona una landing')
      return
    }
    if (socialCampaign.objective === 'manual_link' && !socialCampaign.manual_link_url.trim()) {
      showNotice('Debes escribir un link manual')
      return
    }

    const campaign = await createSocialCampaign()
    if (!campaign) return

    const finalImageURL = socialCampaign.image_mode === 'manual'
      ? socialCampaign.manual_image_url
      : socialCampaign.image_mode === 'ai'
        ? socialImageURL
        : ''
    const finalContent = htmlToPlainText(socialContent)

    setSocialActionLoading(true)
    setSocialActionStep(20)
    setSocialActionText('Preparando contenido y assets...')
    try {
      setSocialActionStep(45)
      setSocialActionText('Conectando con Facebook...')
      await api(`/api/social/publish-now${selectedClientId ? `?client_id=${selectedClientId}` : ''}`, {
        method: 'POST',
        body: JSON.stringify({
          campaign_id: campaign.id,
          content: finalContent,
          image_url: finalImageURL,
          image_mode: socialCampaign.image_mode,
          image_prompt: socialCampaign.image_prompt || socialImagePrompt,
          objective: socialCampaign.objective,
          bot_id: socialCampaign.bot_id,
          landing_id: socialCampaign.landing_id,
          manual_link: socialCampaign.manual_link_url
        })
      })
      setSocialActionStep(100)
      setSocialActionText('Publicación enviada correctamente')
      showNotice('Publicación enviada a Facebook')
      await loadSocialPosts()
      await loadSocialLogs()
    } catch (err) {
      showNotice(err.message || 'Error publicando en Facebook')
    } finally {
      setTimeout(() => {
        setSocialActionLoading(false)
        setSocialActionStep(0)
        setSocialActionText('')
      }, 700)
    }
  }

  async function scheduleSocialPost() {
    if (!selectedClientId) {
      showNotice('Selecciona un cliente primero')
      return
    }
    if (!socialContent.trim()) {
      showNotice('Primero genera el contenido')
      return
    }
    if (socialCampaign.image_mode === 'ai' && !socialImageURL) {
      showNotice('Genera una imagen IA primero o selecciona otro modo de imagen')
      return
    }
    if (socialCampaign.objective === 'whatsapp' && !socialCampaign.bot_id) {
      showNotice('Selecciona un bot para enviar a WhatsApp')
      return
    }
    if (socialCampaign.objective === 'landing' && !socialCampaign.landing_id) {
      showNotice('Selecciona una landing')
      return
    }
    if (socialCampaign.objective === 'manual_link' && !socialCampaign.manual_link_url.trim()) {
      showNotice('Debes escribir un link manual')
      return
    }

    const campaign = await createSocialCampaign()
    if (!campaign) return

    if (socialCampaign.publish_mode === 'scheduled' && !socialCampaign.scheduled_at) {
      showNotice('Debes indicar fecha y hora de publicación')
      return
    }
    if (socialCampaign.publish_mode === 'recurring' && !socialCampaign.recurring_minutes) {
      showNotice('Debes indicar cada cuántos minutos publicar')
      return
    }

    const finalImageURL = socialCampaign.image_mode === 'manual'
      ? socialCampaign.manual_image_url
      : socialCampaign.image_mode === 'ai'
        ? socialImageURL
        : ''
    const finalContent = htmlToPlainText(socialContent)

    setSocialActionLoading(true)
    setSocialActionStep(20)
    setSocialActionText('Preparando programación...')
    try {
      setSocialActionStep(50)
      setSocialActionText('Guardando job y publicación...')
      await api(`/api/social/schedule${selectedClientId ? `?client_id=${selectedClientId}` : ''}`, {
        method: 'POST',
        body: JSON.stringify({
          campaign_id: campaign.id,
          content: finalContent,
          image_url: finalImageURL,
          image_mode: socialCampaign.image_mode,
          image_prompt: socialCampaign.image_prompt || socialImagePrompt,
          objective: socialCampaign.objective,
          bot_id: socialCampaign.bot_id,
          landing_id: socialCampaign.landing_id,
          manual_link: socialCampaign.manual_link_url,
          publish_mode: socialCampaign.publish_mode,
          recurring_minutes: Number(socialCampaign.recurring_minutes || 0),
          scheduled_at: socialCampaign.scheduled_at ? new Date(socialCampaign.scheduled_at).toISOString() : null,
          days_of_week: socialCampaign.days_of_week
        })
      })
      setSocialActionStep(100)
      setSocialActionText('Programación creada correctamente')
      showNotice('Publicación programada correctamente')
      await loadSocialPosts()
      await loadSocialLogs()
    } catch (err) {
      showNotice(err.message || 'Error programando publicación')
    } finally {
      setTimeout(() => {
        setSocialActionLoading(false)
        setSocialActionStep(0)
        setSocialActionText('')
      }, 700)
    }
  }

  async function generateSocial() {
    if (!socialCampaign.prompt.trim()) {
      showNotice('Describe la campaña primero')
      return
    }
    setSocialLoading(true)
    setSocialLoadingStep(10)
    setSocialLoadingText('Analizando campaña social...')
    const progress = [
      { step: 25, text: 'Definiendo copy y propuesta de valor...' },
      { step: 45, text: 'Construyendo CTA y estructura de publicación...' },
      { step: 65, text: 'Preparando versión lista para Facebook...' },
      { step: 85, text: 'Finalizando contenido...' }
    ]
    let idx = 0
    const interval = setInterval(() => {
      if (idx < progress.length) {
        setSocialLoadingStep(progress[idx].step)
        setSocialLoadingText(progress[idx].text)
        idx++
      }
    }, 1300)
    try {
      const res = await api('/api/social/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: socialCampaign.prompt,
          name: socialCampaign.name,
          bot_id: socialCampaign.bot_id,
          landing_id: socialCampaign.landing_id,
          objective: socialCampaign.objective
        })
      })
      clearInterval(interval)
      setSocialContent(res.content || '')
      setSocialLoadingStep(100)
      setSocialLoadingText('Contenido generado correctamente')
      showNotice('Contenido generado correctamente')
    } catch (err) {
      clearInterval(interval)
      showNotice(err.message || 'Error al generar contenido')
    } finally {
      setTimeout(() => {
        setSocialLoading(false)
        setSocialLoadingText('')
        setSocialLoadingStep(0)
      }, 700)
    }
  }

  async function generateSocialImage() {
    if (!socialImagePrompt.trim()) {
      showNotice('Describe la imagen que quieres generar')
      return
    }
    setSocialImageLoading(true)
    try {
      const res = await api('/api/social/generate-image', {
        method: 'POST',
        body: JSON.stringify({ prompt: socialImagePrompt })
      })
      const imageURL = res.image_url || ''
      const resolvedURL = resolveMediaURL(imageURL)
      setSocialImageURL(resolvedURL)
      setSocialCampaign(prev => ({
        ...prev,
        image_mode: 'ai',
        image_prompt: socialImagePrompt
      }))
      showNotice('Imagen IA generada correctamente')
    } catch (err) {
      showNotice(err.message || 'Error generando imagen IA')
    } finally {
      setSocialImageLoading(false)
    }
  }

  async function uploadSocialImage(file) {
    if (!file) return
    setSocialUploadLoading(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await api('/api/social/upload-image', {
        method: 'POST',
        body: form
      })
      const imageURL = res.image_url || ''
      const resolvedURL = resolveMediaURL(imageURL)
      setSocialImageURL(resolvedURL)
      setSocialCampaign(prev => ({
        ...prev,
        image_mode: 'manual',
        manual_image_url: resolvedURL,
        image_prompt: ''
      }))
      showNotice('Imagen subida correctamente')
    } catch (err) {
      showNotice(err.message || 'Error subiendo imagen')
    } finally {
      setSocialUploadLoading(false)
    }
  }

  // ======================== EFECTOS Y CARGA INICIAL ========================
  useEffect(() => {
    if (!selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0].id)
    }
  }, [clients, selectedClientId])

  useEffect(() => setBotPage(1), [searchBot])
  useEffect(() => setLeadPage(1), [searchLead])
  useEffect(() => setTemplatePage(1), [searchTemplate])
  useEffect(() => setClientPage(1), [searchClient])
  useEffect(() => setUserPage(1), [searchUser])

  useEffect(() => {
    bootstrap()
  }, [])

  useEffect(() => {
    if (me && !forcePlanScreen) loadInitial()
  }, [me, forcePlanScreen])

  useEffect(() => {
    if (!me || !selectedClientId || forcePlanScreen) return
    loadMetrics()
    loadBots(selectedClientId)
    loadTemplates()
    loadUsers()
    loadInboxLeads()
    loadLandings()
    loadFunnelMetrics()
    loadSocialCredential()
    loadSocialPosts()
    loadSocialLogs()
  }, [selectedClientId, forcePlanScreen])

  // Período de refresco automático (30s) – evita actualizaciones cuando estás en la pestaña Ads
  useEffect(() => {
    const t = setInterval(async () => {
      if (!me || forcePlanScreen) return

      if (tab === 'ads') return

      if (tab === 'dashboard') {
        await loadMetrics()
        if (me.role === 'admin') {
          await loadClients()
          await loadUsers()
        }
        return
      }

      if (tab === 'inbox') {
        await loadInboxLeads()
        return
      }

      if (tab === 'bots') {
        if (selectedClientId) await loadBots(selectedClientId)
        if (selectedBotId) await loadQr(selectedBotId)
        return
      }

      if (tab === 'templates') {
        await loadTemplates()
        return
      }

      if (tab === 'landing') {
        await loadLandings()
        return
      }

      if (tab === 'funnel') {
        await loadFunnelMetrics()
        return
      }

      if (tab === 'social') {
        await loadSocialCredential()
        await loadSocialPosts()
        await loadSocialLogs()
        return
      }
    }, 30000)

    return () => clearInterval(t)
  }, [me, tab, selectedClientId, selectedBotId, forcePlanScreen])

  useEffect(() => {
    if (!selectedBotId) {
      setQrDataUrlBot('')
      setConfig(emptyConfig)
      return
    }

    if (tab !== 'bots') return

    loadQr(selectedBotId)
    loadConfig(selectedBotId)
  }, [selectedBotId, tab])

  useEffect(() => {
    if (selectedLead?.bot_id && selectedLead?.id) {
      loadMessages(selectedLead.bot_id, selectedLead.id)
    } else {
      setMessages([])
    }
  }, [selectedLeadId, selectedLead])

  async function loadInitial() {
    await loadClients()
    await loadTemplates()
    await loadUsers()
    await loadMetrics()
    await loadFunnelMetrics()
    await loadInboxLeads()
    await loadLandings()
  }

  async function loadMetrics() {
    if (forcePlanScreen) return
    try {
      const data = await api(`/api/dashboard/metrics${selectedClientId ? `?client_id=${selectedClientId}` : ''}`)
      setMetrics(data)
    } catch (err) { 
      console.error(err)
      if (err.status === 402) setForcePlanScreen(true)
    }
  }

  async function loadClients() {
    if (forcePlanScreen) return
    try {
      if (me?.role === 'admin') {
        const data = await api('/api/clients')
        setClients(data)
        const cid = selectedClientId || data[0]?.id || ''
        setSelectedClientId(cid)
        if (cid) await loadBots(cid)
      } else {
        const cid = me.client_id
        setSelectedClientId(cid)
        setClients([{
          id: cid,
          name: 'Mi cuenta',
          plan: subscription?.plan_slug || '',
          status: subscription?.status || 'pending'
        }])
        if (cid) await loadBots(cid)
      }
    } catch (err) { 
      console.error(err)
      if (err.status === 402) setForcePlanScreen(true)
    }
  }

  async function loadUsers() {
    if (forcePlanScreen) return
    try {
      const path = me?.role === 'admin' ? '/api/users' : `/api/users?client_id=${me?.client_id || ''}`
      const data = await api(path)
      setUsers(data)
    } catch (err) { 
      console.error(err)
      if (err.status === 402) setForcePlanScreen(true)
    }
  }

  async function loadBots(clientId) {
    if (forcePlanScreen) return
    const cid = clientId || selectedClientId
    if (!cid) { setBots([]); return }
    try {
      const data = await api(`/api/bots?client_id=${cid}`)
      setBots(data)
      if (selectedBotId && !data.find(x => x.id === selectedBotId)) {
        setSelectedBotId('')
        setQrDataUrlBot('')
        setConfig(emptyConfig)
      }
    } catch (err) { 
      console.error(err)
      if (err.status === 402) setForcePlanScreen(true)
    }
  }

  async function loadTemplates() {
    if (forcePlanScreen) return
    try {
      const data = await api(`/api/templates${selectedClientId ? `?client_id=${selectedClientId}` : ''}`)
      setTemplates(data)
    } catch (err) { 
      console.error(err)
      if (err.status === 402) setForcePlanScreen(true)
    }
  }

  async function loadConfig(botId) {
    if (!botId) { setConfig(emptyConfig); return }
    try {
      const data = await api(`/api/bots/${botId}/config`)
      setConfig({ ...emptyConfig, ...data })
    } catch (err) { console.error(err) }
  }

  async function loadQr(botId) {
    if (!botId) { setQrDataUrlBot(''); return }
    try {
      const data = await api(`/api/bots/${botId}/qr`)
      setQrDataUrlBot(data.qr ? await QRCode.toDataURL(data.qr) : '')
    } catch (err) { setQrDataUrlBot('') }
  }

  async function loadInboxLeads() {
    if (forcePlanScreen) return
    try {
      const params = new URLSearchParams()
      if (selectedClientId) params.set('client_id', selectedClientId)
      if (selectedBotId) params.set('bot_id', selectedBotId)
      const data = await api(`/api/inbox/leads${params.toString() ? `?${params.toString()}` : ''}`)
      setLeads(data)
      if (selectedLeadId && !data.find(x => x.id === selectedLeadId)) {
        setSelectedLeadId(null)
        setMessages([])
      }
    } catch (err) { 
      console.error(err)
      if (err.status === 402) setForcePlanScreen(true)
    }
  }

  async function loadMessages(botId, leadId) {
    if (!botId || !leadId) { setMessages([]); return }
    try {
      const data = await api(`/api/bots/${botId}/leads/${leadId}/messages`)
      setMessages(data)
    } catch (err) { setMessages([]) }
  }

  async function createClient(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const created = await api('/api/clients', { method: 'POST', body: JSON.stringify(newClient) })
      setNewClient({ name: '', email: '', phone: '', plan: 'pro' })
      await loadClients()
      if (created?.id) setSelectedClientId(created.id)
      showNotice('Cliente creado')
    } catch (err) { showNotice(err.message || 'Error') }
    finally { setBusy(false) }
  }

  async function createUser(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/api/users', { method: 'POST', body: JSON.stringify({ ...newUser, client_id: newUser.client_id || selectedClientId }) })
      setNewUser({ client_id: selectedClientId, name: '', email: '', password: '', role: 'client_admin' })
      await loadUsers()
      showNotice('Usuario creado')
    } catch (err) { showNotice(err.message || 'Error') }
    finally { setBusy(false) }
  }

  async function deleteUser(id) {
    if (!window.confirm('Eliminar usuario?')) return
    try {
      await api(`/api/users/${id}`, { method: 'DELETE' })
      await loadUsers()
      showNotice('Usuario eliminado')
    } catch (err) { showNotice(err.message || 'Error') }
  }

  async function createBot(e) {
    e.preventDefault()
    const clientId = selectedClientId || clients[0]?.id || ''
    if (!clientId) return showNotice('Selecciona un cliente')
    if (!newBotName.trim()) return showNotice('Escribe un nombre')
    setBusy(true)
    try {
      const created = await api('/api/bots', { method: 'POST', body: JSON.stringify({ client_id: clientId, name: newBotName.trim() }) })
      setNewBotName('')
      await loadBots(clientId)
      if (created?.id) setSelectedBotId(created.id)
      showNotice('Bot creado')
    } catch (err) { showNotice(err.message || 'Error') }
    finally { setBusy(false) }
  }

  async function startBot() {
    if (!selectedBotId) return showNotice('Selecciona un bot')
    setBusy(true)
    try {
      await api(`/api/bots/${selectedBotId}/start`, { method: 'POST' })
      await loadBots(selectedClientId)
      await loadQr(selectedBotId)
      showNotice('Bot iniciado')
    } catch (err) { showNotice(err.message || 'Error') }
    finally { setBusy(false) }
  }

  async function stopBot(botId) {
    if (!botId) return
    setBusy(true)
    try {
      await api(`/api/bots/${botId}/stop`, { method: 'POST' })
      if (selectedBotId === botId) setQrDataUrlBot('')
      await loadBots(selectedClientId)
      showNotice('Bot apagado')
    } catch (err) { showNotice(err.message || 'Error') }
    finally { setBusy(false) }
  }

  async function renameBot(bot) {
    const name = prompt('Nuevo nombre:', bot.name || '')
    if (!name?.trim()) return
    setBusy(true)
    try {
      await api(`/api/bots/${bot.id}`, { method: 'PUT', body: JSON.stringify({ name: name.trim() }) })
      await loadBots(selectedClientId)
      showNotice('Bot actualizado')
    } catch (err) { showNotice(err.message || 'Error') }
    finally { setBusy(false) }
  }

  async function deleteBot(bot) {
    if (!window.confirm(`¿Eliminar "${bot.name}"?`)) return
    setBusy(true)
    try {
      await api(`/api/bots/${bot.id}`, { method: 'DELETE' })
      if (selectedBotId === bot.id) {
        setSelectedBotId('')
        setQrDataUrlBot('')
        setConfig(emptyConfig)
      }
      await loadBots(selectedClientId)
      showNotice('Bot eliminado')
    } catch (err) { showNotice(err.message || 'Error') }
    finally { setBusy(false) }
  }

  async function saveConfig(e) {
    e.preventDefault()
    if (!selectedBotId) return showNotice('Selecciona un bot')
    setBusy(true)
    try {
      const updated = await api(`/api/bots/${selectedBotId}/config`, {
        method: 'PUT',
        body: JSON.stringify({
          ...config,
          temperature: Number(config.temperature),
          followup_delay_mins: Number(config.followup_delay_mins),
          followup_enabled: !!config.followup_enabled,
          reply_mode: config.reply_mode || 'manual',
          template_id: config.template_id || ''
        })
      })
      setConfig({ ...emptyConfig, ...updated })
      showNotice('Configuración guardada')
    } catch (err) { showNotice(err.message || 'Error') }
    finally { setBusy(false) }
  }

  async function sendManual(e) {
    e.preventDefault()
    if (!selectedBotId) return showNotice('Selecciona un bot')
    setBusy(true)
    try {
      await api(`/api/bots/${selectedBotId}/send`, { method: 'POST', body: JSON.stringify({ number: sendNumber, message: sendMessage }) })
      showNotice('Mensaje enviado')
    } catch (err) { showNotice(err.message || 'Error') }
    finally { setBusy(false) }
  }

  async function updateLeadStage(lead) {
    const stage = prompt('Nuevo stage:', lead.stage || 'new')
    if (!stage || !lead?.bot_id) return
    try {
      await api(`/api/bots/${lead.bot_id}/leads/${lead.id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) })
      await loadInboxLeads()
      showNotice('Stage actualizado')
    } catch (err) { showNotice(err.message || 'Error') }
  }

  async function sendLeadMessage(e) {
    e.preventDefault()
    if (!selectedLead?.id || !selectedLead?.bot_id || !chatMessage.trim()) return
    try {
      await api(`/api/bots/${selectedLead.bot_id}/leads/${selectedLead.id}/send`, { method: 'POST', body: JSON.stringify({ message: chatMessage }) })
      setChatMessage('')
      await loadMessages(selectedLead.bot_id, selectedLead.id)
      await loadInboxLeads()
      showNotice('Mensaje enviado')
    } catch (err) { showNotice(err.message || 'Error') }
  }

  async function createTemplate(e) {
    e.preventDefault()
    try {
      const body = { ...templateForm, client_id: me.role === 'admin' ? selectedClientId || '' : me.client_id }
      await api('/api/templates', { method: 'POST', body: JSON.stringify(body) })
      setTemplateForm(emptyTemplate)
      await loadTemplates()
      showNotice('Plantilla creada')
    } catch (err) { showNotice(err.message || 'Error') }
  }

  async function logout() {
    setToken('')
    setMe(null)
    setForcePlanScreen(false)
    setShowInvoice(false)
    setSelectedPlan(null)
  }

  const leadsByStageGlobal = useMemo(() => {
    const stages = ['new', 'qualified', 'interested', 'hot', 'closed']
    const counts = stages.map(s => leads.filter(l => l.stage === s).length)
    return { stages, counts }
  }, [leads])

  const messagesLast7Days = useMemo(() => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const counts = [12, 19, 15, 22, 27, 18, 24]
    return { days, counts }
  }, [])

  // ========== RENDER PRINCIPAL ==========
  if (!me) return <LoginScreen onAuth={(user) => {
    setMe(user)
    if (user.role !== 'admin') setForcePlanScreen(true)
  }} />

  if (forcePlanScreen && me.role !== 'admin') {
    return (
      <PlanGate
        plans={plans}
        billingCycle={billingCycle}
        setBillingCycle={setBillingCycle}
        selectPlan={selectPlan}
        showInvoice={showInvoice}
        selectedPlan={selectedPlan}
        subscription={subscription}
        paymentTxHash={paymentTxHash}
        setPaymentTxHash={setPaymentTxHash}
        submitPlanPayment={submitPlanPayment}
        cancelInvoice={cancelInvoice}
        paymentQR={paymentQR}
        me={me}
        onLogout={logout}
      />
    )
  }

  // ========== PANEL PRINCIPAL ==========
  return (
    <div className="app-shell">
      {landingLoading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="loading-title">Generando landing premium</div>
            <div className="loading-subtitle">{landingLoadingText || 'Procesando...'}</div>
            <div className="loading-bar">
              <div className="loading-bar-fill" style={{ width: `${landingLoadingStep}%` }} />
            </div>
            <div className="loading-meta">
              <span>{landingLoadingStep}%</span>
              <span>IA + render preview</span>
            </div>
          </div>
        </div>
      )}

      {socialLoading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="loading-title">Generando campaña social</div>
            <div className="loading-subtitle">{socialLoadingText || 'Procesando...'}</div>
            <div className="loading-bar">
              <div className="loading-bar-fill" style={{ width: `${socialLoadingStep}%` }} />
            </div>
            <div className="loading-meta">
              <span>{socialLoadingStep}%</span>
              <span>IA + contenido Facebook</span>
            </div>
          </div>
        </div>
      )}

      {(socialImageLoading || socialActionLoading) && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="loading-title">
              {socialImageLoading ? 'Generando imagen IA' : 'Procesando publicación'}
            </div>
            <div className="loading-subtitle">
              {socialImageLoading
                ? 'Creando creatividad visual para la campaña...'
                : (socialActionText || 'Conectando con Facebook y procesando...')}
            </div>
            <div className="loading-bar">
              <div
                className="loading-bar-fill"
                style={{
                  width: `${socialImageLoading ? 75 : socialActionStep}%`
                }}
              />
            </div>
            <div className="loading-meta">
              <span>{socialImageLoading ? '75%' : `${socialActionStep}%`}</span>
              <span>{socialImageLoading ? 'OpenAI Images' : 'Social Publisher'}</span>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-notice">{toast}</div>}
      <aside className="left-rail">
        <div className="user-profile">
          <div className="user-avatar"><i className="fas fa-user-circle"></i></div>
          <div className="user-name">{me.name}</div>
          <div className="user-role">{me.role === 'admin' ? 'Administrador' : 'Cliente'}</div>
          <div className="user-email">{me.email}</div>
        </div>

        {me?.role !== 'admin' && (
          <div className="stripe-card" style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.75rem' }}>
            <div><strong>Plan actual:</strong> {subscription?.plan_slug || 'Sin plan'}</div>
            <div className="muted">Estado: {subscription?.status || 'pendiente'}</div>
            <button type="button" onClick={() => setForcePlanScreen(true)} style={{ marginTop: '0.75rem' }}>
              Mejorar plan
            </button>
          </div>
        )}

        <nav className="menu">
          <button className={tab === 'dashboard' ? 'menu-item active' : 'menu-item'} onClick={() => setTab('dashboard')} type="button">
            <i className="fas fa-tachometer-alt"></i> Dashboard
          </button>
          <button className={tab === 'inbox' ? 'menu-item active' : 'menu-item'} onClick={() => setTab('inbox')} type="button">
            <i className="fas fa-inbox"></i> Inbox
          </button>
          <button className={tab === 'bots' ? 'menu-item active' : 'menu-item'} onClick={() => setTab('bots')} type="button">
            <i className="fas fa-robot"></i> Bots
          </button>
          <button className={tab === 'templates' ? 'menu-item active' : 'menu-item'} onClick={() => setTab('templates')} type="button">
            <i className="fas fa-file-alt"></i> Plantillas
          </button>
          <button className={tab === 'landing' ? 'menu-item active' : 'menu-item'} onClick={() => setTab('landing')} type="button">
            <i className="fas fa-brain"></i> Landing IA
          </button>
          <button className={tab === 'funnel' ? 'menu-item active' : 'menu-item'} onClick={() => setTab('funnel')} type="button">
            <i className="fas fa-filter"></i> Funnel
          </button>
          <button className={tab === 'social' ? 'menu-item active' : 'menu-item'} onClick={() => setTab('social')} type="button">
            <i className="fas fa-share-alt"></i> Social IA
          </button>
          <button className={tab === 'ads' ? 'menu-item active' : 'menu-item'} onClick={() => setTab('ads')} type="button">
            <i className="fas fa-chart-line"></i> Ads IA
          </button>
          {me.role === 'admin' && (
            <>
              <button className={tab === 'clients' ? 'menu-item active' : 'menu-item'} onClick={() => setTab('clients')} type="button">
                <i className="fas fa-building"></i> Clientes
              </button>
              <button className={tab === 'users' ? 'menu-item active' : 'menu-item'} onClick={() => setTab('users')} type="button">
                <i className="fas fa-users"></i> Usuarios
              </button>
              <button className={tab === 'billing' ? 'menu-item active' : 'menu-item'} onClick={() => { setTab('billing'); loadPendingSubscriptions(); }} type="button">
                <i className="fas fa-credit-card"></i> Billing
              </button>
            </>
          )}
        </nav>
        <button className="secondary" onClick={logout} type="button">
          <i className="fas fa-sign-out-alt"></i> Cerrar sesión
        </button>
      </aside>

      <main className="main-pane">
        <header className="topbar stripe-card">
          <div>
            <div className="eyebrow">Cuenta activa</div>
            <h2>{selectedClient?.name || 'Sin cliente seleccionado'}</h2>
          </div>
          <div className="top-actions">
            {me.role === 'admin' && (
              <select value={selectedClientId || ''} onChange={(e) => { setSelectedClientId(e.target.value); setSelectedBotId(''); setSelectedLeadId(null); setMessages([]); setQrDataUrlBot('') }}>
                <option value="">Selecciona un cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
        </header>

        {/* ======================== DASHBOARD ======================== */}
        {tab === 'dashboard' && (
          <section className="stack gap-lg">
            <div className="metric-grid">
              {[
                ['Clientes', metrics.clients], ['Bots', metrics.bots], ['Leads', metrics.leads],
                ['Hot leads', metrics.hot_leads], ['Cerrados', metrics.closed_leads], ['Mensajes 24h', metrics.messages_24h]
              ].map(([label, v]) => (
                <div className="stripe-card metric" key={label}>
                  <div className="metric-label">{label}</div>
                  <div className="metric-value">{v ?? 0}</div>
                </div>
              ))}
            </div>
            <div className="stripe-card">
              <div className="chart-container">
                <div className="chart">
                  <div className="chart-title">Leads por etapa</div>
                  <div className="bar-container">
                    {leadsByStageGlobal.stages.map((stage, idx) => (
                      <div key={stage} className="bar-item">
                        <div className="bar-label">{stage}</div>
                        <div className="bar-fill" style={{ width: `${Math.min(100, leadsByStageGlobal.counts[idx] * 5)}%`, maxWidth: '100%' }}></div>
                        <div className="bar-value">{leadsByStageGlobal.counts[idx]}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="chart">
                  <div className="chart-title">Mensajes últimos 7 días</div>
                  <div className="bar-container">
                    {messagesLast7Days.days.map((day, idx) => (
                      <div key={day} className="bar-item">
                        <div className="bar-label">{day}</div>
                        <div className="bar-fill" style={{ width: `${Math.min(100, messagesLast7Days.counts[idx] * 2)}%`, maxWidth: '100%' }}></div>
                        <div className="bar-value">{messagesLast7Days.counts[idx]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="panel-grid">
              <section className="stripe-card stack">
                <div className="row between center">
                  <div className="section-title"><i className="fas fa-plug"></i> Bots activos</div>
                  <div className="row gap-sm">
                    <input type="text" placeholder="Buscar bot..." className="search-input" value={searchBot} onChange={e => setSearchBot(e.target.value)} />
                    <span className="pill connected">{filteredActiveBots.length}</span>
                  </div>
                </div>
                <form onSubmit={createBot} className="row gap-sm">
                  <input className="grow" value={newBotName} onChange={e => setNewBotName(e.target.value)} placeholder="Nombre del bot" />
                  <button disabled={busy || !selectedClientId}>Crear bot</button>
                </form>
                <div className="list two-col">
                  {paginatedActiveBots.map(bot => (
                    <div key={bot.id} className="bot-card active" onClick={() => setSelectedBotId(bot.id)}>
                      <strong>{bot.name}</strong> <span>{bot.status}</span>
                      <small>{bot.phone || 'Sin número'}</small>
                      <div className="row gap-sm" onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={() => renameBot(bot)}>Editar</button>
                        <button type="button" className="secondary" onClick={() => stopBot(bot.id)}>Apagar</button>
                        <button type="button" className="danger tiny-btn" onClick={() => deleteBot(bot)}>Eliminar</button>
                      </div>
                    </div>
                  ))}
                  {paginatedActiveBots.length === 0 && <div className="empty-box">No hay bots activos</div>}
                </div>
                <div className="pagination">
                  <button type="button" onClick={() => setBotPage(p => Math.max(1, p-1))} disabled={botPage === 1}>Anterior</button>
                  <span>Página {botPage}</span>
                  <button type="button" onClick={() => setBotPage(p => p+1)} disabled={botPage * pageSize >= filteredActiveBots.length}>Siguiente</button>
                </div>
              </section>

              <section className="stripe-card stack">
                <div className="row between center">
                  <div className="section-title"><i className="fas fa-power-off"></i> Bots inactivos</div>
                  <span className="pill disconnected">{filteredInactiveBots.length}</span>
                </div>
                <div className="list two-col">
                  {paginatedInactiveBots.map(bot => (
                    <div key={bot.id} className="bot-card" onClick={() => setSelectedBotId(bot.id)}>
                      <strong>{bot.name}</strong> <span>{bot.status}</span>
                      <small>{bot.phone || 'Sin número'}</small>
                      <div className="row gap-sm" onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={async () => { await api(`/api/bots/${bot.id}/start`, { method: 'POST' }); await loadBots(selectedClientId); await loadQr(bot.id); showNotice('Bot encendido') }}>Encender</button>
                        <button type="button" onClick={() => renameBot(bot)}>Editar</button>
                        <button type="button" className="danger tiny-btn" onClick={() => deleteBot(bot)}>Eliminar</button>
                      </div>
                    </div>
                  ))}
                  {paginatedInactiveBots.length === 0 && <div className="empty-box">No hay bots inactivos</div>}
                </div>
                <div className="pagination">
                  <button type="button" onClick={() => setBotPage(p => Math.max(1, p-1))} disabled={botPage === 1}>Anterior</button>
                  <span>Página {botPage}</span>
                  <button type="button" onClick={() => setBotPage(p => p+1)} disabled={botPage * pageSize >= filteredInactiveBots.length}>Siguiente</button>
                </div>
              </section>
            </div>
            <section className="stripe-card stack">
              <div className="row between center">
                <div>
                  <div className="section-title"><i className="fas fa-microchip"></i> Bot seleccionado</div>
                  <p className="muted">{selectedBot ? selectedBot.name : 'Selecciona un bot'}</p>
                </div>
                {selectedBot && (
                  <div className="row gap-sm">
                    {selectedBot.status === 'connected' || selectedBot.status === 'waiting_qr' ? (
                      <button type="button" onClick={() => stopBot(selectedBot.id)} disabled={busy}>Apagar</button>
                    ) : (
                      <button type="button" onClick={startBot} disabled={busy}>Encender</button>
                    )}
                    <button type="button" onClick={() => renameBot(selectedBot)} disabled={busy}>Editar</button>
                  </div>
                )}
              </div>
              {selectedBot ? (
                <>
                  <div className="status-row"><strong>{selectedBot.name}</strong> <span className={`pill ${selectedBot.status}`}>{selectedBot.status}</span></div>
                  {qrDataUrlBot ? <img className="qr" src={qrDataUrlBot} alt="QR" /> : <div className="empty-box">Sin QR pendiente</div>}
                  <div className="metric-grid" style={{ marginTop: '1rem' }}>
                    <div className="metric"><div className="metric-label">Total leads</div><div className="metric-value">{leads.filter(l => l.bot_id === selectedBot.id).length}</div></div>
                    <div className="metric"><div className="metric-label">Conversaciones activas</div><div className="metric-value">{leads.filter(l => l.bot_id === selectedBot.id && l.stage !== 'closed').length}</div></div>
                    <div className="metric"><div className="metric-label">Tasa cierre</div><div className="metric-value">{Math.round((leads.filter(l => l.bot_id === selectedBot.id && l.stage === 'closed').length / (leads.filter(l => l.bot_id === selectedBot.id).length || 1)) * 100)}%</div></div>
                  </div>
                  <div className="chart" style={{ marginTop: '0.5rem' }}>
                    <div className="chart-title">Leads por etapa (este bot)</div>
                    <div className="bar-container">
                      {botLeadsByStage.stages.map((stage, idx) => (
                        <div key={stage} className="bar-item">
                          <div className="bar-label">{stage}</div>
                          <div className="bar-fill" style={{ width: `${Math.min(100, botLeadsByStage.counts[idx] * 10)}%`, maxWidth: '100%' }}></div>
                          <div className="bar-value">{botLeadsByStage.counts[idx]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : <div className="empty-box">Selecciona un bot</div>}
            </section>
          </section>
        )}

        {/* ======================== INBOX ======================== */}
        {tab === 'inbox' && (
          <section className="inbox-layout">
            <section className="stripe-card inbox-list">
              <div className="row between center">
                <div className="section-title"><i className="fas fa-envelope"></i> Inbox</div>
                <div className="row gap-sm">
                  <input type="text" placeholder="Buscar lead..." className="search-input" value={searchLead} onChange={e => setSearchLead(e.target.value)} />
                  <select value={selectedClientId || ''} onChange={e => setSelectedClientId(e.target.value)}>
                    <option value="">Cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={selectedBotId || ''} onChange={e => setSelectedBotId(e.target.value)}>
                    <option value="">Todos los bots</option>
                    {bots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <button type="button" onClick={() => loadInboxLeads()}>Filtrar</button>
                </div>
              </div>
              <div className="chat-list">
                {paginatedLeads.map(lead => (
                  <button key={`${lead.bot_id}-${lead.id}`} className={selectedLeadId === lead.id ? 'chat-item active' : 'chat-item'} onClick={() => setSelectedLeadId(lead.id)} type="button">
                    <div className="row between"><strong>{lead.display_name || lead.phone}</strong><span className={`pill ${lead.stage}`}>{lead.stage}</span></div>
                    <div className="muted tiny">{lead.client_name} · {lead.bot_name}</div>
                    <div className="muted preview">{lead.last_inbound_text}</div>
                  </button>
                ))}
                {paginatedLeads.length === 0 && <div className="empty-box">No hay leads</div>}
              </div>
              <div className="pagination">
                <button type="button" onClick={() => setLeadPage(p => Math.max(1, p-1))} disabled={leadPage === 1}>Anterior</button>
                <span>Página {leadPage}</span>
                <button type="button" onClick={() => setLeadPage(p => p+1)} disabled={leadPage * pageSize >= filteredLeads.length}>Siguiente</button>
              </div>
            </section>

            <section className="stripe-card inbox-chat">
              <div className="row between center">
                <div><div className="section-title">Conversación</div><p className="muted">{selectedLead ? `${selectedLead.client_name} · ${selectedLead.bot_name} · ${selectedLead.phone}` : 'Selecciona un lead'}</p></div>
                {selectedLead && <button type="button" onClick={() => updateLeadStage(selectedLead)}>Cambiar stage</button>}
              </div>
              <div className="messages">
                {messages.map(m => <div key={m.id} className={m.direction === 'outbound' ? 'bubble outbound' : 'bubble inbound'}><div>{m.content}</div><small>{new Date(m.created_at).toLocaleString()}</small></div>)}
              </div>
              <form onSubmit={sendLeadMessage} className="chat-compose">
                <textarea rows={3} value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Escribe una respuesta manual..." />
                <button type="submit">Enviar</button>
              </form>
            </section>

            <section className="stripe-card inbox-side">
              <div className="section-title">Perfil lead</div>
              {selectedLead ? (
                <div className="stack">
                  <div><strong>Cliente</strong><div className="muted">{selectedLead.client_name}</div></div>
                  <div><strong>Bot</strong><div className="muted">{selectedLead.bot_name}</div></div>
                  <div><strong>Intent</strong><div className="muted">{selectedLead.last_intent}</div></div>
                  <div><strong>Resumen</strong><div className="muted">{selectedLead.summary}</div></div>
                  <div><strong>Tags</strong><div className="muted">{selectedLead.tags || '—'}</div></div>
                  <div><strong>Follow-ups</strong><div className="muted">{selectedLead.followup_count}</div></div>
                </div>
              ) : <div className="empty-box">Selecciona un lead</div>}
            </section>
          </section>
        )}

        {/* ======================== BOTS ======================== */}
        {tab === 'bots' && (
          <section className="panel-grid">
            <section className="stripe-card stack">
              <div className="row between center"><div className="section-title"><i className="fas fa-cog"></i> Configuración IA</div><select value={selectedBotId || ''} onChange={e => setSelectedBotId(e.target.value)}><option value="">Selecciona un bot</option>{bots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              <form onSubmit={saveConfig} className="form-grid">
                <input value={config.business_name} onChange={e => setConfig({...config, business_name: e.target.value})} placeholder="Nombre negocio" />
                <input value={config.model} onChange={e => setConfig({...config, model: e.target.value})} placeholder="Modelo" />
                <input value={config.offer} onChange={e => setConfig({...config, offer: e.target.value})} placeholder="Oferta" />
                <input value={config.target_audience} onChange={e => setConfig({...config, target_audience: e.target.value})} placeholder="Público objetivo" />
                <input value={config.tone} onChange={e => setConfig({...config, tone: e.target.value})} placeholder="Tono" />
                <input value={config.human_handoff_phone} onChange={e => setConfig({...config, human_handoff_phone: e.target.value})} placeholder="Teléfono humano" />
                <input value={config.cta_button_text} onChange={e => setConfig({...config, cta_button_text: e.target.value})} placeholder="Texto CTA" />
                <input value={config.cta_link} onChange={e => setConfig({...config, cta_link: e.target.value})} placeholder="Link CTA" />
                <input type="number" value={config.followup_delay_mins} onChange={e => setConfig({...config, followup_delay_mins: Number(e.target.value)})} placeholder="Minutos follow-up" />
                <label className="toggle"><input type="checkbox" checked={config.followup_enabled} onChange={e => setConfig({...config, followup_enabled: e.target.checked})} /> Seguimiento automático</label>
                <select value={config.reply_mode || 'manual'} onChange={e => setConfig({ ...config, reply_mode: e.target.value })}>
                  <option value="manual">IA (modo libre)</option>
                  <option value="template_only">Solo plantilla</option>
                  <option value="template_ai">Plantilla + IA</option>
                </select>
                <select value={config.template_id || ''} onChange={e => setConfig({ ...config, template_id: e.target.value })}>
                  <option value="">Auto (inteligente)</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.stage})
                    </option>
                  ))}
                </select>
                <textarea className="full" rows={3} value={config.business_description} onChange={e => setConfig({...config, business_description: e.target.value})} placeholder="Descripción negocio" />
                <textarea className="full" rows={3} value={config.fallback_message} onChange={e => setConfig({...config, fallback_message: e.target.value})} placeholder="Mensaje fallback" />
                <textarea className="full" rows={7} value={config.system_prompt} onChange={e => setConfig({...config, system_prompt: e.target.value})} placeholder="Prompt del sistema" />
                <button className="full" disabled={busy || !selectedBotId}>Guardar configuración</button>
              </form>
            </section>
            <section className="stripe-card stack"><div className="section-title"><i className="fas fa-paper-plane"></i> Envío manual</div><form onSubmit={sendManual} className="stack"><input value={sendNumber} onChange={e => setSendNumber(e.target.value)} placeholder="573001234567" /><textarea rows={6} value={sendMessage} onChange={e => setSendMessage(e.target.value)} /><button disabled={busy || !selectedBotId}>Enviar mensaje</button></form></section>
          </section>
        )}

        {/* ======================== TEMPLATES ======================== */}
        {tab === 'templates' && (
          <section className="panel-grid">
            <section className="stripe-card stack">
              <div className="row between center"><div className="section-title"><i className="fas fa-file-alt"></i> Plantillas y prompts</div><input type="text" placeholder="Buscar plantilla..." value={searchTemplate} onChange={e => setSearchTemplate(e.target.value)} className="search-input" /></div>
              <form onSubmit={createTemplate} className="form-grid">
                <input value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} placeholder="Nombre" />
                <input value={templateForm.business_type} onChange={e => setTemplateForm({...templateForm, business_type: e.target.value})} placeholder="Tipo negocio" />
                <select value={templateForm.category} onChange={e => setTemplateForm({...templateForm, category: e.target.value})}><option value="sales">sales</option><option value="support">support</option><option value="followup">followup</option></select>
                <select value={templateForm.stage} onChange={e => setTemplateForm({...templateForm, stage: e.target.value})}><option>new</option><option>qualified</option><option>interested</option><option>hot</option><option>closed</option></select>
                <textarea className="full" rows={4} value={templateForm.prompt_snippet} onChange={e => setTemplateForm({...templateForm, prompt_snippet: e.target.value})} placeholder="Snippet de prompt" />
                <textarea className="full" rows={4} value={templateForm.message_template} onChange={e => setTemplateForm({...templateForm, message_template: e.target.value})} placeholder="Mensaje sugerido" />
                <button className="full">Guardar plantilla</button>
              </form>
            </section>
            <section className="stripe-card stack">
              <div className="section-title">Plantillas disponibles</div>
              <div className="template-list">{paginatedTemplates.map(t => <div key={t.id} className="template-card"><div className="row between"><strong>{t.name}</strong><span className="pill">{t.stage}</span></div><div className="muted tiny">{t.business_type} · {t.category}</div><p>{t.message_template}</p></div>)}</div>
              <div className="pagination"><button type="button" onClick={() => setTemplatePage(p => Math.max(1, p-1))} disabled={templatePage === 1}>Anterior</button><span>Página {templatePage}</span><button type="button" onClick={() => setTemplatePage(p => p+1)} disabled={templatePage * pageSize >= filteredTemplates.length}>Siguiente</button></div>
            </section>
          </section>
        )}

        {/* ======================== LANDING IA ======================== */}
        {tab === 'landing' && (
          <section className="stripe-card stack gap-lg">
            <div className="row between center">
              <h3><i className="fas fa-brain"></i> Generador de Landing Pages IA</h3>
              <button type="button" onClick={resetLandingForm} className="secondary">+ Nueva</button>
            </div>
            <select value={selectedBotId} onChange={e => setSelectedBotId(e.target.value)}>
              <option value="">Selecciona un bot</option>
              {bots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <div className="form-grid">
              <input placeholder="Nombre de la landing *" value={landingForm.name} onChange={(e) => setLandingForm({ ...landingForm, name: e.target.value })} />
              <select value={landingForm.style_preset} onChange={(e) => setLandingForm({ ...landingForm, style_preset: e.target.value })}>
                <option value="dark_premium">Dark Premium</option>
                <option value="fintech_conversion">Fintech Conversion</option>
                <option value="corporate_clean">Corporate Clean</option>
                <option value="real_estate_luxury">Real Estate Luxury</option>
                <option value="ecommerce_modern">Ecommerce Modern</option>
              </select>
              <input placeholder="URL del logo" value={landingForm.logo_url} onChange={(e) => setLandingForm({ ...landingForm, logo_url: e.target.value })} />
              <input placeholder="URL del favicon" value={landingForm.favicon_url} onChange={(e) => setLandingForm({ ...landingForm, favicon_url: e.target.value })} />
              <input placeholder="URL imagen principal" value={landingForm.hero_image_url} onChange={(e) => setLandingForm({ ...landingForm, hero_image_url: e.target.value })} />
              <input placeholder="URL video de YouTube" value={landingForm.youtube_url} onChange={(e) => setLandingForm({ ...landingForm, youtube_url: e.target.value })} />
              <input placeholder="Facebook Pixel ID (opcional)" value={landingForm.facebook_pixel_id} onChange={(e) => setLandingForm({ ...landingForm, facebook_pixel_id: e.target.value })} />
              <input placeholder="Google Analytics ID (opcional)" value={landingForm.google_analytics} onChange={(e) => setLandingForm({ ...landingForm, google_analytics: e.target.value })} />
              <select value={landingForm.tracking_mode} onChange={(e) => setLandingForm({ ...landingForm, tracking_mode: e.target.value })}>
                <option value="auto">Tracking automático (mismo dominio)</option>
                <option value="external">Tracking con URL externa</option>
              </select>
              {landingForm.tracking_mode === 'external' && (
                <input placeholder="URL base del backend tracking (ej: http://localhost:8080 o https://panel.midominio.com)" value={landingForm.tracking_base_url} onChange={(e) => setLandingForm({ ...landingForm, tracking_base_url: e.target.value })} />
              )}
              <input type="color" value={landingForm.primary_color} onChange={(e) => setLandingForm({ ...landingForm, primary_color: e.target.value })} />
              <input type="color" value={landingForm.secondary_color} onChange={(e) => setLandingForm({ ...landingForm, secondary_color: e.target.value })} />
            </div>
            <div className="row gap-sm">
              <label className="toggle"><input type="checkbox" checked={!!landingForm.show_video} onChange={(e) => setLandingForm({ ...landingForm, show_video: e.target.checked })} /> Incluir video principal</label>
              <label className="toggle"><input type="checkbox" checked={!!landingForm.show_image} onChange={(e) => setLandingForm({ ...landingForm, show_image: e.target.checked })} /> Incluir imagen destacada</label>
            </div>
            <textarea rows={5} placeholder="Describe la landing en detalle (producto, beneficios, llamado a la acción...)" value={landingForm.prompt} onChange={(e) => setLandingForm({ ...landingForm, prompt: e.target.value })} />
            <div className="row gap-sm">
              <button type="button" onClick={generateLanding} disabled={busy || landingLoading}>{landingLoading ? 'Generando...' : 'Generar con IA'}</button>
              {editingLandingId && <button type="button" onClick={saveLandingChanges} disabled={busy} className="secondary">Guardar cambios</button>}
              {landingHTML && <button type="button" onClick={downloadHTML} className="secondary">Descargar HTML</button>}
            </div>
            {landingHTML && <iframe id="landing-preview" title="Landing Preview" style={{ width: "100%", height: "600px", border: "1px solid #ccc", borderRadius: "0.75rem" }} srcDoc={landingHTML} />}
            {landings.length > 0 && (
              <div>
                <div className="section-title">Landings guardadas</div>
                <div className="template-list">
                  {landings.map((land) => (
                    <div key={land.id} className="template-card">
                      <div className="row between"><strong>{land.name}</strong><span className="pill">{land.style_preset || 'default'}</span></div>
                      <div className="muted tiny">{land.created_at ? new Date(land.created_at).toLocaleString() : 'Sin fecha'}</div>
                      <div className="muted tiny">Estado: {land.status || 'generated'}</div>
                      <div className="row gap-sm" style={{ marginTop: '0.75rem' }}>
                        <button type="button" onClick={() => loadLandingForEdit(land)}>Editar</button>
                        <button type="button" className="secondary" onClick={() => setLandingHTML(land.html || land.preview_html || '')}>Ver</button>
                        <button type="button" className="danger" onClick={() => deleteLanding(land.id)}>Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ======================== FUNNEL ======================== */}
        {tab === 'funnel' && (
          <section className="stack gap-lg">
            <div className="metric-grid">
              <div className="stripe-card metric"><div className="metric-label">Visitas landing</div><div className="metric-value">{funnelMetrics.landing_views || 0}</div></div>
              <div className="stripe-card metric"><div className="metric-label">Clicks WhatsApp</div><div className="metric-value">{funnelMetrics.whatsapp_clicks || 0}</div></div>
              <div className="stripe-card metric"><div className="metric-label">Leads</div><div className="metric-value">{metrics.leads || 0}</div></div>
              <div className="stripe-card metric"><div className="metric-label">Cerrados</div><div className="metric-value">{metrics.closed_leads || 0}</div></div>
              <div className="stripe-card metric"><div className="metric-label">CTR</div><div className="metric-value">{Math.round(((funnelMetrics.whatsapp_clicks || 0) / (funnelMetrics.landing_views || 1)) * 100)}%</div></div>
              <div className="stripe-card metric"><div className="metric-label">Conversión</div><div className="metric-value">{Math.round((metrics.closed_leads || 0) / (metrics.leads || 1) * 100)}%</div></div>
            </div>
            <div className="stripe-card">
              <div className="section-title">Embudo de conversión</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1rem' }}>
                {[
                  ['Visitas', funnelMetrics.landing_views],
                  ['Clicks WA', funnelMetrics.whatsapp_clicks],
                  ['Leads', metrics.leads],
                  ['Interesados', leads.filter(l => l.stage === 'interested').length],
                  ['Hot', leads.filter(l => l.stage === 'hot').length],
                  ['Cerrados', metrics.closed_leads]
                ].map(([label, val], i) => (
                  <div key={label} style={{ width: `${100 - i * 10}%`, margin: '0 auto', background: '#3b82f6', color: 'white', padding: '10px', borderRadius: '10px', textAlign: 'center', fontWeight: '600' }}>
                    {label}: {val || 0}
                  </div>
                ))}
              </div>
            </div>
            <div className="stripe-card">
              <div className="chart-title">Leads por etapa</div>
              <div className="bar-container">
                {['new', 'qualified', 'interested', 'hot', 'closed'].map(stage => {
                  const count = leads.filter(l => l.stage === stage).length
                  return (
                    <div key={stage} className="bar-item">
                      <div className="bar-label">{stage}</div>
                      <div className="bar-fill" style={{ width: `${Math.min(100, count * 10)}%` }}></div>
                      <div className="bar-value">{count}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="stripe-card">
              <div className="row between">
                <div className="section-title">Leads y conversaciones</div>
                <input className="search-input" placeholder="Buscar lead..." value={searchLead} onChange={e => setSearchLead(e.target.value)} />
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Stage</th>
                    <th>Bot</th>
                    <th>Último mensaje</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <tr key={lead.id}>
                      <td>{lead.display_name || '—'}</td>
                      <td>{lead.phone}</td>
                      <td><span className={`pill ${lead.stage}`}>{lead.stage}</span></td>
                      <td>{lead.bot_name}</td>
                      <td>{lead.last_inbound_text?.slice(0, 40)}</td>
                      <td>
                        <button type="button" onClick={() => setSelectedLeadId(lead.id)}>
                          Ver chat
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                        No hay leads
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ======================== SOCIAL IA ======================== */}
        {tab === 'social' && (
          <section className="stack gap-lg">
            <div className="panel-grid">
              <section className="stripe-card stack">
                <div className="section-title"><i className="fas fa-key"></i> Credenciales Facebook</div>
                <div className="form-grid">
                  <input value={socialCredential.page_name} onChange={e => setSocialCredential({ ...socialCredential, page_name: e.target.value })} placeholder="Nombre de la página" />
                  <input value={socialCredential.page_id} onChange={e => setSocialCredential({ ...socialCredential, page_id: e.target.value })} placeholder="Page ID" />
                  <input className="full" value={socialCredential.access_token} onChange={e => setSocialCredential({ ...socialCredential, access_token: e.target.value })} placeholder="Page Access Token" />
                  <input value={socialCredential.ad_account_id} onChange={e => setSocialCredential({ ...socialCredential, ad_account_id: e.target.value })} placeholder="Ad Account ID (opcional)" />
                  <label className="toggle"><input type="checkbox" checked={!!socialCredential.enabled} onChange={e => setSocialCredential({ ...socialCredential, enabled: e.target.checked })} /> Facebook habilitado</label>
                </div>
                <button type="button" onClick={saveSocialCredential}>Guardar credenciales</button>
              </section>
              <section className="stripe-card stack">
                <div className="section-title"><i className="fas fa-bullhorn"></i> Configuración campaña</div>
                <div className="form-grid">
                  <input value={socialCampaign.name} onChange={e => setSocialCampaign({ ...socialCampaign, name: e.target.value })} placeholder="Nombre de campaña" />
                  <select value={socialCampaign.objective} onChange={e => setSocialCampaign({ ...socialCampaign, objective: e.target.value })}>
                    <option value="whatsapp">Enviar a WhatsApp</option>
                    <option value="landing">Enviar a Landing</option>
                    <option value="manual_link">Link manual</option>
                    <option value="no_link">Sin link</option>
                  </select>
                  <select value={socialCampaign.bot_id} onChange={e => setSocialCampaign({ ...socialCampaign, bot_id: e.target.value })}><option value="">Selecciona bot</option>{bots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                  <select value={socialCampaign.landing_id} onChange={e => setSocialCampaign({ ...socialCampaign, landing_id: e.target.value })}><option value="">Selecciona landing</option>{landings.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                  <select value={socialCampaign.image_mode} onChange={e => setSocialCampaign({ ...socialCampaign, image_mode: e.target.value })}>
                    <option value="ai">Imagen IA</option><option value="manual">Imagen manual</option><option value="none">Sin imagen</option>
                  </select>
                  <input value={socialCampaign.manual_image_url} onChange={e => setSocialCampaign({ ...socialCampaign, manual_image_url: e.target.value })} placeholder="URL imagen manual" />
                  <input value={socialCampaign.manual_link_url} onChange={e => setSocialCampaign({ ...socialCampaign, manual_link_url: e.target.value })} placeholder="Link manual" />
                  <input value={socialCampaign.call_to_action} onChange={e => setSocialCampaign({ ...socialCampaign, call_to_action: e.target.value })} placeholder="Call to action" />
                  <select value={socialCampaign.publish_mode} onChange={e => setSocialCampaign({ ...socialCampaign, publish_mode: e.target.value })}>
                    <option value="now">Publicar ahora</option><option value="scheduled">Fecha y hora exacta</option><option value="recurring">Repetir cada X minutos</option>
                  </select>
                  {socialCampaign.publish_mode === 'scheduled' && <input type="datetime-local" value={socialCampaign.scheduled_at} onChange={e => setSocialCampaign({ ...socialCampaign, scheduled_at: e.target.value })} />}
                  {socialCampaign.publish_mode === 'recurring' && <input type="number" value={socialCampaign.recurring_minutes} onChange={e => setSocialCampaign({ ...socialCampaign, recurring_minutes: e.target.value })} placeholder="Cada cuántos minutos" />}
                  <input className="full" value={socialCampaign.days_of_week} onChange={e => setSocialCampaign({ ...socialCampaign, days_of_week: e.target.value })} placeholder="Días de publicación (ej: mon,tue,wed)" />
                  <textarea className="full" rows={5} value={socialCampaign.prompt} onChange={e => setSocialCampaign({ ...socialCampaign, prompt: e.target.value })} placeholder="Describe la campaña que quieres generar con IA..." />
                </div>
                <div className="row gap-sm">
                  <button type="button" onClick={generateSocial}>Generar contenido IA</button>
                  <button type="button" className="secondary" onClick={publishSocialNow}>Publicar ahora</button>
                  <button type="button" className="secondary" onClick={scheduleSocialPost}>Programar</button>
                </div>
              </section>
            </div>
            <section className="stripe-card stack">
              <div className="section-title"><i className="fas fa-image"></i> Imagen IA</div>
              <textarea className="full" rows={3} value={socialImagePrompt} onChange={e => { setSocialImagePrompt(e.target.value); setSocialCampaign(prev => ({ ...prev, image_prompt: e.target.value })) }} placeholder="Describe la imagen que quieres generar para la publicación..." />
              <div className="row gap-sm">
                <button type="button" onClick={generateSocialImage} disabled={socialImageLoading}>{socialImageLoading ? 'Generando imagen...' : 'Generar imagen IA'}</button>
                <label className="secondary" style={{ cursor: 'pointer' }}>{socialUploadLoading ? 'Subiendo...' : 'Subir imagen manual'}<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadSocialImage(e.target.files?.[0])} /></label>
                <button type="button" className="secondary" onClick={() => { setSocialImageURL(''); setSocialImagePrompt(''); setSocialCampaign(prev => ({ ...prev, image_mode: 'none', manual_image_url: '', image_prompt: '' })) }}>Sin imagen</button>
              </div>
              {(socialImageURL || socialCampaign.manual_image_url) && socialCampaign.image_mode !== 'none' && (
                <img src={resolveMediaURL(socialImageURL || socialCampaign.manual_image_url)} alt="Preview social" style={{ maxWidth: '320px', width: '100%', borderRadius: '1rem', border: '1px solid #e2e8f0', marginTop: '1rem', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.opacity = '0.4'; showNotice('No se pudo cargar el preview de la imagen. Revisa PUBLIC_BASE_URL o la ruta del backend.') }} />
              )}
            </section>
            <section className="stripe-card stack">
              <div className="section-title"><i className="fas fa-eye"></i> Preview de publicación</div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '18px', background: '#ffffff', overflow: 'hidden', maxWidth: '640px' }}>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '9999px', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '18px' }}>{(socialCredential.page_name || selectedClient?.name || 'P').slice(0, 1).toUpperCase()}</div>
                    <div><div style={{ fontWeight: 700, color: '#0f172a' }}>{socialCredential.page_name || selectedClient?.name || 'Tu página'}</div><div style={{ fontSize: '12px', color: '#64748b' }}>Publicidad · Ahora</div></div>
                  </div>
                  <div style={{ whiteSpace: 'pre-line', color: '#0f172a', fontSize: '15px', lineHeight: 1.5 }}>{htmlToPlainText(socialContent) || 'Aquí verás cómo quedará el copy de la publicación.'}</div>
                </div>
                {(socialImageURL || socialCampaign.manual_image_url) && socialCampaign.image_mode !== 'none' && (
                  <img src={resolveMediaURL(socialImageURL || socialCampaign.manual_image_url)} alt="Preview social" style={{ width: '100%', maxHeight: '520px', objectFit: 'cover', display: 'block', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }} />
                )}
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Destino del clic</div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {socialCampaign.objective === 'whatsapp' && 'WhatsApp'}
                    {socialCampaign.objective === 'landing' && 'Landing page'}
                    {socialCampaign.objective === 'manual_link' && 'Link manual'}
                    {socialCampaign.objective === 'none' && 'Sin enlace'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                    {socialCampaign.objective === 'manual_link' ? socialCampaign.manual_link_url || 'Escribe un link manual' : socialCampaign.objective === 'whatsapp' ? 'Abrirá conversación con el bot seleccionado' : socialCampaign.objective === 'landing' ? 'Abrirá la landing seleccionada' : 'La publicación no llevará enlace'}
                  </div>
                </div>
              </div>
            </section>
            <div className="panel-grid">
              <section className="stripe-card stack">
                <div className="section-title"><i className="fas fa-history"></i> Historial de publicaciones</div>
                <table>
                  <thead>
                    <tr><th>Plataforma</th><th>Estado</th><th>Modo</th><th>Fecha</th><th>Contenido</th></tr>
                  </thead>
                  <tbody>
                    {socialPosts.map(post => (
                      <tr key={post.id}>
                        <td>{post.platform}</td>
                        <td><span className={`pill ${post.status === 'published' ? 'connected' : post.status === 'error' ? 'error' : 'new'}`}>{post.status}</span></td>
                        <td>{post.publish_mode}</td>
                        <td>{post.created_at ? new Date(post.created_at).toLocaleString() : '—'}</td>
                        <td>{(post.content || '').slice(0, 120)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {socialPosts.length === 0 && <div className="empty-box">No hay publicaciones todavía</div>}
              </section>
              <section className="stripe-card stack">
                <div className="section-title"><i className="fas fa-file-alt"></i> Logs sociales</div>
                <div className="stack gap-sm">
                  {socialLogs.map(log => (
                    <div key={log.id} className="bot-card"><div className="row between"><strong>{log.level}</strong><span className="tiny">{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</span></div><div className="muted">{log.message}</div></div>
                  ))}
                  {socialLogs.length === 0 && <div className="empty-box">Sin logs aún</div>}
                </div>
              </section>
            </div>
          </section>
        )}

        {/* ======================== ADS IA ======================== */}
        {tab === 'ads' && (
          <AdsPanel
            adsForm={adsForm}
            setAdsForm={setAdsForm}
            adsResult={adsResult}
            adsLoading={adsLoading}
            generateAdsCampaign={generateAdsCampaign}
            showNotice={showNotice}
          />
        )}

        {/* ======================== CLIENTS (admin only) ======================== */}
        {tab === 'clients' && me.role === 'admin' && (
          <section className="panel-grid">
            <section className="stripe-card stack"><div className="section-title"><i className="fas fa-building"></i> Nuevo cliente</div><form onSubmit={createClient} className="form-grid"><input value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} placeholder="Nombre" /><input value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} placeholder="Email" /><input value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} placeholder="Teléfono" /><input value={newClient.plan} onChange={e => setNewClient({...newClient, plan: e.target.value})} placeholder="Plan" /><button className="full" disabled={busy}>Crear cliente</button></form></section>
            <section className="stripe-card stack">
              <div className="row between center"><div className="section-title">Clientes</div><input type="text" placeholder="Buscar cliente..." value={searchClient} onChange={e => setSearchClient(e.target.value)} className="search-input" /></div>
              <div className="template-list">
                {paginatedClients.map(c => (
                  <button key={c.id} className={selectedClientId === c.id ? 'template-card active-outline' : 'template-card'} onClick={() => setSelectedClientId(c.id)} type="button">
                    <div className="row between"><i className="fas fa-user-circle" style={{ fontSize: '1.2rem', color: '#3b82f6' }}></i><strong>{c.name}</strong><span className="pill">{c.plan}</span></div>
                    <div className="muted" style={{ color: '#1e293b' }}>{c.email}</div>
                  </button>
                ))}
              </div>
              <div className="pagination"><button type="button" onClick={() => setClientPage(p => Math.max(1, p-1))} disabled={clientPage === 1}>Anterior</button><span>Página {clientPage}</span><button type="button" onClick={() => setClientPage(p => p+1)} disabled={clientPage * pageSize >= filteredClients.length}>Siguiente</button></div>
            </section>
          </section>
        )}

        {/* ======================== USERS (admin only) ======================== */}
        {tab === 'users' && me.role === 'admin' && (
          <section className="panel-grid">
            <section className="stripe-card stack"><div className="section-title"><i className="fas fa-user-plus"></i> Nuevo usuario</div><form onSubmit={createUser} className="form-grid">
              {me.role === 'admin' && <select value={newUser.client_id || selectedClientId} onChange={e => setNewUser({...newUser, client_id: e.target.value})}><option value="">Cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
              <input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="Nombre" />
              <input value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="Email" />
              <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Password" />
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}><option value="client_admin">client_admin</option><option value="client_user">client_user</option>{me.role === 'admin' && <option value="admin">admin</option>}</select>
              <button className="full" disabled={busy}>Crear usuario</button>
            </form></section>
            <section className="stripe-card stack"><div className="row between center"><div className="section-title">Usuarios</div><input type="text" placeholder="Buscar usuario..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="search-input" /></div>
              <div className="template-list">{paginatedUsers.map(u => <div key={u.id} className="template-card"><div className="row between"><strong>{u.name}</strong><span className="pill">{u.role}</span></div><div className="muted tiny">{u.email}</div><button className="danger tiny-btn" onClick={() => deleteUser(u.id)}>Eliminar</button></div>)}</div>
              <div className="pagination"><button type="button" onClick={() => setUserPage(p => Math.max(1, p-1))} disabled={userPage === 1}>Anterior</button><span>Página {userPage}</span><button type="button" onClick={() => setUserPage(p => p+1)} disabled={userPage * pageSize >= filteredUsers.length}>Siguiente</button></div>
            </section>
          </section>
        )}

        {/* ======================== BILLING (admin only) ======================== */}
        {tab === 'billing' && me.role === 'admin' && (
          <div className="stack gap-lg">
            <div className="stripe-card stack">
              <h2>Configuración de billing</h2>
              <input
                type="text"
                placeholder="Wallet USDT BEP20"
                value={billingConfig.usdt_bep20_wallet}
                onChange={(e) => setBillingConfig({ ...billingConfig, usdt_bep20_wallet: e.target.value })}
              />
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={billingConfig.card_payments_enabled}
                  onChange={(e) => setBillingConfig({ ...billingConfig, card_payments_enabled: e.target.checked })}
                />
                Próximamente habilitar tarjeta
              </label>
              <button type="button" onClick={saveBillingConfig}>Guardar billing</button>
            </div>

            <div className="stripe-card stack">
              <div className="row between">
                <h2>Pagos pendientes</h2>
                <button type="button" onClick={loadPendingSubscriptions}>Recargar</button>
              </div>

              {pendingSubscriptions.length === 0 ? (
                <div className="empty-box">No hay pagos pendientes</div>
              ) : (
                pendingSubscriptions.map((sub) => (
                  <div key={sub.id} className="bot-card stack">
                    <div><strong>Cliente:</strong> {sub.client_name || sub.client_id}</div>
                    <div><strong>Plan:</strong> {sub.plan_slug}</div>
                    <div><strong>Ciclo:</strong> {sub.billing_cycle}</div>
                    <div><strong>Monto:</strong> ${sub.amount}</div>
                    <div><strong>Hash:</strong> {sub.tx_hash || 'Sin hash'}</div>
                    <button type="button" onClick={() => approveSubscription(sub.id)}>
                      Aprobar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}