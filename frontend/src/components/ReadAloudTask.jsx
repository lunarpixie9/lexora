import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Sparkles, ChevronRight, Volume2, AlertCircle } from 'lucide-react';
import { analyzeReadAloud } from '../utils/analyzer';
import micImg from '../assets/mic.jpg';
import heroImg from '../assets/hero.jpg';
import parkImg from '../assets/park.jpg';
import oceanImg from '../assets/ocean.jpg';
import rabbitImg from '../assets/brave_rabbit.jpg';
import nightSkyImg from '../assets/night_sky.jpg';

const ALL_PASSAGES = [
  { id: 1, image: heroImg, title: "The Little Bear's Flight", text: "The little bear wanted to fly. He found a big balloon and held on tight. Up, up, up he went into the blue sky. He saw clouds that looked like fluffy sheep and birds that sang sweet songs.", difficulty: 'Easy' },
  { id: 2, image: parkImg, title: "A Day in the Park", text: "The sun was shining and the children ran out to play. A big brown dog chased butterflies across the green grass. They had a picnic with sandwiches and juice under a tall oak tree.", difficulty: 'Easy' },
  { id: 3, image: oceanImg, title: "The Brave Sailors", text: "Two children sailed a small boat across the wide blue sea. A friendly whale swam beside them and splashed water with its tail. Seagulls flew above and fish jumped out of the waves.", difficulty: 'Medium' },
  { id: 4, image: rabbitImg, title: "The Brave Rabbit", text: "Once upon a time, a brave rabbit named Pepper lived near a pond. Every morning, she hopped through the dewy grass to visit her friend, a wise old frog. Together they would count the pebbles on the shore.", difficulty: 'Medium' },
  { id: 5, image: null, title: "The Magic Garden", text: "Behind the old wooden door, there was a garden where flowers could talk and butterflies told stories. The biggest sunflower was the librarian, keeping all the stories safe between her golden petals.", difficulty: 'Hard' },
  { id: 6, image: nightSkyImg, title: "The Night Sky", text: "When the moon comes out, the stars begin to dance. The owl watches from the branch of a great pine tree. Below, the river catches silver light and carries it downstream to the sleeping village.", difficulty: 'Hard' },
];

