import React, { useEffect, useRef, useState } from 'react'
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
  FaFileExport
} from 'react-icons/fa'

import '../styles/video-ai-studio.css'
import { api, API_BASE } from '../api'

export default function VideoAIStudio() {
  const [videoUrl, setVideoUrl] = useState('')
  const [videoId, setVideoId] = useState('')
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)

  const waveformRef = useRef(null)
  const wavesurfer = useRef(null)
  const videoRef = useRef(null)

  useEffect(() => {
    if (!waveformRef.current || !videoUrl) return

    if (wavesurfer.current) {
      wavesurfer.current.destroy()
    }

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#7430e2',
      progressColor: '#00ffd5',
      cursorColor: '#ffffff',
      barWidth: 2,
      height: 90,
      responsive: true
    })

    wavesurfer.current.load(videoUrl)

    wavesurfer.current.on('play', () => {
      setPlaying(true)
    })

    wavesurfer.current.on('pause', () => {
      setPlaying(false)
    })

  }, [videoUrl])

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return

    const formData = new FormData()
    formData.append('video', file)

    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/social/videos/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('wsos_token')}`
        },
        body: formData
      })

      const data = await res.json()

      setVideoUrl(data.video_url)
      setVideoId(data.id)

    } catch (err) {
      alert('Error subiendo video')
    }

    setLoading(false)
  }

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov']
    }
  })

  async function applyEffect(effect) {
    if (!videoId) return

    setLoading(true)

    try {
      await api(`/api/social/videos/${videoId}/effect`, {
        method: 'POST',
        body: JSON.stringify({ effect })
      })

      alert('Efecto aplicado')

    } catch (err) {
      alert(err.message)
    }

    setLoading(false)
  }

  return (
    <div className="video-ai-studio">

      <div className="video-studio-header">
        <div>
          <h1>🎬 Video AI Studio</h1>
          <p>Editor IA profesional estilo OpusClip + CapCut</p>
        </div>

        <button className="export-btn">
          <FaFileExport />
          Exportar Reel
        </button>
      </div>

      <div className="video-layout">

        <div className="video-preview-section">

          <motion.div
            className="video-phone-frame"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="studio-video"
              />
            ) : (
              <div className="empty-video">
                🎥 Sin video
              </div>
            )}
          </motion.div>

          <div className="timeline-panel">

            <div className="timeline-header">
              <h3>🎵 Audio Timeline</h3>

              <button
                onClick={() => {
                  if (!wavesurfer.current) return

                  wavesurfer.current.playPause()
                }}
              >
                {playing ? <FaPause /> : <FaPlay />}
              </button>
            </div>

            <div ref={waveformRef}></div>

          </div>

        </div>

        <div className="editor-sidebar">

          <div className="tool-card">
            <h3>📂 Importar</h3>

            <div {...getRootProps()} className="dropzone">
              <input {...getInputProps()} />

              <FaUpload size={32} />

              <p>
                Arrastra videos aquí
              </p>
            </div>
          </div>

          <div className="tool-card">
            <h3>🔥 TikTok Effects</h3>

            <div className="effects-grid">

              <button onClick={() => applyEffect('zoom')}>
                Zoom Punch
              </button>

              <button onClick={() => applyEffect('shake')}>
                Shake
              </button>

              <button onClick={() => applyEffect('glow')}>
                Glow
              </button>

              <button onClick={() => applyEffect('speed')}>
                Speed Ramp
              </button>

              <button onClick={() => applyEffect('flash')}>
                Flash
              </button>

            </div>
          </div>

          <div className="tool-card">
            <h3>🤖 AI Tools</h3>

            <button>
              <FaClosedCaptioning />
              Auto Captions
            </button>

            <button>
              <FaMusic />
              AI Music
            </button>

            <button>
              <FaMagic />
              Auto Viral Edit
            </button>

            <button>
              <FaCut />
              Auto Cut Silence
            </button>
          </div>

        </div>

      </div>

      {loading && (
        <div className="video-loading-overlay">
          ⚡ Procesando video IA...
        </div>
      )}

    </div>
  )
}