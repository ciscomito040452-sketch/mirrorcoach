import { useEffect, useRef, useState } from 'react'
import { FaceMesh } from '@mediapipe/face_mesh'
import * as faceapi from 'face-api.js'

export function useMediaPipe(videoRef, started) {
  const [eyeScore, setEyeScore] = useState(50)
  const [expressionScore, setExpressionScore] = useState(30)
  const displayEye = useRef(50)
  const displayExpr = useRef(30)
  const eyeHistoryRef = useRef([])
  const intervalRef = useRef(null)
  const exprIntervalRef = useRef(null)
  const faceApiLoaded = useRef(false)
  const engagementHistory = useRef([])
  const expressionLog = useRef([])

  // Eye Contact — วัดทิศทางหน้า
  useEffect(() => {
    if (!videoRef.current) return

    const faceMesh = new FaceMesh({
      locateFile: (file) => `/mediapipe/face_mesh/${file}`
    })

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })

    faceMesh.onResults((results) => {
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        eyeHistoryRef.current = []
        displayEye.current = Math.max(0, displayEye.current - 3)
        setEyeScore(Math.round(displayEye.current))
        return
      }

      const lm = results.multiFaceLandmarks[0]
      const noseTip = lm[1]
      const leftEdge = lm[234]
      const rightEdge = lm[454]
      const forehead = lm[10]
      const chin = lm[152]

      // Yaw — หันซ้าย/ขวา
      const faceWidth = Math.abs(rightEdge.x - leftEdge.x)
      const noseMidX = (leftEdge.x + rightEdge.x) / 2
      const yawOffset = Math.abs(noseTip.x - noseMidX) / faceWidth
      const yawPenalty = Math.min(1, yawOffset * 4)

      // Pitch — ก้มหน้า/เงยหน้า
      const faceHeight = Math.abs(chin.y - forehead.y)
      const noseMidY = (forehead.y + chin.y) / 2
      const pitchOffset = Math.abs(noseTip.y - noseMidY) / faceHeight
      const pitchPenalty = Math.min(1, pitchOffset * 3)

      const totalPenalty = yawPenalty * 0.6 + pitchPenalty * 0.4
      const rawEye = Math.round(Math.max(0, Math.min(100, (1 - totalPenalty) * 100)))

      eyeHistoryRef.current.push(rawEye)
      if (eyeHistoryRef.current.length > 5) eyeHistoryRef.current.shift()
      const avgEye = Math.round(eyeHistoryRef.current.reduce((a, b) => a + b, 0) / eyeHistoryRef.current.length)

      if (avgEye > displayEye.current) {
        displayEye.current = Math.min(avgEye, displayEye.current + 3)
      } else {
        displayEye.current = Math.round(Math.max(avgEye, displayEye.current - 2))
      }
      setEyeScore(Math.round(displayEye.current))
    })

    intervalRef.current = setInterval(async () => {
      if (videoRef.current) await faceMesh.send({ image: videoRef.current })
    }, 100)

    return () => {
      clearInterval(intervalRef.current)
      faceMesh.close()
    }
  }, [videoRef])

  // Expression — วัด Engagement + Consistency
  useEffect(() => {
    if (!started) return

    const loadAndRun = async () => {
      try {
        if (!faceApiLoaded.current) {
          await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
          await faceapi.nets.faceExpressionNet.loadFromUri('/models')
          faceApiLoaded.current = true
        }

        exprIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) return
          try {
            const det = await faceapi
              .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
              .withFaceExpressions()

            if (!det) {
              displayExpr.current = Math.max(0, displayExpr.current - 1)
              setExpressionScore(Math.round(displayExpr.current))
              return
            }

            const expr = det.expressions
            const happy = expr.happy || 0
            const neutral = expr.neutral || 0
            const fearful = expr.fearful || 0
            const sad = expr.sad || 0
            const disgusted = expr.disgusted || 0
            const angry = expr.angry || 0
            const surprised = expr.surprised || 0

            // กรอง false happy จากปากขยับตอนพูด
            // ถ้า happy < 0.5 ถือว่ายังไม่แน่ใจ ลด weight ลง
            const realHappy = happy >= 0.5 ? happy : happy * 0.4

            // Engagement Score
            let engagement = 25
            engagement += realHappy * 90
            engagement += surprised * 15
            engagement -= neutral * 8
            engagement -= fearful * 60
            engagement -= sad * 50
            engagement -= disgusted * 50
            engagement -= angry * 50
            engagement = Math.max(0, Math.min(100, Math.round(engagement)))

            engagementHistory.current.push(engagement)
            if (engagementHistory.current.length > 8) engagementHistory.current.shift()
            const avgEngagement = Math.round(
              engagementHistory.current.reduce((a, b) => a + b, 0) / engagementHistory.current.length
            )

            // Consistency Score — แสดงออกเป็นธรรมชาติ
            const dominant = Object.entries(expr).sort((a, b) => b[1] - a[1])[0][0]
            expressionLog.current.push(dominant)
            if (expressionLog.current.length > 30) expressionLog.current.shift()

            let consistencyScore = 60
            if (expressionLog.current.length >= 10) {
              let changes = 0
              for (let i = 1; i < expressionLog.current.length; i++) {
                if (expressionLog.current[i] !== expressionLog.current[i - 1]) changes++
              }
              const changeRate = changes / expressionLog.current.length
              if (changeRate < 0.1) consistencyScore = 30        // เฉยตลอด
              else if (changeRate < 0.2) consistencyScore = 60
              else if (changeRate <= 0.5) consistencyScore = 90  // natural
              else consistencyScore = 70                         // เปลี่ยนถี่เกิน
            }

            // รวม Engagement 85% + Consistency 15%
            const raw = Math.round(avgEngagement * 0.85 + consistencyScore * 0.15)

            if (raw > displayExpr.current) {
              displayExpr.current = Math.min(raw, displayExpr.current + 5)
            } else {
              displayExpr.current = Math.round(Math.max(raw, displayExpr.current - 1))
            }
            setExpressionScore(Math.round(displayExpr.current))
          } catch (e) {}
        }, 400)
      } catch (e) {
        console.error('face-api load error:', e)
      }
    }

    loadAndRun()
    return () => clearInterval(exprIntervalRef.current)
  }, [started])

  return { eyeScore, expressionScore }
}