function pickRandomPassages(count = 3) {
  const shuffled = [...ALL_PASSAGES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function ReadAloudTask() {
  const [isRecording, setIsRecording] = useState(false);
  const [finished, setFinished] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [allResults, setAllResults] = useState([]);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  const passages = useMemo(() => pickRandomPassages(3), []);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSpeechSupported(false);
    return () => { if (timerRef.current) clearInterval(timerRef.current); if (recognitionRef.current) recognitionRef.current.abort(); };
  }, []);

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSpeechSupported(false); return; }
    const recognition = new SR();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US';
    let finalT = '';
    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalT += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      setTranscript(finalT); setInterimTranscript(interim);
    };
    recognition.onerror = (e) => { if (e.error === 'not-allowed') setSpeechSupported(false); };
    recognition.onend = () => { if (isRecording) { try { recognition.start(); } catch (_) {} } };
    recognitionRef.current = recognition; recognition.start();
    setIsRecording(true); setFinished(false); setTranscript(''); setInterimTranscript(''); setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const stopRecording = () => {
    setIsRecording(false); clearInterval(timerRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();
    setTimeout(() => {
      const p = passages[currentIndex];
      const analysis = analyzeReadAloud(transcript, p.text, seconds || 1);
      setCurrentAnalysis(analysis);
      setAllResults(prev => [...prev, { passage: p.title, transcript, analysis, duration: seconds }]);
      setFinished(true);
    }, 500);
  };

  const handleNext = () => {
    if (currentIndex < passages.length - 1) {
      setCurrentIndex(currentIndex + 1); setFinished(false); setSeconds(0);
      setTranscript(''); setInterimTranscript(''); setCurrentAnalysis(null);
    } else {
      sessionStorage.setItem('lexora_results', JSON.stringify({ type: 'read-aloud', results: allResults, timestamp: new Date().toISOString() }));
      navigate('/results');
    }
  };

  const passage = passages[currentIndex];
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const sc = (s) => s >= 75 ? '#4caf50' : s >= 50 ? '#ff9800' : '#f44336';
  const hasImage = !!passage.image;

  return (
    <div style={{
      height: 'calc(100vh - 70px)', overflow: 'hidden',
      background: 'linear-gradient(180deg, #fdf8f0 0%, var(--color-bg-cream) 100%)',
      padding: '1rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center'
    }}>
      {/* Progress */}
      <div style={{ maxWidth: '1100px', width: '100%', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontWeight: 600 }}>Passage {currentIndex + 1} of {passages.length}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>🎙️ Read Aloud Magic</span>
        </div>
        <div style={{ height: '5px', backgroundColor: '#e5dccf', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((currentIndex + (finished ? 1 : 0)) / passages.length) * 100}%`, backgroundColor: '#5ba4b5', borderRadius: '3px', transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Main Card */}
      <div style={{
        maxWidth: '1100px', width: '100%', flex: 1, backgroundColor: 'white',
        borderRadius: '16px', boxShadow: '0 4px 30px rgba(0,0,0,0.05)',
        border: '2px dashed var(--color-border-soft)', overflow: 'hidden',
        display: 'flex', flexDirection: hasImage && !finished ? 'row' : 'column',
      }}>

        {/* Image Panel (left side) */}
        {hasImage && !finished && (
          <div style={{ flex: '0 0 40%', maxWidth: '40%', overflow: 'hidden', position: 'relative' }}>
            <img src={passage.image} alt="Reading scene" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="animate-float" style={{
              position: 'absolute', top: '12px', right: '12px',
              width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden',
              border: '3px solid white', boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
            }}>
              <img src={micImg} alt="Mic" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        )}

        {/* Content Panel */}
        <div style={{
          flex: 1, padding: hasImage && !finished ? '1.5rem 2rem' : '2rem 3rem',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          overflow: 'auto', position: 'relative'
        }}>
          {/* Mascot for no-image prompts */}
          {!hasImage && !finished && (
            <div className="animate-float" style={{
              position: 'absolute', top: '10px', right: '15px',
              width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden',
              border: '4px solid white', boxShadow: 'var(--shadow-soft)', zIndex: 10
            }}>
              <img src={micImg} alt="Mic" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {!speechSupported && (
            <div style={{ backgroundColor: '#fff3e0', border: '1px solid #ffcc80', borderRadius: '10px', padding: '0.6rem 1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} color="#ff9800" />
              <p style={{ color: '#e65100', fontSize: '0.8rem' }}>Speech recognition requires Chrome or Edge.</p>
            </div>
          )}

          {!finished ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <Sparkles color="#5ba4b5" size={22} />
                <h2 style={{ fontSize: '1.4rem', color: '#8a715a', margin: 0 }}>{passage.title}</h2>
                <span style={{ backgroundColor: '#e8f4f7', color: '#5ba4b5', padding: '0.15rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, marginLeft: '0.5rem' }}>{passage.difficulty}</span>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginBottom: '0.75rem' }}>
                Read aloud. Lexora listens and compares what you say to the text below.
              </p>

              {/* Passage */}
              <div style={{
                padding: '1rem 1.25rem', backgroundColor: '#fffcf9',
                border: '1.5px solid var(--color-border-soft)', borderRadius: '12px',
                fontSize: '1.15rem', lineHeight: 1.9, color: '#333',
                marginBottom: '0.75rem', fontFamily: 'var(--font-primary)', position: 'relative'
              }}>
                <Volume2 size={14} color="#ccc" style={{ position: 'absolute', top: '8px', right: '10px' }} />
                "{passage.text}"
              </div>

              {/* Live Transcript */}
              {isRecording && (transcript || interimTranscript) && (
                <div style={{ padding: '0.5rem 1rem', backgroundColor: '#f0f7fa', borderRadius: '10px', marginBottom: '0.75rem', border: '1px solid #b3dde8' }}>
                  <p style={{ fontSize: '0.7rem', color: '#5ba4b5', fontWeight: 600, marginBottom: '0.15rem' }}>🎤 Lexora hears:</p>
                  <p style={{ color: '#333', fontSize: '0.85rem', lineHeight: 1.5 }}>{transcript}<span style={{ color: '#999' }}>{interimTranscript}</span></p>
                </div>
              )}

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                {isRecording && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 1rem', backgroundColor: '#fef2f2', borderRadius: '20px', border: '1px solid #fecaca' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'float 1s ease-in-out infinite' }} />
                    <span style={{ fontWeight: 600, color: '#dc2626', fontFamily: 'monospace', fontSize: '0.95rem' }}>{fmt(seconds)}</span>
                  </div>
                )}
                <button onClick={isRecording ? stopRecording : startRecording} disabled={!speechSupported}
                  style={{
                    backgroundColor: !speechSupported ? '#ccc' : isRecording ? '#ef4444' : '#5ba4b5',
                    color: 'white', padding: '0.7rem 2rem', fontSize: '1rem',
                    borderRadius: 'var(--border-radius-pill)', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    boxShadow: isRecording ? '0 3px 12px rgba(239,68,68,0.3)' : '0 3px 12px rgba(91,164,181,0.3)',
                    cursor: !speechSupported ? 'not-allowed' : 'pointer', fontWeight: 600, transition: 'all 0.2s'
                  }}>
                  {isRecording ? <Square size={16} /> : <Mic size={16} />}
                  {isRecording ? 'Stop Reading' : 'Start Reading'}
                </button>
              </div>
            </>
          ) : (
            /* ===== RESULTS VIEW ===== */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'auto', flex: 1, justifyContent: 'center' }}>
              <span style={{ fontSize: '3rem' }}>🎉</span>
              <h2 style={{ fontSize: '1.6rem', color: '#8a715a', margin: '0.3rem 0' }}>Wonderful reading!</h2>
              <p style={{ color: 'var(--color-text-light)', marginBottom: '1rem', fontSize: '0.9rem' }}>You read for <strong>{fmt(seconds)}</strong></p>

              {currentAnalysis && (
                <div style={{ backgroundColor: '#f8f6f2', borderRadius: '12px', padding: '1rem 1.5rem', width: '100%', maxWidth: '550px', marginBottom: '1rem' }}>
                  <h3 style={{ color: 'var(--color-text-dark)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>📊 Reading Analysis</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {currentAnalysis.indicators.map((ind, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                          <span style={{ fontSize: '0.82rem' }}>{ind.icon} {ind.name}</span>
                          <span style={{ fontWeight: 700, color: sc(ind.score), fontSize: '0.82rem' }}>{ind.detail || `${ind.score}%`}</span>
                        </div>
                        <div style={{ height: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px' }}>
                          <div style={{ height: '100%', width: `${ind.score}%`, backgroundColor: sc(ind.score), borderRadius: '2px', transition: 'width 0.6s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {transcript && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600, marginBottom: '0.2rem' }}>What Lexora heard:</p>
                      <p style={{ backgroundColor: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: '#555', border: '1px solid #e5dccf', lineHeight: 1.5, maxHeight: '60px', overflow: 'auto' }}>{transcript}</p>
                    </div>
                  )}
                </div>
              )}

              <button onClick={handleNext} style={{
                backgroundColor: '#5ba4b5', color: 'white', padding: '0.7rem 2rem', fontSize: '1rem',
                borderRadius: 'var(--border-radius-pill)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 3px 12px rgba(91,164,181,0.3)', cursor: 'pointer', fontWeight: 600
              }}>
                {currentIndex < passages.length - 1 ? 'Next Passage' : 'See My Results'} <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
