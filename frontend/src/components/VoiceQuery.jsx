import { useState, useRef, useEffect, useCallback } from 'react'
import { API_BASE } from '../utils/constants'

const EXAMPLE_QUERIES = [
  "What is Balaghat's shortfall?",
  "Show Dongri Buzurg anomalies",
  "Which mine has the worst performance?",
  "Fleet overview",
  "Kandri health status",
  "How many critical alerts?",
]

export default function VoiceQuery({ onClose, lang = 'en' }) {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, { role: 'system', text: 'Speech recognition not supported in this browser. Please type your query.' }])
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setQuery(transcript)
      setListening(false)
      handleSend(transcript)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setListening(false)
    }
  }

  const handleSend = async (text) => {
    const q = text || query
    if (!q.trim()) return

    setMessages(prev => [...prev, { role: 'user', text: q }])
    setQuery('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/nlp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, lang }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.answer_display || data.answer,
        type: data.type,
        mine_id: data.mine_id,
        data: data.data,
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'system', text: 'Failed to process query. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const [speaking, setSpeaking] = useState(null)
  const audioRef = useRef(null)

  const handleSpeak = useCallback(async (text, idx) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (speaking === idx) {
      setSpeaking(null)
      return
    }

    setSpeaking(idx)
    try {
      const res = await fetch(`${API_BASE}/nlp/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      })
      const data = await res.json()
      if (data.audio) {
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`)
        audioRef.current = audio
        audio.onended = () => { setSpeaking(null); audioRef.current = null }
        audio.play()
      } else {
        setSpeaking(null)
      }
    } catch {
      setSpeaking(null)
    }
  }, [speaking, lang])

  const labels = {
    en: { title: 'AI Query Assistant', sub: 'Ask in English, Hindi, or Marathi — type or use voice', placeholder: 'Ask about any mine...', send: 'Send', listening: 'Listening...', examples: 'Try asking:' },
    hi: { title: 'AI क्वेरी सहायक', sub: 'अंग्रेज़ी, हिंदी या मराठी में पूछें', placeholder: 'किसी भी खदान के बारे में पूछें...', send: 'भेजें', listening: 'सुन रहा है...', examples: 'ये पूछकर देखें:' },
    mr: { title: 'AI क्वेरी सहाय्यक', sub: 'इंग्रजी, हिंदी किंवा मराठीत विचारा', placeholder: 'कोणत्याही खाणीबद्दल विचारा...', send: 'पाठवा', listening: 'ऐकत आहे...', examples: 'असे विचारा:' },
  }
  const l = labels[lang] || labels.en

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <span className="text-xl">🧠</span> {l.title}
            </h2>
            <p className="text-xs text-text-muted">{l.sub}</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1 rounded-lg border border-border">
            {lang === 'hi' ? 'बंद करें' : lang === 'mr' ? 'बंद करा' : 'Close'}
          </button>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">🎙️</p>
              <p className="text-sm text-text-muted mb-4">{l.examples}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_QUERIES.map((eq, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(eq)}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : msg.role === 'system'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
                    : 'bg-surface border border-border rounded-bl-sm'
              }`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs">🧠</span>
                    <span className="text-[10px] text-text-muted uppercase font-semibold">
                      {msg.type === 'forecast' ? 'Forecast' : msg.type === 'anomaly' ? 'Anomaly' : msg.type === 'alerts' ? 'Alerts' : msg.type === 'fleet' ? 'Fleet' : msg.type === 'ranking' ? 'Ranking' : 'Info'}
                    </span>
                    {msg.mine_id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{msg.mine_id}</span>
                    )}
                    <button
                      onClick={() => handleSpeak(msg.text, i)}
                      className={`ml-auto text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                        speaking === i
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-surface hover:bg-primary/10 text-text-muted hover:text-primary'
                      }`}
                      title={speaking === i ? 'Stop' : 'Read aloud'}
                    >
                      {speaking === i ? '⏹ Stop' : '🔊 Listen'}
                    </button>
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">
                  {msg.text.split(/(\*\*.*?\*\*)/).map((part, pi) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={pi}>{part.slice(2, -2)}</strong>
                      : part
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface border border-border rounded-xl px-4 py-2 text-sm text-text-muted">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border p-3 md:p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={listening ? stopListening : startListening}
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                listening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
              title={listening ? l.listening : 'Voice input'}
            >
              {listening ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={l.placeholder}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !query.trim()}
              className="flex-shrink-0 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              {l.send}
            </button>
          </div>
          {listening && (
            <p className="text-xs text-red-500 mt-1.5 text-center animate-pulse">{l.listening}</p>
          )}
        </div>
      </div>
    </div>
  )
}
