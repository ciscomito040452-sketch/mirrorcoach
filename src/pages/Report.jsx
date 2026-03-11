import { useNavigate, useLocation } from 'react-router-dom'

function ScoreBar({ label, icon, score }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl" style={{backgroundColor: '#111827'}}>
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-white text-sm font-medium">{label}</span>
          <span className="text-sm font-bold" style={{color}}>{score}</span>
        </div>
        <div className="w-full h-2 rounded-full" style={{backgroundColor: '#374151'}}>
          <div className="h-2 rounded-full transition-all duration-1000" style={{width: `${score}%`, backgroundColor: color}}></div>
        </div>
      </div>
    </div>
  )
}

function Report() {
  const navigate = useNavigate()
  const location = useLocation()
  const scores = location.state?.scores
  const topic = location.state?.topic || 'พูดอิสระ'
  const duration = location.state?.duration || 0

  const eyeContact = scores?.eyeContact || 0
  const voice = scores?.voice || 0
  const posture = scores?.posture || 0
  const expression = scores?.expression || 0
  const clarity = scores?.clarity || 60

  const overall = Math.round((eyeContact + voice + posture + expression + clarity) / 5)

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m} นาที ${sec} วินาที`
  }

  const getFeedback = () => {
    const feedbacks = []
    if (eyeContact < 60) feedbacks.push('ควรมองตรงกล้องให้มากขึ้น อย่าให้สายตาหลุดออกข้างๆ บ่อย')
    else if (eyeContact >= 80) feedbacks.push('Eye Contact ดีมาก! มองตรงกล้องได้อย่างมั่นใจ')
    if (voice < 60) feedbacks.push('เสียงค่อนข้างเบา ลองพูดให้ดังและชัดขึ้น')
    else if (voice >= 80) feedbacks.push('น้ำเสียงดีมาก พูดได้ชัดเจนและพอดี')
    if (posture < 60) feedbacks.push('ท่าทางควรตั้งตรงมากขึ้น อย่าก้มหัวหรือเอียงไหล่')
    else if (posture >= 80) feedbacks.push('ท่าทางดูดี ตั้งตรงและมั่นใจ')
    if (expression < 60) feedbacks.push('ลองยิ้มและแสดงความมั่นใจออกมามากขึ้น')
    else if (expression >= 80) feedbacks.push('การแสดงออกดีมาก ดูเป็นธรรมชาติและเป็นมิตร')
    return feedbacks.length > 0 ? feedbacks.join(' และ') : 'ผลการพูดอยู่ในเกณฑ์ดี ทำต่อไปเรื่อยๆ!'
  }

  const getDrills = () => {
    const drills = []
    if (eyeContact < 70) drills.push('ฝึกมองกล้องตรงๆ 30 วินาทีโดยไม่กะพริบตาถี่เกิน')
    if (voice < 70) drills.push('อ่านข่าวออกเสียงดังๆ 5 นาที ให้คนในห้องได้ยินชัดเจน')
    if (posture < 70) drills.push('ฝึกนั่งตัวตรงหน้ากระจก ไหล่เสมอกัน หัวตั้งตรง')
    if (expression < 70) drills.push('ฝึกยิ้มเป็นธรรมชาติขณะพูด ลองพูดหน้ากระจกแล้วสังเกตสีหน้า')
    if (drills.length === 0) drills.push('ทำได้ดีมาก! ลองเพิ่มเวลาพูดเป็น 3-5 นาทีในครั้งต่อไป')
    return drills
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{backgroundColor: '#030712'}}>
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-8">
          <p className="text-gray-400 text-sm mb-1">หัวข้อ: {topic} · {formatTime(duration)}</p>
          <h1 className="text-3xl font-bold text-white mb-4">ผลการวิเคราะห์</h1>
          <div className="text-7xl font-bold mb-1" style={{color: overall >= 80 ? '#22c55e' : overall >= 60 ? '#f59e0b' : '#ef4444'}}>{overall}</div>
          <p className="text-gray-400">คะแนนรวม</p>
        </div>

        <div className="space-y-3 mb-8">
          <ScoreBar label="Eye Contact" icon="👁️" score={eyeContact} />
          <ScoreBar label="Voice & Pace" icon="🗣️" score={voice} />
          <ScoreBar label="Posture" icon="🧍" score={posture} />
          <ScoreBar label="Expression" icon="😐" score={expression} />
          <ScoreBar label="Content Clarity" icon="📝" score={clarity} />
        </div>

        <div className="p-5 rounded-2xl mb-6" style={{backgroundColor: '#111827'}}>
          <h2 className="text-white font-semibold mb-3">💬 Feedback</h2>
          <p className="text-gray-300 leading-relaxed">{getFeedback()}</p>
        </div>

        <div className="p-5 rounded-2xl mb-8" style={{backgroundColor: '#111827'}}>
          <h2 className="text-white font-semibold mb-3">🏋️ Drill Exercises</h2>
          <div className="space-y-3">
            {getDrills().map((drill, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-indigo-400 font-bold">{i + 1}.</span>
                <p className="text-gray-300">{drill}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-4 rounded-2xl text-white font-semibold"
            style={{backgroundColor: '#4f46e5'}}
          >
            ฝึกซ้ำ
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-4 rounded-2xl text-gray-300 font-semibold"
            style={{backgroundColor: '#1f2937'}}
          >
            กลับหน้าหลัก
          </button>
        </div>

      </div>
    </div>
  )
}

export default Report