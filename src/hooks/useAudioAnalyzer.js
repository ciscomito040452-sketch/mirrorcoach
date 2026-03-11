import { useEffect, useRef, useState } from 'react'

export function useAudioAnalyzer(started) {
  const [voiceScore, setVoiceScore] = useState(0)
  const [volume, setVolume] = useState(0)
  const displayScore = useRef(0)
  const animFrameRef = useRef(null)

  // เก็บ volume history สำหรับ consistency
  const volumeHistory = useRef([])
  // เก็บว่าพูดหรือเงียบ (speaking ratio)
  const speakingFrames = useRef(0)
  const totalFrames = useRef(0)

  useEffect(() => {
    if (!started) return

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const audioCtx = new AudioContext()
        const source = audioCtx.createMediaStreamSource(stream)
        const analyzer = audioCtx.createAnalyser()
        analyzer.fftSize = 256
        source.connect(analyzer)

        const dataArray = new Uint8Array(analyzer.frequencyBinCount)

        const tick = () => {
          analyzer.getByteFrequencyData(dataArray)
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
          const vol = Math.min(100, Math.round(avg * 2.5))
          setVolume(vol)

          totalFrames.current += 1

          // ถือว่าพูดอยู่ถ้า volume > 15
          const isSpeaking = vol > 15
          if (isSpeaking) speakingFrames.current += 1

          // Speaking Ratio — สัดส่วนที่พูดจริงๆ
          const ratio = speakingFrames.current / totalFrames.current
          const ratioScore = Math.round(Math.min(100, ratio * 130)) // 75%+ speaking = 97+

          // Volume Consistency — เสียงสม่ำเสมอแค่ไหน
          if (isSpeaking) {
            volumeHistory.current.push(vol)
            if (volumeHistory.current.length > 30) volumeHistory.current.shift()
          }

          let consistencyScore = 70 // default ถ้ายังไม่มีข้อมูล
          if (volumeHistory.current.length >= 10) {
            const mean = volumeHistory.current.reduce((a, b) => a + b, 0) / volumeHistory.current.length
            const variance = volumeHistory.current.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / volumeHistory.current.length
            const stdDev = Math.sqrt(variance)
            // stdDev ต่ำ = สม่ำเสมอ = คะแนนสูง
            consistencyScore = Math.round(Math.max(0, Math.min(100, 100 - stdDev * 1.5)))
          }

          // รวม 2 มิติ
          const raw = Math.round(ratioScore * 0.6 + consistencyScore * 0.4)

          if (raw > displayScore.current) {
            displayScore.current = Math.min(raw, displayScore.current + 2)
          } else {
            displayScore.current = Math.max(raw, displayScore.current - 2)
          }

          setVoiceScore(Math.round(displayScore.current))
          animFrameRef.current = requestAnimationFrame(tick)
        }

        tick()
      })
      .catch(err => console.error('Audio error:', err))

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [started])

  return { voiceScore, volume }
}