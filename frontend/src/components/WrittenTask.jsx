import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, ChevronRight } from 'lucide-react';
import foxImg from '../assets/fox.jpg';
import heroImg from '../assets/hero.jpg';
import parkImg from '../assets/park.jpg';
import forestImg from '../assets/forest.jpg';
import oceanImg from '../assets/ocean.jpg';
import bestFriendImg from '../assets/best_friend.jpg';
import flyingSkyImg from '../assets/flying_sky.jpg';

const ALL_PROMPTS = [
  { id: 1, image: heroImg, title: "The Balloon Adventure", prompt: "Look at the picture! Can you describe what the animals are doing in the hot air balloon? Where do you think they are going?", keywords: ['balloon', 'animal', 'sky', 'fly', 'basket'] },
  { id: 2, image: parkImg, title: "A Day at the Park", prompt: "What is happening in this picture? Describe the park, the children, and the dog. What sounds would you hear?", keywords: ['park', 'child', 'dog', 'play', 'tree', 'grass'] },
  { id: 3, image: forestImg, title: "The Magic Door", prompt: "Imagine you found this magical door in the forest. You open it and step through. What do you see on the other side?", keywords: ['door', 'magic', 'forest', 'tree', 'wood'] },
  { id: 4, image: oceanImg, title: "Ocean Voyage", prompt: "Look at the boat and the whale! Write a story about these two children and their adventure at sea.", keywords: ['whale', 'boat', 'water', 'sea', 'ocean', 'child'] },
  { id: 5, image: bestFriendImg, title: "My Best Friend", prompt: "Tell us about your best friend. What do they look like? What do you do together? Why are they special?", keywords: ['friend', 'play', 'together', 'like', 'love'] },
  { id: 6, image: flyingSkyImg, title: "If I Could Fly", prompt: "If you could fly like a bird for one whole day, where would you go? What would you see from up high?", keywords: ['fly', 'bird', 'sky', 'high', 'see', 'wing'] },
];

function pickRandom(count = 3) {
  return [...ALL_PROMPTS].sort(() => Math.random() - 0.5).slice(0, count);
}

