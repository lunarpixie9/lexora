import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import bunnyImg from '../assets/bunny.jpg';

const getStatusColor = (score) => {
  if (score >= 80) return '#4caf50';
  if (score >= 55) return '#ff9800';
  return '#f44336';
};

const getStatusBg = (score) => {
  if (score >= 80) return '#e8f5e9';
  if (score >= 55) return '#fff3e0';
  return '#fce4ec';
};

export default function Dashboard() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/assessments/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setAssessments(data);
        } else {
          setError('Failed to fetch assessments');
        }
      } catch (err) {
        setError('Could not connect to the server');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAssessments();
    }
  }, [user]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#8a715a' }}>Loading dashboard...</div>;
  if (error) return <div style={{ padding: '3rem', textAlign: 'center', color: 'red' }}>{error}</div>;

  if (assessments.length === 0) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 70px)',
        background: 'linear-gradient(180deg, #f0f4f8 0%, var(--color-bg-cream) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
      }}>
        <div style={{
          backgroundColor: 'white', borderRadius: 'var(--border-radius-lg)',
          padding: '4rem', maxWidth: '500px', textAlign: 'center',
          boxShadow: 'var(--shadow-soft)'
        }}>
          <img src={bunnyImg} alt="No tests" style={{
            width: '100px', height: '100px', objectFit: 'cover',
            borderRadius: '50%', marginBottom: '1.5rem',
            border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }} />
          <h2 style={{ color: '#68594d', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>Welcome to Lexora, {user.name}!</h2>
          <p style={{ color: '#8a715a', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            No text given. You haven't taken any screenings yet. 
            Please start a new screening to see your results and track your progress here.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/task/written">
              <button style={{
                backgroundColor: '#a05828', color: 'white', border: 'none',
                padding: '0.85rem 2rem', borderRadius: 'var(--border-radius-pill)',
                fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(160,88,40,0.3)'
              }}>
                Start Written Task
              </button>
            </Link>
            <Link to="/task/read">
              <button style={{
                backgroundColor: 'transparent', color: '#5ba4b5', border: '2px solid #5ba4b5',
                padding: '0.85rem 2rem', borderRadius: 'var(--border-radius-pill)',
                fontWeight: 600, fontSize: '1rem', cursor: 'pointer'
              }}>
                Start Read Aloud
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // We have assessments, get the latest one
  const latest = assessments[0];
  const { results_json: data } = latest;

  return (
    <div style={{
      minHeight: '90vh',
      background: 'linear-gradient(180deg, #f0f4f8 0%, var(--color-bg-cream) 100%)',
      padding: '3rem 2rem'
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', color: 'var(--color-text-dark)', marginBottom: '0.5rem' }}>
              📊 Dashboard
            </h1>
            <p style={{ color: 'var(--color-text-light)' }}>
              Screening results for <strong>{user.name}</strong> — {new Date(latest.created_at).toLocaleDateString()}
            </p>
          </div>
          <Link to="/task/written">
            <button style={{
              backgroundColor: '#a05828', color: 'white', border: 'none',
              padding: '0.7rem 1.5rem', borderRadius: 'var(--border-radius-pill)',
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(160,88,40,0.2)'
            }}>
              + New Screening
            </button>
          </Link>
        </div>

        {/* Top Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Overall Score */}
          <div style={{
            backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--border-radius-md)',
            boxShadow: 'var(--shadow-soft)', textAlign: 'center'
          }}>
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Overall Score</p>
            <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1rem' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#eee" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke={getStatusColor(latest.overall_score)} strokeWidth="3"
                  strokeDasharray={`${latest.overall_score}, 100`} strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '2rem', fontWeight: 700, color: getStatusColor(latest.overall_score) }}>
                {latest.overall_score}
              </div>
            </div>
            <span style={{
              backgroundColor: getStatusBg(latest.overall_score), color: getStatusColor(latest.overall_score),
              padding: '0.3rem 1rem', borderRadius: '20px',
              fontWeight: 600, fontSize: '0.85rem'
            }}>
              {latest.risk_level} Risk
            </span>
          </div>

          {/* Progress Sparkline */}
          <div style={{
            backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--border-radius-md)',
            boxShadow: 'var(--shadow-soft)'
          }}>
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Progress Over Time</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '120px', paddingBottom: '0.5rem' }}>
              {assessments.slice().reverse().slice(-5).map((h, i, arr) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: '0.3rem' }}>{h.overall_score}</span>
                  <div style={{
                    width: '100%', height: `${h.overall_score}%`,
                    backgroundColor: i === arr.length - 1 ? '#a05828' : '#e5dccf',
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.3s'
                  }} />
                  <span style={{ fontSize: '0.65rem', color: '#999', marginTop: '0.3rem', textAlign: 'center' }}>
                    {new Date(h.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ color: '#8a715a', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.5rem' }}>
              {assessments.length > 1 ? `Based on last ${assessments.length > 5 ? 5 : assessments.length} sessions` : 'Take more tests to see trends!'}
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{
            backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--border-radius-md)',
            boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', gap: '0.75rem'
          }}>
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Quick Actions</p>
            {[
              { label: '✏️ Start Written Task', link: '/task/written' },
              { label: '🎙️ Start Read Aloud', link: '/task/read' },
              { label: '📋 View Last Report', link: '/results' }
            ].map((a, i) => (
              <Link to={a.link} key={i} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '0.6rem 1rem', backgroundColor: '#f8f6f2',
                  borderRadius: '8px', color: 'var(--color-text-dark)',
                  fontSize: '0.9rem', fontWeight: 500,
                  transition: 'all 0.2s', cursor: 'pointer'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#a05828'; e.currentTarget.style.color = 'white'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8f6f2'; e.currentTarget.style.color = 'var(--color-text-dark)'; }}
                >
                  {a.label}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Detailed Breakdown */}
        {data && data.categories && (
          <div style={{
            backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--border-radius-md)',
            boxShadow: 'var(--shadow-soft)', marginBottom: '2rem'
          }}>
            <h3 style={{ color: 'var(--color-text-dark)', marginBottom: '1.5rem' }}>🔍 Detailed Indicator Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {data.categories.map((cat, i) => (
                <div key={i} style={{
                  padding: '1.25rem', borderRadius: '12px',
                  backgroundColor: getStatusBg(cat.score),
                  border: `1px solid ${getStatusColor(cat.score)}20`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-dark)', fontSize: '0.95rem' }}>
                      {cat.icon} {cat.name}
                    </span>
                    <span style={{
                      color: getStatusColor(cat.score), fontWeight: 700, fontSize: '1.2rem'
                    }}>{cat.score}%</span>
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ height: '4px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '2px', marginBottom: '0.5rem' }}>
                    <div style={{ height: '100%', width: `${cat.score}%`, backgroundColor: getStatusColor(cat.score), borderRadius: '2px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Row */}
        {data && (data.topConcerns || data.strengths) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Concerns */}
            <div style={{
              backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--border-radius-md)',
              boxShadow: 'var(--shadow-soft)'
            }}>
              <h3 style={{ color: '#f44336', marginBottom: '1rem' }}>⚠️ Areas of Concern</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0 }}>
                {data.topConcerns && data.topConcerns.map((c, i) => (
                  <li key={i} style={{
                    padding: '0.6rem 1rem', borderRadius: '8px',
                    backgroundColor: c.severity === 'high' ? '#fce4ec' : '#fff3e0',
                    borderLeft: `3px solid ${c.severity === 'high' ? '#f44336' : '#ff9800'}`,
                    fontSize: '0.9rem', color: 'var(--color-text-dark)'
                  }}>
                    {c.label}
                  </li>
                ))}
                {(!data.topConcerns || data.topConcerns.length === 0) && (
                   <p style={{ color: '#666', fontSize: '0.9rem' }}>No significant concerns detected!</p>
                )}
              </ul>
            </div>

            {/* Strengths */}
            <div style={{
              backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--border-radius-md)',
              boxShadow: 'var(--shadow-soft)'
            }}>
              <h3 style={{ color: '#4caf50', marginBottom: '1rem' }}>✅ Strengths</h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: 0 }}>
                {data.strengths && data.strengths.map((s, i) => (
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
        )}
      </div>
    </div>
  );
}
