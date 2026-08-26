import { Link } from 'react-router-dom';
import owlImg from '../assets/owl.jpg';
import bearImg from '../assets/bear.jpg';
import bunnyImg from '../assets/bunny.jpg';
import heroImg from '../assets/hero.jpg';

export default function About() {
  return (
    <div>
      {/* Hero Banner */}
      <section style={{
        background: 'linear-gradient(135deg, #bde2ea 0%, #a8d8e4 100%)',
        padding: '5rem 2rem',
        textAlign: 'center',
        position: 'relative'
      }}>
        <h1 style={{ fontSize: '3rem', color: 'white', marginBottom: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          About Lexora
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          A playful, AI-powered screening tool that helps identify early signs of reading difficulty in children — through magical adventures, not stressful tests.
        </p>
      </section>

      {/* Mission */}
      <section style={{ padding: '5rem 2rem', backgroundColor: 'var(--color-bg-cream)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: '#68594d', fontSize: '2rem', marginBottom: '1rem' }}>Our Mission</h2>
            <p style={{ color: '#8a715a', lineHeight: 1.8, fontSize: '1rem', marginBottom: '1rem' }}>
              1 in 5 children show signs of dyslexia, yet most are not identified until they are already struggling in school. Early screening can change a child's entire academic trajectory.
            </p>
            <p style={{ color: '#8a715a', lineHeight: 1.8, fontSize: '1rem' }}>
              Lexora makes that screening <strong>accessible</strong>, <strong>affordable</strong>, and <strong>fun</strong>. By combining natural language processing, speech analysis, and established dyslexia research indicators, we give parents and teachers actionable insights — not anxiety.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img src={owlImg} alt="Wise Owl" style={{
              width: '300px', height: '300px', objectFit: 'cover',
              borderRadius: '50%', border: '6px solid white',
              boxShadow: '0 10px 40px rgba(0,0,0,0.08)'
            }} />
          </div>
        </div>
      </section>

      {/* How the Science Works */}
      <section style={{ padding: '5rem 2rem', backgroundColor: '#f0e6d6' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#68594d', fontSize: '2rem', marginBottom: '3rem' }}>The Science Behind Lexora</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            {[
              {
                icon: '✏️',
                title: 'Text Analysis',
                points: ['Letter reversal detection (b/d, p/q)', 'Phonetic spelling errors (fone → phone)', 'Letter transposition patterns (was → saw)', 'Spelling consistency across a passage']
              },
              {
                icon: '🎙️',
                title: 'Speech & Fluency',
                points: ['Words per minute measurement', 'Pause frequency & duration analysis', 'Hesitation pattern detection', 'Mispronunciation vs expected phonemes']
              },
              {
                icon: '🧠',
                title: 'Explainable AI',
                points: ['Feature-based scoring (not a black box)', 'SHAP-style indicator breakdown', 'Sub-scores for each risk category', 'Actionable teacher/parent recommendations']
              },
            ].map((item, i) => (
              <div key={i} style={{
                backgroundColor: 'white', padding: '2rem',
                borderRadius: 'var(--border-radius-md)',
                boxShadow: 'var(--shadow-soft)'
              }}>
                <span style={{ fontSize: '2.5rem' }}>{item.icon}</span>
                <h3 style={{ color: '#4a4a4a', margin: '1rem 0 0.75rem' }}>{item.title}</h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {item.points.map((p, j) => (
                    <li key={j} style={{ color: '#8a715a', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      • {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Disclaimer */}
      <section style={{ padding: '4rem 2rem', backgroundColor: 'var(--color-bg-cream)' }}>
        <div style={{
          maxWidth: '700px', margin: '0 auto', textAlign: 'center',
          padding: '3rem', backgroundColor: 'white',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: 'var(--shadow-soft)',
          border: '2px dashed var(--color-border-soft)'
        }}>
          <span style={{ fontSize: '3rem' }}>🛡️</span>
          <h3 style={{ color: '#68594d', margin: '1rem 0' }}>Important: Screening, Not Diagnosis</h3>
          <p style={{ color: '#8a715a', lineHeight: 1.7, fontSize: '0.95rem' }}>
            Lexora is a <strong>screening aid</strong>. It identifies patterns associated with reading difficulty, but it is <strong>not a clinical diagnosis</strong>. If our screening flags concerns, we strongly recommend consulting a qualified educational psychologist, speech-language pathologist, or learning specialist.
          </p>
        </div>
      </section>

      {/* Team & Privacy */}
      <section style={{ padding: '5rem 2rem', backgroundColor: '#f0e6d6' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-soft)' }}>
            <span style={{ fontSize: '2rem' }}>🔒</span>
            <h3 style={{ color: '#4a4a4a', margin: '1rem 0' }}>Privacy & Data Safety</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#8a715a', fontSize: '0.9rem' }}>
              <li>✓ All audio/text encrypted at rest</li>
              <li>✓ Parental consent required for minors</li>
              <li>✓ COPPA / GDPR-K / DPDP Act compliant</li>
              <li>✓ Data minimization — we keep only what's needed</li>
              <li>✓ No data sold to third parties — ever</li>
            </ul>
          </div>
          <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-soft)' }}>
            <span style={{ fontSize: '2rem' }}>🌍</span>
            <h3 style={{ color: '#4a4a4a', margin: '1rem 0' }}>Bias & Fairness</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#8a715a', fontSize: '0.9rem' }}>
              <li>✓ Accent/dialect-aware speech processing</li>
              <li>✓ Non-native speaker adjustments</li>
              <li>✓ Regular bias auditing across demographics</li>
              <li>✓ Open about limitations in our reports</li>
              <li>✓ Human expert review recommended</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 2rem', background: 'linear-gradient(180deg, #bde2ea, #9dd0de)', textAlign: 'center' }}>
        <h2 style={{ color: 'white', fontSize: '2.2rem', marginBottom: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          Try a Free Screening Today
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', marginBottom: '2rem' }}>
          It's quick, it's fun, and it might change a child's life.
        </p>
        <Link to="/task/written">
          <button style={{
            backgroundColor: 'white', color: '#a05828', border: 'none',
            padding: '1rem 3rem', fontSize: '1.1rem',
            borderRadius: 'var(--border-radius-pill)',
            fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
            boxShadow: '0 6px 25px rgba(0,0,0,0.1)', cursor: 'pointer'
          }}>
            Start the Adventure
          </button>
        </Link>
      </section>
    </div>
  );
}
