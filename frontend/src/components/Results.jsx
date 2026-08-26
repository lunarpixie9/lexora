import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { useAuth } from '../context/AuthContext';
import bunnyImg from '../assets/bunny.jpg';

export default function Results() {
  const [resultsData, setResultsData] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const reportRef = useRef();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Load data from the task
    const stored = sessionStorage.getItem('lexora_results');
    if (!stored) {
      // If no data, send them to do a task
      navigate('/task/written');
      return;
    }

    try {
      const data = JSON.parse(stored);
      // Aggregate the results across the 3 prompts/passages
      let aggregatedCategories = [];
      let overallSum = 0;
      let totalWeight = 0;
      let riskLevel = 'Low';
      let summary = '';
      let topConcerns = [];
      let strengths = [];

      if (data.type === 'written') {
        // Aggregate written indicators
        const cats = {
          'Phonetic Accuracy': { score: 0, icon: '🔤', count: 0 },
          'Letter Reversals (b/d, p/q)': { score: 0, icon: '🔁', count: 0 },
          'Transpositions': { score: 0, icon: '🔀', count: 0 },
          'Spelling Consistency': { score: 0, icon: '📝', count: 0 },
          'Letter Repetition': { score: 0, icon: '🔂', count: 0 }
        };

        data.results.forEach(res => {
          if (!res.analysis) return;
          res.analysis.indicators.forEach(ind => {
            if (cats[ind.name]) {
              cats[ind.name].score += ind.score;
              cats[ind.name].count += 1;
            }
          });
        });

        aggregatedCategories = Object.values(cats).map(c => ({
          name: Object.keys(cats).find(k => cats[k] === c),
          score: c.count > 0 ? Math.round(c.score / c.count) : 100,
          icon: c.icon
        }));

        const finalScore = Math.round(aggregatedCategories.reduce((sum, c) => sum + c.score, 0) / aggregatedCategories.length);
        overallSum = finalScore;
        riskLevel = finalScore >= 80 ? 'Low' : finalScore >= 55 ? 'Moderate' : 'High';
        
        summary = riskLevel === 'Low' 
          ? "Great writing! No significant indicators of reading/writing difficulty were detected across the tasks."
          : riskLevel === 'Moderate'
          ? "Based on the screening, Lexora detected moderate indicators of difficulty. These are common patterns worth monitoring."
          : "Multiple indicators of potential reading/writing difficulty were detected consistently across the tasks. We recommend consulting a professional.";

        // Populate concerns and strengths based on scores
        aggregatedCategories.forEach(c => {
          if (c.score < 60) topConcerns.push({ label: c.name, severity: c.score < 40 ? 'high' : 'medium' });
          else if (c.score > 85) strengths.push(c.name);
        });

      } else {
        // Aggregate read-aloud indicators
        const cats = {
          'Reading Speed (WPM)': { score: 0, icon: '⚡', count: 0 },
          'Word Accuracy': { score: 0, icon: '🎯', count: 0 },
          'Passage Coverage': { score: 0, icon: '📖', count: 0 },
          'Fluency / Hesitations': { score: 0, icon: '🌊', count: 0 }
        };

        data.results.forEach(res => {
          if (!res.analysis) return;
          res.analysis.indicators.forEach(ind => {
            if (cats[ind.name]) {
              cats[ind.name].score += ind.score;
              cats[ind.name].count += 1;
            }
          });
        });

        aggregatedCategories = Object.values(cats).map(c => ({
          name: Object.keys(cats).find(k => cats[k] === c),
          score: c.count > 0 ? Math.round(c.score / c.count) : 100,
          icon: c.icon
        }));

        const finalScore = Math.round(aggregatedCategories.reduce((sum, c) => sum + c.score, 0) / aggregatedCategories.length);
        overallSum = finalScore;
        riskLevel = finalScore >= 75 ? 'Low' : finalScore >= 50 ? 'Moderate' : 'High';
        
        summary = riskLevel === 'Low' 
          ? "Great reading! Fluency and accuracy look strong across all passages."
          : riskLevel === 'Moderate'
          ? "Some hesitation and accuracy concerns were noted. Consider practicing more read-aloud sessions."
          : "Significant reading difficulty indicators detected across multiple passages. We recommend professional evaluation.";

        // Populate concerns and strengths based on scores
        aggregatedCategories.forEach(c => {
          if (c.score < 60) topConcerns.push({ label: c.name, severity: c.score < 40 ? 'high' : 'medium' });
          else if (c.score > 85) strengths.push(c.name);
        });
      }

      const finalResults = {
        overallScore: overallSum,
        riskLevel,
        date: new Date(data.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        categories: aggregatedCategories,
        summary,
        topConcerns: topConcerns.length > 0 ? topConcerns : [{ label: 'None noted', severity: 'medium' }],
        strengths: strengths.length > 0 ? strengths : ['Good effort on all tasks!']
      };

      setResultsData(finalResults);

      // Save to database if not already saved in this session
      if (user && !hasSaved) {
        fetch('http://127.0.0.1:8000/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            task_type: data.type,
            overall_score: finalResults.overallScore,
            risk_level: finalResults.riskLevel,
            results_json: JSON.stringify(finalResults)
          })
        }).then(res => {
          if (res.ok) setHasSaved(true);
        }).catch(console.error);
      }

    } catch (e) {
      console.error("Failed to parse results", e);
    }
  }, [navigate, user, hasSaved]);

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    const element = reportRef.current;
    
    // Temporarily adjust styling for better PDF output
    const originalPadding = element.style.padding;
    element.style.padding = '20px';
    element.style.background = 'white';

    const opt = {
      margin:       10,
      filename:     `Lexora_Screening_Report_${resultsData?.date.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      // Restore styling
      element.style.padding = originalPadding;
      element.style.background = 'transparent';
      setIsGeneratingPdf(false);
    });
  };

  if (!resultsData) return null;

  const getScoreColor = (score) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  const getSeverityColor = (sev) => sev === 'high' ? '#f44336' : '#ff9800';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f0f4f8 0%, var(--color-bg-cream) 100%)',
      padding: '3rem 2rem 10rem' // Added significant bottom padding so buttons don't overlap footer wave
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Printable Area */}
        <div ref={reportRef} style={{ background: 'transparent' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="animate-float" style={{ display: 'inline-block' }}>
              <img src={bunnyImg} alt="Results Bunny" style={{
                width: '120px', height: '120px', objectFit: 'cover',
                borderRadius: '50%', border: '5px solid white',
                boxShadow: '0 6px 20px rgba(0,0,0,0.08)', marginBottom: '1rem'
              }} />
            </div>
            <h1 style={{ fontSize: '2.5rem', color: '#68594d', marginBottom: '0.5rem' }}>Your Screening Results</h1>
            <p style={{ color: 'var(--color-text-light)' }}>{resultsData.date}</p>
          </div>

          {/* Overall Score Card */}
          <div style={{
            backgroundColor: 'white', borderRadius: 'var(--border-radius-lg)',
            padding: '3rem', boxShadow: 'var(--shadow-soft)',
            textAlign: 'center', marginBottom: '2rem'
          }}>
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.5rem' }}>Overall Screening Score</p>

            {/* Big circular score */}
            <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 1.5rem' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#f0f0f0" strokeWidth="2.5" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke={getScoreColor(resultsData.overallScore)} strokeWidth="2.5"
                  strokeDasharray={`${resultsData.overallScore}, 100`} strokeLinecap="round" />
              </svg>
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                fontSize: '3rem', fontWeight: 700, color: getScoreColor(resultsData.overallScore),
                fontFamily: 'var(--font-heading)'
              }}>
                {resultsData.overallScore}
              </div>
            </div>

            <span style={{
              backgroundColor: resultsData.riskLevel === 'Low' ? '#e8f5e9' : resultsData.riskLevel === 'Moderate' ? '#fff3e0' : '#fce4ec',
              color: resultsData.riskLevel === 'Low' ? '#4caf50' : resultsData.riskLevel === 'Moderate' ? '#ff9800' : '#f44336',
              padding: '0.4rem 1.5rem', borderRadius: '20px',
              fontWeight: 700, fontSize: '0.95rem'
            }}>
              {resultsData.riskLevel} Risk
            </span>

            <p style={{ color: '#8a715a', lineHeight: 1.7, marginTop: '1.5rem', maxWidth: '600px', margin: '1.5rem auto 0' }}>
              {resultsData.summary}
            </p>
          </div>

          {/* Category Breakdown */}
          <div style={{
            backgroundColor: 'white', borderRadius: 'var(--border-radius-lg)',
            padding: '2.5rem', boxShadow: 'var(--shadow-soft)', marginBottom: '2rem'
          }}>
            <h3 style={{ color: 'var(--color-text-dark)', marginBottom: '1.5rem' }}>📊 Score Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {resultsData.categories.map((cat, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 500, color: 'var(--color-text-dark)', fontSize: '0.95rem' }}>
                      {cat.icon} {cat.name}
                    </span>
                    <span style={{ fontWeight: 700, color: getScoreColor(cat.score), fontSize: '0.95rem' }}>
                      {cat.score}%
                    </span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${cat.score}%`,
                      backgroundColor: getScoreColor(cat.score),
                      borderRadius: '4px', transition: 'width 0.8s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Concerns + Strengths */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{
              backgroundColor: 'white', padding: '2rem',
              borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-soft)'
            }}>
              <h3 style={{ color: '#f44336', marginBottom: '1rem' }}>⚠️ Areas of Concern</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0 }}>
                {resultsData.topConcerns.map((c, i) => (
                  <li key={i} style={{
                    padding: '0.6rem 1rem', borderRadius: '8px',
                    backgroundColor: c.severity === 'high' ? '#fce4ec' : '#fff3e0',
                    borderLeft: `3px solid ${getSeverityColor(c.severity)}`,
                    fontSize: '0.9rem', color: 'var(--color-text-dark)'
                  }}>
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{
              backgroundColor: 'white', padding: '2rem',
              borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-soft)'
            }}>
              <h3 style={{ color: '#4caf50', marginBottom: '1rem' }}>✅ Strengths</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0 }}>
                {resultsData.strengths.map((s, i) => (
                  <li key={i} style={{
                    padding: '0.6rem 1rem', borderRadius: '8px',
                    backgroundColor: '#e8f5e9', borderLeft: '3px solid #4caf50',
                    fontSize: '0.9rem', color: 'var(--color-text-dark)'
                  }}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Next Steps */}
          <div style={{
            backgroundColor: 'white', borderRadius: 'var(--border-radius-lg)',
            padding: '2.5rem', boxShadow: 'var(--shadow-soft)', marginBottom: '3rem'
          }}>
            <h3 style={{ color: 'var(--color-text-dark)', marginBottom: '1rem' }}>🗺️ Recommended Next Steps</h3>
            <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#8a715a', lineHeight: 1.7 }}>
              <li>Repeat the screening in 1–2 weeks to see if patterns persist.</li>
              <li>Practice distinction exercises using tactile methods (clay letters, textured paper).</li>
              <li>Encourage 5 minutes of daily read-aloud practice with a parent or teacher.</li>
              <li>If risk indicators persist over 3+ sessions, consult an educational psychologist.</li>
              <li>Share this report with your child's teacher for classroom support strategies.</li>
            </ol>
          </div>
        </div>

        {/* Action Buttons (Excluded from PDF) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Link to="/dashboard">
            <button style={{
              backgroundColor: '#a05828', color: 'white', border: 'none',
              padding: '0.85rem 2rem', borderRadius: 'var(--border-radius-pill)',
              fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(160,88,40,0.3)'
            }}>
              📊 Go to Dashboard
            </button>
          </Link>
          <Link to="/task/written">
            <button style={{
              backgroundColor: 'transparent', color: '#a05828',
              border: '2px solid #a05828',
              padding: '0.85rem 2rem', borderRadius: 'var(--border-radius-pill)',
              fontWeight: 600, fontSize: '1rem', cursor: 'pointer'
            }}>
              🔄 Take Another Screening
            </button>
          </Link>
          <button 
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            style={{
              backgroundColor: 'transparent', color: '#5ba4b5',
              border: '2px solid #5ba4b5',
              padding: '0.85rem 2rem', borderRadius: 'var(--border-radius-pill)',
              fontWeight: 600, fontSize: '1rem', 
              cursor: isGeneratingPdf ? 'wait' : 'pointer',
              opacity: isGeneratingPdf ? 0.7 : 1
            }}>
            {isGeneratingPdf ? '⏳ Generating...' : '📥 Download PDF Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
