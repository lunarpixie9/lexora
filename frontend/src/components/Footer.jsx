import { Link } from 'react-router-dom';

export default function Footer() {
  const linkStyle = {
    textDecoration: 'none',
    color: '#9ca3af',
    transition: 'color 0.2s',
    fontSize: '0.85rem',
    letterSpacing: '0.5px'
  };

  return (
    <footer style={{ backgroundColor: '#353b41', color: 'white', position: 'relative' }}>
      {/* Wave Divider - matches the blue CTA section above */}
      <div style={{
        position: 'absolute',
        top: '-59px',
        left: 0,
        width: '100%',
        overflow: 'hidden',
        lineHeight: 0,
      }}>
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ position: 'relative', display: 'block', width: 'calc(140% + 1.3px)', height: '60px' }}>
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#353b41"></path>
        </svg>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '5rem 2rem 3rem' }}>
        {/* Top Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
          
          {/* Brand */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: '2rem', fontWeight: 300, color: 'white', marginBottom: '1rem' }}>
              learn with <span style={{ fontWeight: 600 }}>Lexora</span>
            </h3>
            <p style={{ color: '#9ca3af', lineHeight: 1.7, fontSize: '0.9rem' }}>
              A playful, AI-powered screening tool designed to help parents and teachers identify early signs of reading difficulties in children — all through fun, magical adventures.
            </p>
          </div>

          {/* Activities */}
          <div>
            <h4 style={{ color: '#dfba6b', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '2px', marginBottom: '1rem' }}>Activities</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Link to="/task/written" style={linkStyle}>✏️ Written Adventure</Link>
              <Link to="/task/read" style={linkStyle}>🎙️ Read Aloud Magic</Link>
              <Link to="/dashboard" style={linkStyle}>📊 Dashboard</Link>
              <Link to="/results" style={linkStyle}>📋 My Results</Link>
            </div>
          </div>

          {/* Learn */}
          <div>
            <h4 style={{ color: '#dfba6b', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '2px', marginBottom: '1rem' }}>Learn</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Link to="/about" style={linkStyle}>About Lexora</Link>
              <Link to="/about" style={linkStyle}>How It Works</Link>
              <Link to="/about" style={linkStyle}>The Science</Link>
              <Link to="/support" style={linkStyle}>Teachers FAQ</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 style={{ color: '#dfba6b', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '2px', marginBottom: '1rem' }}>Support</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Link to="/support" style={linkStyle}>Help & FAQ</Link>
              <Link to="/support" style={linkStyle}>Contact Us</Link>
              <Link to="/support" style={linkStyle}>Privacy Policy</Link>
              <Link to="/support" style={linkStyle}>Accessibility</Link>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: '#666', fontSize: '0.8rem' }}>© 2026 Lexora. A screening aid — not a clinical diagnosis.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span style={{ fontSize: '1.5rem', opacity: 0.4 }}>🦋</span>
            <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>🌙</span>
            <span style={{ fontSize: '1.5rem', opacity: 0.4 }}>⭐</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
