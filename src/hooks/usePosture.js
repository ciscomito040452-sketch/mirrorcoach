import { useEffect, useRef, useState } from 'react'
import { Pose } from '@mediapipe/pose'

export function usePosture(videoRef, started) {
  const [postureScore, setPostureScore] = useState(60)
  const displayScore = useRef(60)
  const scoreHistory = useRef([])
  const intervalRef = useRef(null)

  // Calibration baseline
  const baseline = useRef(null)
  const calibrationFrames = useRef([])
  const isCalibrating = useRef(false)
  const calibrationDone = useRef(false)

  useEffect(() => {
    if (!videoRef.current || !started) return

    // รีเซ็ตทุกครั้งที่เริ่มใหม่
    baseline.current = null
    calibrationFrames.current = []
    calibrationDone.current = false
    isCalibrating.current = true

    // Calibrate 5 วิแรก
    const calibrateTimeout = setTimeout(() => {
      if (calibrationFrames.current.length > 0) {
        const avgNoseToShoulder = calibrationFrames.current.reduce((a, b) => a + b.noseToShoulder, 0) / calibrationFrames.current.length
        const avgShoulderWidth = calibrationFrames.current.reduce((a, b) => a + b.shoulderWidth, 0) / calibrationFrames.current.length
        const avgShoulderDiff = calibrationFrames.current.reduce((a, b) => a + b.shoulderDiff, 0) / calibrationFrames.current.length
        baseline.current = { avgNoseToShoulder, avgShoulderWidth, avgShoulderDiff }
      }
      isCalibrating.current = false
      calibrationDone.current = true
    }, 5000)

    const pose = new Pose({
      locateFile: (file) => `/mediapipe/pose/${file}`
    })

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })

    pose.onResults((results) => {
      if (!results.poseLandmarks) {
        displayScore.current = Math.max(0, displayScore.current - 2)
        setPostureScore(Math.round(displayScore.current))
        return
      }

      const lm = results.poseLandmarks
      const leftShoulder = lm[11]
      const rightShoulder = lm[12]
      const nose = lm[0]

      const noseToShoulder = ((leftShoulder.y + rightShoulder.y) / 2) - nose.y
      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x)
      const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y)

      // ช่วง calibrate — เก็บ baseline
      if (isCalibrating.current) {
        calibrationFrames.current.push({ noseToShoulder, shoulderWidth, shoulderDiff })
        return
      }

      // ยังไม่มี baseline — ใช้สูตรเดิม
      if (!baseline.current) {
        const shoulderPenalty = Math.min(1, shoulderDiff * 20)
        const headPenalty = noseToShoulder < 0.15 ? 1 : Math.max(0, 1 - (noseToShoulder - 0.15) * 8)
        const shoulderHunchPenalty = shoulderWidth < 0.25 ? Math.min(1, (0.25 - shoulderWidth) * 10) : 0
        const totalPenalty = shoulderPenalty * 0.35 + headPenalty * 0.45 + shoulderHunchPenalty * 0.2
        const raw = Math.round(Math.max(0, Math.min(100, (1 - totalPenalty) * 100)))
        scoreHistory.current.push(raw)
        if (scoreHistory.current.length > 15) scoreHistory.current.shift()
        const avg = Math.round(scoreHistory.current.reduce((a, b) => a + b, 0) / scoreHistory.current.length)
        if (avg > displayScore.current) {
          displayScore.current = Math.min(avg, displayScore.current + 0.5)
        } else {
          displayScore.current = Math.max(avg, displayScore.current - 0.5)
        }
        setPostureScore(Math.round(displayScore.current))
        return
      }

      // วัดเบี่ยงจาก baseline
      const b = baseline.current

      // หัวก้มลงจาก baseline
      const headDrop = b.avgNoseToShoulder - noseToShoulder
      const headPenalty = Math.min(1, Math.max(0, headDrop * 10))

      // ไหล่แคบลงจาก baseline (ห่อไหล่)
      const widthDrop = b.avgShoulderWidth - shoulderWidth
      const shoulderHunchPenalty = Math.min(1, Math.max(0, widthDrop * 8))

      // ไหล่เอียง
      const shoulderPenalty = Math.min(1, shoulderDiff * 20)

      const totalPenalty = headPenalty * 0.45 + shoulderHunchPenalty * 0.35 + shoulderPenalty * 0.2
      const raw = Math.round(Math.max(0, Math.min(100, (1 - totalPenalty) * 100)))

      scoreHistory.current.push(raw)
      if (scoreHistory.current.length > 15) scoreHistory.current.shift()
      const avg = Math.round(scoreHistory.current.reduce((a, b) => a + b, 0) / scoreHistory.current.length)

      if (avg > displayScore.current) {
        displayScore.current = Math.min(avg, displayScore.current + 0.5)
      } else {
        displayScore.current = Math.max(avg, displayScore.current - 0.5)
      }
      setPostureScore(Math.round(displayScore.current))
    })

    intervalRef.current = setInterval(async () => {
      if (videoRef.current) {
        await pose.send({ image: videoRef.current })
      }
    }, 200)

    return () => {
      clearTimeout(calibrateTimeout)
      clearInterval(intervalRef.current)
      pose.close()
    }
  }, [started])

  return { postureScore }
}