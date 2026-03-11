import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  const handleTopic = (topic) => {
    navigate('/session', { state: { topic } })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{backgroundColor: '#030712'}}>
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🪞</div>
        <h1 className="text-5xl font-bold text-white mb-3">MirrorCoach</h1>
        <p className="text-gray-400 text-lg">AI Coach วิเคราะห์การพูดของคุณแบบ Real-time</p>
      </div>

      <div className="w-full max-w-md space-y-3 mb-10">
        <p className="text-gray-400 text-sm text-center mb-4">เลือกหัวข้อที่จะพูด</p>
        {['นำเสนองาน', 'สัมภาษณ์งาน', 'พูดอิสระ'].map((topic) => (
          <button
            key={topic}
            onClick={() => handleTopic(topic)}
            className="w-full py-4 rounded-2xl text-white text-lg font-medium transition-all duration-200"
            style={{backgroundColor: '#1f2937'}}
            onMouseEnter={e => e.target.style.backgroundColor = '#4f46e5'}
            onMouseLeave={e => e.target.style.backgroundColor = '#1f2937'}
          >
            {topic}
          </button>
        ))}
      </div>

      <button className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
        ดูประวัติการฝึก →
      </button>
    </div>
  )
}

export default Home