export default function WrittenTask() {
  const [text, setText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [allResults, setAllResults] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();
  const prompts = useMemo(() => pickRandom(3), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (text.trim().length < 10 || isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/assessment/written', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          expected_keywords: prompts[currentIndex].keywords
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setCurrentAnalysis(data.analysis);
        setAllResults(prev => [...prev, { prompt: prompts[currentIndex].title, text, analysis: data.analysis }]);
        setSubmitted(true);
      } else {
        alert("Sorry, there was an error analyzing your text.");
      }
    } catch (err) {
      console.error("Backend fetch error:", err);
      alert("Could not connect to the Lexora backend. Make sure it is running.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < prompts.length - 1) {
      setCurrentIndex(currentIndex + 1); setText(''); setSubmitted(false); setCurrentAnalysis(null);
    } else {
      sessionStorage.setItem('lexora_results', JSON.stringify({ type: 'written', results: allResults, timestamp: new Date().toISOString() }));
      navigate('/results');
    }
  };

  const prompt = prompts[currentIndex];
  const charCount = text.length;
  const hasImage = !!prompt.image;
  const sc = (s) => s >= 80 ? '#4caf50' : s >= 55 ? '#ff9800' : '#f44336';

  return (
    <div style={{
      height: 'calc(100vh - 70px)', overflow: 'hidden',
      background: 'linear-gradient(180deg, #fdf8f0 0%, var(--color-bg-cream) 100%)',
      padding: '1rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center'
    }}>
      {/* Progress */}
      <div style={{ maxWidth: '1100px', width: '100%', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontWeight: 600 }}>Task {currentIndex + 1} of {prompts.length}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>✏️ Written Adventure</span>
        </div>
        <div style={{ height: '5px', backgroundColor: '#e5dccf', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((currentIndex + (submitted ? 1 : 0)) / prompts.length) * 100}%`, backgroundColor: '#a05828', borderRadius: '3px', transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Main Card */}
      <div style={{
        maxWidth: '1100px', width: '100%', flex: 1, backgroundColor: 'white',
        borderRadius: '16px', boxShadow: '0 4px 30px rgba(0,0,0,0.05)',
        border: '2px dashed var(--color-border-soft)', overflow: 'hidden',
        display: 'flex', flexDirection: hasImage && !submitted ? 'row' : 'column',
      }}>

        {/* Image Panel */}
        {hasImage && !submitted && (
          <div style={{ flex: '0 0 38%', maxWidth: '38%', overflow: 'hidden', position: 'relative' }}>
            <img src={prompt.image} alt="Story prompt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="animate-float" style={{
              position: 'absolute', top: '12px', right: '12px',
              width: '55px', height: '55px', borderRadius: '50%', overflow: 'hidden',
              border: '3px solid white', boxShadow: '0 2px 10px rgba(0,0,0,0.15)'
            }}>
              <img src={foxImg} alt="Fox" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        )}

        {/* Content Panel */}
        <div style={{
          flex: 1, padding: hasImage && !submitted ? '1.5rem 2rem' : '2rem 3rem',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          overflow: 'auto', position: 'relative'
        }}>
          {!hasImage && !submitted && (
            <div className="animate-float" style={{
              position: 'absolute', top: '10px', right: '15px',
              width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden',
              border: '4px solid white', boxShadow: 'var(--shadow-soft)', zIndex: 10
            }}>
              <img src={foxImg} alt="Fox" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {!submitted ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Sparkles color="#a05828" size={22} />
                <h2 style={{ fontSize: '1.4rem', color: '#8a715a', margin: 0 }}>{prompt.title}</h2>
              </div>
              <p style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--color-text-dark)', lineHeight: 1.5 }}>{prompt.prompt}</p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <textarea value={text} onChange={(e) => setText(e.target.value)}
                  placeholder="Once upon a time..."
                  style={{
                    width: '100%', flex: 1, minHeight: '120px', maxHeight: '250px', padding: '1rem',
                    fontSize: '1.05rem', fontFamily: 'inherit', borderRadius: '12px',
                    border: '2px solid var(--color-border-soft)', backgroundColor: '#fffcf9',
                    resize: 'none', outline: 'none', transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#a05828'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border-soft)'}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: charCount > 10 ? '#4caf50' : '#8a715a' }}>
                  {charCount > 10 ? '✓ Looking great!' : 'Write a little more...'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#8a715a' }}>{charCount} chars</span>
                  <button type="submit" disabled={charCount < 10 || isAnalyzing} style={{
                    backgroundColor: charCount >= 10 && !isAnalyzing ? '#a05828' : '#e0d8d0',
                    color: charCount >= 10 && !isAnalyzing ? 'white' : '#8a715a',
                    border: 'none', padding: '0.6rem 1.5rem',
                    borderRadius: 'var(--border-radius-pill)',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem',
                    cursor: charCount >= 10 && !isAnalyzing ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease'
                  }}>
                    {isAnalyzing ? 'Analyzing...' : <><Send size={16} /> Send</>}
                  </button>
                </div>
              </div>
              </form>
            </>
          ) : (
            /* ===== RESULTS ===== */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'auto', flex: 1, justifyContent: 'center' }}>
              <span style={{ fontSize: '3rem' }}>🎉</span>
              <h2 style={{ fontSize: '1.6rem', color: '#8a715a', margin: '0.3rem 0' }}>Wonderful writing!</h2>

              {currentAnalysis && (
                <div style={{ backgroundColor: '#f8f6f2', borderRadius: '12px', padding: '1rem 1.5rem', width: '100%', maxWidth: '550px', marginBottom: '1rem', marginTop: '0.5rem' }}>
                  <h3 style={{ color: 'var(--color-text-dark)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>📊 Analysis ({currentAnalysis.totalWords} words)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {currentAnalysis.indicators.map((ind, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                          <span style={{ fontSize: '0.82rem' }}>{ind.icon} {ind.name}</span>
                          <span style={{ fontWeight: 700, color: sc(ind.score), fontSize: '0.82rem' }}>{ind.score}%</span>
                        </div>
                        <div style={{ height: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px' }}>
                          <div style={{ height: '100%', width: `${ind.score}%`, backgroundColor: sc(ind.score), borderRadius: '2px', transition: 'width 0.6s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {currentAnalysis.flaggedWords.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.3rem' }}>Flagged:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {currentAnalysis.flaggedWords.map((w, i) => (
                          <span key={i} style={{ backgroundColor: '#fce4ec', color: '#c62828', padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem', fontFamily: 'monospace' }}>{w}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button onClick={handleNext} style={{
                backgroundColor: '#a05828', color: 'white', padding: '0.7rem 2rem', fontSize: '1rem',
                borderRadius: 'var(--border-radius-pill)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 3px 12px rgba(160,88,40,0.3)', cursor: 'pointer', fontWeight: 600
              }}>
                {currentIndex < prompts.length - 1 ? 'Next Adventure' : 'See My Results'} <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
