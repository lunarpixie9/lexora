import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import WrittenTask from './components/WrittenTask';
import ReadAloudTask from './components/ReadAloudTask';
import Dashboard from './components/Dashboard';
import About from './components/About';
import Support from './components/Support';
import Results from './components/Results';
import Footer from './components/Footer';
import Login from './components/Login';
import Register from './components/Register';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return children;
}

function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isActive = (path) => location.pathname === path;

  const linkStyle = (path) => ({
    color: isActive(path) ? '#a05828' : '#666',
    fontWeight: isActive(path) ? 700 : 600,
    borderBottom: isActive(path) ? '2px solid #a05828' : '2px solid transparent',
    paddingBottom: '4px',
    transition: 'all 0.2s',
    textDecoration: 'none'
  });

  return (
    <nav style={{
      padding: '1rem 3rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'white',
      zIndex: 100,
      position: 'sticky',
      top: 0,
      boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
    }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            backgroundColor: '#353b41',
            color: 'white',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-heading)',
            fontSize: '0.9rem',
            fontWeight: 400,
            fontStyle: 'italic',
          }}>
            L
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-dark)' }}>
            Lexora
          </span>
        </div>
      </Link>

      <div style={{ display: 'flex', gap: '2.5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', alignItems: 'center' }}>
        {user ? (
          <>
            <Link to="/task/written" style={linkStyle('/task/written')}>Writing ✏️</Link>
            <Link to="/task/read" style={linkStyle('/task/read')}>Reading 🎙️</Link>
            <Link to="/dashboard" style={linkStyle('/dashboard')}>Dashboard 📊</Link>
            <Link to="/about" style={linkStyle('/about')}>About</Link>
            <Link to="/support" style={linkStyle('/support')}>Help</Link>
            <button onClick={logout} style={{
              background: 'none', border: 'none', color: '#f44336', 
              fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer',
              letterSpacing: '1px'
            }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/about" style={linkStyle('/about')}>About</Link>
            <Link to="/support" style={linkStyle('/support')}>Help</Link>
            <Link to="/login" style={linkStyle('/login')}>Login</Link>
            <Link to="/register" style={{
              backgroundColor: '#a05828', color: 'white', padding: '0.5rem 1.25rem',
              borderRadius: '20px', textDecoration: 'none', fontWeight: 600
            }}>Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/support" element={<Support />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route path="/task/written" element={<ProtectedRoute><WrittenTask /></ProtectedRoute>} />
              <Route path="/task/read" element={<ProtectedRoute><ReadAloudTask /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
