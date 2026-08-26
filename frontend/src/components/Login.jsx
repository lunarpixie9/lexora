import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import bunnyImg from '../assets/bunny.jpg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        login(data);
        navigate('/dashboard');
      } else {
        setError(data.detail || 'Failed to login. Check your credentials.');
      }
    } catch (err) {
      setError('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 70px)',
      background: 'linear-gradient(180deg, #f0f4f8 0%, var(--color-bg-cream) 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: 'var(--border-radius-lg)',
        padding: '3rem', width: '100%', maxWidth: '400px',
        boxShadow: 'var(--shadow-soft)', textAlign: 'center'
      }}>
        <img src={bunnyImg} alt="Welcome" style={{
          width: '80px', height: '80px', objectFit: 'cover',
          borderRadius: '50%', marginBottom: '1.5rem',
          border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }} />
        
        <h2 style={{ color: '#68594d', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>Welcome Back!</h2>
        <p style={{ color: 'var(--color-text-light)', marginBottom: '2rem', fontSize: '0.95rem' }}>Login to view your screenings</p>
        
        {error && <div style={{ backgroundColor: '#fce4ec', color: '#f44336', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '0.85rem 1rem', borderRadius: '8px',
                border: '2px solid var(--color-border-soft)', outline: 'none',
                fontFamily: 'var(--font-body)', fontSize: '1rem', transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#a05828'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border-soft)'}
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '0.85rem 1rem', borderRadius: '8px',
                border: '2px solid var(--color-border-soft)', outline: 'none',
                fontFamily: 'var(--font-body)', fontSize: '1rem', transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = '#a05828'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border-soft)'}
            />
          </div>
          
          <button type="submit" disabled={loading} style={{
            backgroundColor: '#a05828', color: 'white', border: 'none',
            padding: '1rem', borderRadius: 'var(--border-radius-pill)',
            fontWeight: 600, fontSize: '1.05rem', cursor: loading ? 'wait' : 'pointer',
            marginTop: '1rem', boxShadow: '0 4px 15px rgba(160,88,40,0.3)',
            opacity: loading ? 0.7 : 1
          }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <p style={{ marginTop: '2rem', fontSize: '0.95rem', color: '#8a715a' }}>
          Don't have an account? <Link to="/register" style={{ color: '#5ba4b5', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
