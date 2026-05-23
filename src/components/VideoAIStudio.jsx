import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import WaveSurfer from 'wavesurfer.js'
import { motion } from 'framer-motion'
import {
  FaMusic,
  FaMagic,
  FaUpload,
  FaPlay,
  FaPause,
  FaCut,
  FaClosedCaptioning,
  FaFileExport,
  FaSyncAlt,
  FaDownload,
  FaLink,
  FaVideo,
  FaSearchMinus,
  FaSearchPlus
} from 'react-icons/fa'

import '../styles/video-ai-studio.css'
import { api, API_BASE } from '../api'

const pxPerSecondBase = 42

export default function VideoAIStudio({
  selectedClientId,
  videoPrompt,
  setVideoPrompt,
  videoDuration,
  setVideoDuration,
  videoLoading,
  generateAIVideo,
  loadAIVideos,
  videoJobs = [],
  setVideoJobs,
  refreshAIVideo,
  addMusicToVideo,
  addVoiceAndSubtitles,
  downloadAIVideo,
  voiceText,
  setVoiceText,
  voiceLanguage,
  setVoiceLanguage,
  voiceGender,
  setVoiceGender,
  enableVoice,
  setEnableVoice,
  enableSubtitles,
  setEnableSubtitles,
  uploadAIVideoFile,
  trimAIVideo,
  exportAIVideoPreset,
  addAnimatedCaptions,
  showNotice
}) {
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState('')
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(10)
  const [zoom, setZoom] = useState(1)
  const [duration, setDuration] = useState(10)
  const [selectedClip, setSelectedClip] = useState('video')
  const [captionsStyle, setCaptionsStyle] = useState('karaoke')
  const [previewCaption, setPreviewCaption] = useState('Automatiza tus ventas con Worktic AI')

  const waveformRef = useRef(null)
  const wavesurfer = useRef(null)
  const videoRef = useRef(null)
  const timelineRef = useRef(null)

  const selectedJob = useMemo(() => {
    if (!videoJobs.length) return null
    return videoJobs.find(j => j.id === selectedJobId) || videoJobs[0]
  }, [videoJobs, selectedJobId])

  const currentVideoUrl = selectedJob?.video_url || ''

  const [clips, setClips] = useState([
    { id: 'video', label: '🎬 Video principal', track: 'video', start: 0, length: 10, color: 'purple' },
    { id: 'audio', label: '🎵 Música / Voz', track: 'audio', start: 0, length: 10, color: 'blue' },
    { id: 'subs', label: '💬 Subtítulos IA', track: 'subs', start: 0, length: 10, color: 'green' }
  ])

  const pxPerSecond = pxPerSecondBase * zoom
  const timelineWidth = Math.max(600, duration * pxPerSecond)

  useEffect(() => {
    if (!selectedJobId && videoJobs.length > 0) {
      setSelectedJobId(videoJobs[0].id)
    }
  }, [videoJobs, selectedJobId])

  useEffect(() => {
    if (!waveformRef.current || !currentVideoUrl) return

    if (wavesurfer.current) {
      wavesurfer.current.destroy()
      wavesurfer.current = null
    }

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#7430e2',
      progressColor: '#00ffd5',
      cursorColor: '#ffffff',
      barWidth: 2,
      height: 90
    })

    wavesurfer.current.load(currentVideoUrl)
    wavesurfer.current.on('play', () => setPlaying(true))
    wavesurfer.current.on('pause', () => setPlaying(false))

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy()
        wavesurfer.current = null
      }
    }
  }, [currentVideoUrl])

  function onVideoLoaded(e) {
    const d = Math.max(1, Math.round(e.currentTarget.duration || 10))
    setDuration(d)
    setTrimEnd(Math.min(10, d))
    setClips(prev => prev.map(c => ({ ...c, length: Math.min(c.length, d) || d })))
  }

  async function handleUploadFile(file) {
    if (!file) return

    try {
      setLoading(true)

      if (uploadAIVideoFile) {
        await uploadAIVideoFile(file)
        await loadAIVideos?.()
        showNotice?.('Video importado correctamente 🎬')
        return
      }

      const formData = new FormData()
      formData.append('video', file)

      const res = await fetch(
        `${API_BASE}/api/social/videos/upload${selectedClientId ? `?client_id=${selectedClientId}` : ''}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('wsos_token') || ''}` },
          body: formData
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error subiendo video')

      setVideoJobs?.(prev => [data, ...(prev || [])])
      setSelectedJobId(data.id)
      showNotice?.('Video importado correctamente 🎬')
    } catch (err) {
      showNotice?.(err.message || 'Error subiendo video')
    } finally {
      setLoading(false)
    }
  }

  const onDrop = async (acceptedFiles) => {
    await handleUploadFile(acceptedFiles?.[0])
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/webm': ['.webm']
    },
    multiple: false
  })

  async function applyEffect(effect) {
    if (!selectedJob?.id) {
      showNotice?.('Selecciona un video primero')
      return
    }

    try {
      setLoading(true)
      const updated = await api(`/api/social/videos/${selectedJob.id}/effect`, {
        method: 'POST',
        body: JSON.stringify({ effect })
      })

      setVideoJobs?.(prev => (prev || []).map(v => v.id === selectedJob.id ? updated : v))
      setSelectedJobId(updated.id)
      showNotice?.('Efecto aplicado 🔥')
    } catch (err) {
      showNotice?.(err.message || 'Error aplicando efecto')
    } finally {
      setLoading(false)
    }
  }

  async function handleTrim() {
    if (!selectedJob?.id) return

    try {
      setLoading(true)
      await trimAIVideo?.(selectedJob.id, trimStart, trimEnd)
      await loadAIVideos?.()
      showNotice?.('Video recortado ✂️')
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(preset) {
    if (!selectedJob?.id) return

    try {
      setLoading(true)
      await exportAIVideoPreset?.(selectedJob.id, preset)
      await loadAIVideos?.()
      showNotice?.(`Exportado para ${preset} 🚀`)
    } finally {
      setLoading(false)
    }
  }

  function copyURL() {
    if (!currentVideoUrl) return
    navigator.clipboard.writeText(currentVideoUrl)
    showNotice?.('URL copiada')
  }

  function updateClip(id, patch) {
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  function moveClipByMouse(e, clip) {
    const box = timelineRef.current?.getBoundingClientRect()
    if (!box) return

    const x = e.clientX - box.left + timelineRef.current.scrollLeft
    const nextStart = Math.max(0, Math.min(duration - clip.length, x / pxPerSecond))
    updateClip(clip.id, { start: Number(nextStart.toFixed(1)) })
    setSelectedClip(clip.id)
  }

  function resizeClipByMouse(e, clip) {
    const box = timelineRef.current?.getBoundingClientRect()
    if (!box) return

    const x = e.clientX - box.left + timelineRef.current.scrollLeft
    const nextLength = Math.max(1, Math.min(duration - clip.start, (x / pxPerSecond) - clip.start))
    updateClip(clip.id, { length: Number(nextLength.toFixed(1)) })

    if (clip.id === 'video') {
      setTrimStart(Number(clip.start.toFixed(1)))
      setTrimEnd(Number((clip.start + nextLength).toFixed(1)))
    }
  }

  function handleMouseDrag(e, clip, mode) {
    e.preventDefault()

    const onMove = (ev) => {
      if (mode === 'move') moveClipByMouse(ev, clip)
      if (mode === 'resize') resizeClipByMouse(ev, clip)
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function jumpToClip(clip) {
    if (videoRef.current) {
      videoRef.current.currentTime = clip.start
    }
    if (wavesurfer.current) {
      const ratio = clip.start / Math.max(duration, 1)
      wavesurfer.current.seekTo(Math.max(0, Math.min(1, ratio)))
    }
    setSelectedClip(clip.id)
  }

  function removeVideoFromWorkspace(jobId) {
  setVideoJobs?.(prev => (prev || []).filter(v => v.id !== jobId))

  if (selectedJobId === jobId) {
    const next = (videoJobs || []).find(v => v.id !== jobId)
    setSelectedJobId(next?.id || '')
  }

  showNotice?.('Video quitado del editor')
 }

  const ruler = Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => i)

  const currentClip = clips.find(c => c.id === selectedClip)

  return (
    <div className="video-ai-studio">

      <div className="video-studio-header">
        <div>
          <h1>🎬 Video AI Studio</h1>
          <p>Genera, importa, edita, musicaliza y exporta videos verticales con IA.</p>
        </div>

        <button className="export-btn" type="button" onClick={() => selectedJob?.id && handleExport('reels')}>
          <FaFileExport />
          Exportar Reel
        </button>
      </div>

      <div className="tool-card studio-generator">
        <h3>🚀 Generar video con IA</h3>

        <textarea
          rows={4}
          placeholder="Describe el video: escena, producto, movimiento, estilo visual, CTA..."
          value={videoPrompt || ''}
          onChange={(e) => setVideoPrompt?.(e.target.value)}
        />

        <div className="row" style={{ marginTop: 12 }}>
          <select value={videoDuration || 5} onChange={(e) => setVideoDuration?.(Number(e.target.value))}>
            <option value={5}>5 segundos</option>
            <option value={10}>10 segundos</option>
          </select>

          <button type="button" onClick={generateAIVideo} disabled={videoLoading}>
            {videoLoading ? 'Generando...' : 'Generar video IA'}
          </button>

          <button type="button" className="secondary" onClick={loadAIVideos}>
            <FaSyncAlt />
            Actualizar lista
          </button>
        </div>
      </div>

      <div className="video-layout">

        <div className="video-preview-section">

          <motion.div
            className="video-phone-frame"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {currentVideoUrl ? (
              <div className="caption-preview-wrap">
                <video
                  key={currentVideoUrl}
                  ref={videoRef}
                  src={currentVideoUrl}
                  controls
                  className="studio-video"
                  onLoadedMetadata={onVideoLoaded}
                />

                <div className={`animated-caption-preview ${captionsStyle}`}>
                  {String(previewCaption || '').split(' ').slice(0, 5).map((w, i) => (
                    <span key={`${w}-${i}`}>{w}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-video">
                <FaVideo />
                <span>Sin video</span>
              </div>
            )}
          </motion.div>

          <div className="timeline-panel">
            <div className="timeline-header">
              <h3>🎞 Timeline editable</h3>

              <div className="timeline-actions">
                <button type="button" onClick={() => setZoom(z => Math.max(0.6, Number((z - 0.2).toFixed(1))))}>
                  <FaSearchMinus />
                </button>

                <span>{Math.round(zoom * 100)}%</span>

                <button type="button" onClick={() => setZoom(z => Math.min(2.4, Number((z + 0.2).toFixed(1))))}>
                  <FaSearchPlus />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!wavesurfer.current) return
                    wavesurfer.current.playPause()
                  }}
                >
                  {playing ? <FaPause /> : <FaPlay />}
                </button>
              </div>
            </div>

            {currentVideoUrl ? (
              <div ref={waveformRef}></div>
            ) : (
              <div className="empty-box">Sube o genera un video para ver el waveform.</div>
            )}

            <div className="editable-timeline" ref={timelineRef}>
              <div className="timeline-ruler" style={{ width: timelineWidth }}>
                {ruler.map(s => (
                  <span key={s} style={{ left: s * pxPerSecond }}>
                    {s}s
                  </span>
                ))}
              </div>

              {['video', 'audio', 'subs'].map(track => (
                <div className="editable-track" key={track} style={{ width: timelineWidth }}>
                  <div className="track-label">
                    {track === 'video' ? 'VIDEO' : track === 'audio' ? 'AUDIO' : 'SUBS'}
                  </div>

                  {clips.filter(c => c.track === track).map(clip => (
                    <div
                      key={clip.id}
                      className={`editable-clip ${clip.color} ${selectedClip === clip.id ? 'active' : ''}`}
                      style={{
                        left: clip.start * pxPerSecond,
                        width: clip.length * pxPerSecond
                      }}
                      onClick={() => jumpToClip(clip)}
                      onMouseDown={(e) => handleMouseDrag(e, clip, 'move')}
                    >
                      <span>{clip.label}</span>
                      <b>{clip.start}s - {(clip.start + clip.length).toFixed(1)}s</b>

                      <i
                        className="clip-resize"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          handleMouseDrag(e, clip, 'resize')
                        }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="clip-inspector">
              <div>
                <strong>Clip seleccionado:</strong> {currentClip?.label || 'Ninguno'}
              </div>

              <div className="row">
                <input
                  type="number"
                  value={currentClip?.start ?? 0}
                  onChange={(e) => currentClip && updateClip(currentClip.id, { start: Number(e.target.value) })}
                />

                <input
                  type="number"
                  value={currentClip?.length ?? 1}
                  onChange={(e) => currentClip && updateClip(currentClip.id, { length: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {videoJobs.length > 0 && (
            <div className="tool-card video-library">
              <h3>📚 Videos recientes</h3>

              <div className="video-job-list">
                {videoJobs.map(job => (
                <div className="video-job-row" key={job.id}>
                    <button
                    type="button"
                    className={selectedJob?.id === job.id ? 'video-job active' : 'video-job'}
                    onClick={() => setSelectedJobId(job.id)}
                    >
                    <span>{job.provider === 'upload' ? '📂' : '🤖'} {job.status}</span>
                    <small>{String(job.prompt || 'Video').slice(0, 70)}</small>
                    </button>

                    <button
                    type="button"
                    className="remove-video-btn"
                    onClick={() => removeVideoFromWorkspace(job.id)}
                    title="Quitar del editor"
                    >
                    ✕
                    </button>
                </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="editor-sidebar">

          <div className="tool-card">
            <h3>📂 Importar video</h3>

            <div {...getRootProps()} className={isDragActive ? 'dropzone active' : 'dropzone'}>
              <input {...getInputProps()} />
              <FaUpload size={32} />
              <p>{isDragActive ? 'Suelta el video aquí' : 'Arrastra videos aquí o haz clic'}</p>
            </div>
          </div>

          <div className="tool-card">
            <h3>🔥 TikTok Effects</h3>

            <div className="effects-grid">
              <button type="button" onClick={() => applyEffect('zoom')}>Zoom Punch</button>
              <button type="button" onClick={() => applyEffect('shake')}>Shake</button>
              <button type="button" onClick={() => applyEffect('glow')}>Glow</button>
              <button type="button" onClick={() => applyEffect('speed')}>Speed Ramp</button>
              <button type="button" onClick={() => applyEffect('flash')}>Flash</button>
              <button type="button" onClick={() => applyEffect('cinematic')}>Cinematic</button>
            </div>
          </div>

          <div className="tool-card">
            <h3>🎵 Música</h3>

            <button type="button" onClick={() => selectedJob?.id && addMusicToVideo?.(selectedJob.id, 'auto')}>
              <FaMusic />
              Música auto
            </button>

            <select
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value || !selectedJob?.id) return
                addMusicToVideo?.(selectedJob.id, e.target.value)
              }}
            >
              <option value="">Música por categoría</option>
              <option value="corporate">Corporativa</option>
              <option value="viral">Viral</option>
              <option value="cinematic">Cinemática</option>
              <option value="trading">Trading</option>
              <option value="dark">Dark</option>
              <option value="motivational">Motivacional</option>
              <option value="luxury">Luxury</option>
              <option value="tech">Tech</option>
            </select>
          </div>

          <div className="tool-card">
            <h3>🎙 Voz IA + Subtítulos</h3>

            <label>Idioma</label>
            <select value={voiceLanguage || 'es'} onChange={(e) => setVoiceLanguage?.(e.target.value)}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>

            <label>Tipo de voz</label>
            <select value={voiceGender || 'female'} onChange={(e) => setVoiceGender?.(e.target.value)}>
              <option value="female">Femenina</option>
              <option value="male">Masculina</option>
            </select>

            <label>
              <input
                type="checkbox"
                checked={enableVoice !== false}
                onChange={(e) => setEnableVoice?.(e.target.checked)}
              />
              Voz IA
            </label>

            <label>
              <input
                type="checkbox"
                checked={enableSubtitles !== false}
                onChange={(e) => setEnableSubtitles?.(e.target.checked)}
              />
              Subtítulos
            </label>

            <textarea
              rows={3}
              placeholder="Texto para voz IA. Si lo dejas vacío, se usa el prompt del video."
              value={voiceText || ''}
              onChange={(e) => {
                setVoiceText?.(e.target.value)
                setPreviewCaption(e.target.value || 'Automatiza tus ventas con Worktic AI')
              }}
            />

            <button type="button" onClick={() => selectedJob?.id && addVoiceAndSubtitles?.(selectedJob.id)}>
              <FaClosedCaptioning />
              Generar Voz + Subs
            </button>
          </div>

          <div className="tool-card">
            <h3>🤖 Auto Captions animados</h3>

            <label>Estilo caption</label>
            <select value={captionsStyle} onChange={(e) => setCaptionsStyle(e.target.value)}>
              <option value="karaoke">Karaoke TikTok</option>
              <option value="neon">Neón</option>
              <option value="bold">Bold Viral</option>
              <option value="minimal">Minimal Pro</option>
            </select>

            <textarea
              rows={2}
              value={previewCaption}
              onChange={(e) => setPreviewCaption(e.target.value)}
            />

        <button type="button" onClick={() => selectedJob?.id && addAnimatedCaptions?.(selectedJob.id, previewCaption, captionsStyle)}>
        <FaMagic />
        Aplicar captions animados
        </button>
          </div>

          <div className="tool-card">
            <h3>✂ Corte rápido</h3>

            <div className="row">
              <input
                type="number"
                min="0"
                value={trimStart}
                onChange={(e) => setTrimStart(Number(e.target.value))}
                placeholder="Inicio"
              />
              <input
                type="number"
                min="1"
                value={trimEnd}
                onChange={(e) => setTrimEnd(Number(e.target.value))}
                placeholder="Fin"
              />
            </div>

            <button type="button" onClick={handleTrim}>
              <FaCut />
              Cortar escena
            </button>
          </div>

          <div className="tool-card">
            <h3>🎬 Export Presets</h3>

            <div className="effects-grid">
              <button type="button" onClick={() => handleExport('tiktok')}>TikTok</button>
              <button type="button" onClick={() => handleExport('reels')}>Reels</button>
              <button type="button" onClick={() => handleExport('shorts')}>Shorts</button>
            </div>
          </div>

          <div className="tool-card">
            <h3>⚡ Acciones</h3>

            <button type="button" onClick={() => selectedJob?.id && refreshAIVideo?.(selectedJob.id)}>
              <FaSyncAlt />
              Estado
            </button>

            <button type="button" onClick={() => selectedJob?.id && downloadAIVideo?.(selectedJob.id)}>
              <FaDownload />
              Descargar
            </button>

            <button type="button" onClick={copyURL}>
              <FaLink />
              Copiar URL
            </button>

            <button type="button">
              <FaMagic />
              Auto Viral Edit
            </button>
          </div>

        </div>

      </div>

      {(loading || videoLoading) && (
        <div className="video-loading-overlay">
          ⚡ Procesando video IA...
        </div>
      )}

    </div>
  )
}