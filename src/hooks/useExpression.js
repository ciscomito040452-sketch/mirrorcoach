import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'

export function useExpression(videoRef, started) {
  const [expressionScore, setExpressionScore] = useState(60)
  const displayScore = useRef(60)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!videoRef.current || !started) return

    const loadAndStart = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
      await faceapi.nets.faceExpressionNet.loadFromUri('/models')

      intervalRef.current = setInterval(async () => {
        if (!videoRef.current) return

        const detections = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions()

        if (!detections) {
          displayScore.current = Math.max(0, displayScore.current - 2)
          setExpressionScore(displayScore.current)
          return
        }

        const expr = detections.expressions
        const happy = expr.happy || 0
        const neutral = expr.neutral || 0
        const fearful = expr.fearful || 0
        const sad = expr.sad || 0

        // ดี: happy เหมาะสม + neutral ไม่เยอะเกิน + fearful/sad น้อย
        let raw = 60
        raw += happy * 40
        raw -= fearful * 50
        raw -= sad * 30
        if (neutral > 0.85) raw -= 20

        raw = Math.max(0, Math.min(100, Math.round(raw)))

        if (raw > displayScore.current) {
          displayScore.current = Math.min(raw, displayScore.current + 2)
        } else {
          displayScore.current = Math.max(raw, displayScore.current - 2)
        }

        setExpressionScore(displayScore.current)
      }, 300)
    }

    loadAndStart()

    return () => {
      clearInterval(intervalRef.current)
    }
  }, [started])

  return { expressionScore }
}