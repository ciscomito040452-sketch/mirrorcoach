import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMediaPipe } from '../hooks/useMediaPipe'
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer'
import { usePosture } from '../hooks/usePosture'

function Session() {
  const navigate = useNavigate()
  const location = useLocation()
  const topic = location.state?.topic || 'พูดอิสระ'
  const [seconds, setSeconds] = useState(0)
  const [countdown, setCountdown] = useState(null)
  const [started, setStarted] = useState(false)
  const [warmup, setWarmup] = useState(false)
  const [warmupSeconds, setWarmupSeconds] = useState(10)
  const [ready, setReady] = useState(false)
  const videoRef = useRef(null)

  const eyeHistory = useRef([])
  const voiceHistory = useRef([])
  const postureHistory = useRef([])
  const expressionHistory = useRef([])

  const { eyeScore, expressionScore } = useMediaPipe(videoRef, ready)
  const { voiceScore, volume } = useAudioAnalyzer(ready)
  const { postureScore } = usePosture(videoRef, ready)

  const eyeScoreRef = useRef(eyeScore)
  const voiceScoreRef = useRef(voiceScore)
  const postureScoreRef = useRef(postureScore)
  const expressionScoreRef = useRef(expressionScore)

  useEffect(() => { eyeScoreRef.current = eyeScore }, [eyeScore])
  useEffect(() => { voiceScoreRef.current = voiceScore }, [voiceScore])
  useEffect(() => { postureScoreRef.current = postureScore }, [postureScore])
  useEffect(() => { expressionScoreRef.current = expressionScore }, [expressionScore])

  // เปิดกล้อง + รอ 1 วิก่อน ready
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setTimeout(() => setReady(true), 1000)
        }
      })
      .catch(err => console.error('Camera error:', err))
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  // นับเวลา Session
  useEffect(() => {
    if (!started) return
    const interval = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [started])

  // Warmup 10 วิหลังเริ่ม
  useEffect(() => {
    if (!started) return
    setWarmup(true)
    setWarmupSeconds(10)
    let count = 10
    const interval = setInterval(() => {
      count -= 1
      setWarmupSeconds(count)
      if (count <= 0) {
        clearInterval(interval)
        setWarmup(false)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [started])

  // เก็บค่าทุก 1 วินาที — เริ่มหลัง warmup เสร็จ
  useEffect(() => {
    if (!started || warmup) return
    const interval = setInterval(() => {
      eyeHistory.current.push(eyeScoreRef.current)
      voiceHistory.current.push(voiceScoreRef.current)
      postureHistory.current.push(postureScoreRef.current)
      expressionHistory.current.push(expressionScoreRef.current)
    }, 1000)
    return () => clearInterval(interval)
  }, [started, warmup])

  const handleStart = () => {
    eyeHistory.current = []
    voiceHistory.current = []
    postureHistory.current = []
    expressionHistory.current = []
    let count = 3
    setCountdown(count)
    const interval = setInterval(() => {
      count -= 1
      if (count === 0) {
        clearInterval(interval)
        setCountdown(null)
        setStarted(true)
      } else {
        setCountdown(count)
      }
    }, 1000)
  }

  const handleStop = () => {
    const avg = (arr) => arr.length > 0
      ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
      : 60
    navigate('/report', {
      state: {
        scores: {
          eyeContact: avg(eyeHistory.current),
          voice: avg(voiceHistory.current),
          posture: avg(postureHistory.current),
          expression: avg(expressionHistory.current),
          clarity: 60
        },
        topic,
        duration: seconds
      }
    })
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const indicators = [
    { label: 'Eye Contact', icon: '👁️', score: eyeScore },
    { label: 'Voice', icon: '🗣️', score: voiceScore },
    { label: 'Posture', icon: '🧍', score: postureScore },
    { label: 'Expression', icon: '😐', score: expressionScore },
    { label: 'Clarity', icon: '📝', score: 60 },
  ]

  const getColor = (score) => {
    if (score >= 80) return '#22c55e'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{backgroundColor: '#030712'}}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <span className="text-indigo-400 text-sm font-medium">หัวข้อ: {topic}</span>
        </div>

        <div className="relative w-full aspect-video rounded-3xl overflow-hidden mb-6" style={{backgroundColor: '#111827'}}>
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />

          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center" style={{backgroundColor: 'rgba(0,0,0,0.7)'}}>
              <p className="text-gray-400 text-sm">กำลังเปิดกล้อง...</p>
            </div>
          )}

          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center" style={{backgroundColor: 'rgba(0,0,0,0.6)'}}>
              <span className="text-white font-bold" style={{fontSize: '8rem'}}>{countdown}</span>
            </div>
          )}

          {started && !warmup && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-white text-sm font-medium">REC {formatTime(seconds)}</span>
            </div>
          )}

          {started && warmup && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
              <span className="text-white text-sm font-medium">เตรียมตัว... {formatTime(seconds)}</span>
            </div>
          )}

          {started && warmup && (
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full" style={{backgroundColor: 'rgba(99,102,241,0.85)'}}>
              <span className="text-white text-sm font-bold">⏳ เริ่มจับคะแนนใน {warmupSeconds} วิ</span>
            </div>
          )}

          {started && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-2">
                <span className="text-white text-xs">🎙</span>
                <div className="flex-1 h-1 rounded-full" style={{backgroundColor: '#374151'}}>
                  <div className="h-1 rounded-full transition-all duration-100" style={{width: `${volume}%`, backgroundColor: '#818cf8'}}></div>
                </div>
              </div>
            </div>
          )}

          {ready && !started && countdown === null && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500">กด "เริ่มบันทึก" เพื่อเริ่ม</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2 mb-8">
          {indicators.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1 p-3 rounded-2xl" style={{backgroundColor: '#111827'}}>
              <span className="text-2xl">{item.icon}</span>
              <span className="text-gray-400 text-xs text-center">{item.label}</span>
              <div className="w-full h-1 rounded-full bg-gray-700">
                <div className="h-1 rounded-full transition-all duration-300" style={{width: `${item.score}%`, backgroundColor: getColor(item.score)}}></div>
              </div>
              <span className="text-xs font-bold" style={{color: getColor(item.score)}}>{item.score}</span>
            </div>
          ))}
        </div>

        {ready && !started && countdown === null && (
          <button onClick={handleStart} className="w-full py-4 rounded-2xl text-white text-lg font-semibold" style={{backgroundColor: '#4f46e5'}}>
            🎙 เริ่มบันทึก
          </button>
        )}

        {started && (
          <button onClick={handleStop} className="w-full py-4 rounded-2xl text-white text-lg font-semibold" style={{backgroundColor: '#dc2626'}}>
            ⏹ หยุดบันทึก
          </button>
        )}
      </div>
    </div>
  )
}

export default Session