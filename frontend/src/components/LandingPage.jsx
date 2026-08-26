import { Link } from 'react-router-dom';
import heroImg from '../assets/hero.jpg';
import foxImg from '../assets/fox.jpg';
import micImg from '../assets/mic.jpg';
import owlImg from '../assets/owl.jpg';
import bearImg from '../assets/bear.jpg';
import bunnyImg from '../assets/bunny.jpg';

export default function LandingPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ===== HERO SECTION ===== */}
      <section style={{
        background: 'linear-gradient(180deg, #bde2ea 0%, #a8d8e4 100%)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '4rem',
        paddingBottom: '10rem',
      }}>
        <div style={{ textAlign: 'center', zIndex: 2, marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-block',
            backgroundColor: 'rgba(255,253,246,0.85)',
            border: '2px dashed #d1c1a9',
            padding: '0.5rem 2rem',
            borderRadius: '4px',
            color: '#8a715a',
            fontFamily: 'var(--font-heading)',
            marginBottom: '1.5rem',
            fontSize: '1rem'
          }}>
            ✨ the happy land of ✨
          </div>
          <h1 style={{
            fontSize: 'clamp(3rem, 6vw, 5.5rem)',
            color: '#a05828',
            lineHeight: 0.95,
            marginBottom: '1.5rem',
            textShadow: '2px 3px 0px rgba(255,255,255,0.3)'
          }}>
            MAGICAL<br />
            READING &<br />
            WRITING <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontStyle: 'italic' }}>adventures</span>
          </h1>
          <p style={{ color: 'white', fontSize: '1.3rem', fontWeight: 600, letterSpacing: '1px', marginBottom: '2rem', textShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            Creative learning journeys start here!
          </p>
          <Link to="/task/written">
            <button style={{
              backgroundColor: '#a05828',
              color: 'white',
              border: 'none',
              padding: '1rem 3rem',
              fontSize: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              borderRadius: 'var(--border-radius-pill)',
              fontWeight: 700,
              transition: 'all 0.3s',
              boxShadow: '0 4px 20px rgba(160,88,40,0.3)'
            }}
            onMouseOver={(e) => { e.target.style.transform = 'translateY(-3px)'; e.target.style.boxShadow = '0 8px 30px rgba(160,88,40,0.4)'; }}
            onMouseOut={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 20px rgba(160,88,40,0.3)'; }}
            >
              Start Playing
            </button>
          </Link>
        </div>

        {/* Hero Image */}
        <div className="animate-float" style={{ maxWidth: '600px', width: '80%', zIndex: 1 }}>
          <img
            src={heroImg}
            alt="Whimsical moon balloon with cute animals"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '40px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12)'
            }}
          />
        </div>

        {/* Wave Divider */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', overflow: 'hidden', lineHeight: 0, transform: 'rotate(180deg)' }}>
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ display: 'block', width: 'calc(140% + 1.3px)', height: '100px' }}>
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#faeedd"></path>
          </svg>
        </div>
      </section>

      {/* ===== ACTIVITIES SECTION ===== */}
      <section style={{ backgroundColor: '#faeedd', padding: '4rem 2rem 6rem' }}>
        <h2 style={{ textAlign: 'center', color: '#68594d', fontSize: '1.6rem', fontWeight: 600, marginBottom: '1rem' }}>
          Add joy & whimsy to your learning
        </h2>
        <p style={{ textAlign: 'center', color: '#8a715a', marginBottom: '4rem', maxWidth: '500px', margin: '0 auto 4rem' }}>
          Choose an adventure below — each one helps Lexora understand how your child reads and writes.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '6rem', flexWrap: 'wrap' }}>
          {[
            { img: foxImg, title: 'Written Adventure', desc: 'Type a short story or answer fun prompts', link: '/task/written' },
            { img: micImg, title: 'Read Aloud Magic', desc: 'Read a passage out loud into the microphone', link: '/task/read' },
          ].map((item, i) => (
            <Link to={item.link} key={i} style={{ textDecoration: 'none' }}>
              <div style={{ textAlign: 'center', cursor: 'pointer', transition: 'transform 0.3s', maxWidth: '280px' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-12px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <img src={item.img} alt={item.title} style={{
                  width: '220px', height: '220px', objectFit: 'cover',
                  borderRadius: '50%', marginBottom: '1.5rem',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.08)', border: '5px solid white'
                }} />
                <h3 style={{ color: '#4a4a4a', fontSize: '1.1rem', letterSpacing: '1px', textTransform: 'uppercase' }}>{item.title}</h3>
                <p style={{ color: '#8a715a', margin: '0.5rem 0 1rem', fontSize: '0.9rem' }}>{item.desc}</p>
                <span style={{ color: '#a05828', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '2px', textTransform: 'uppercase' }}>START NOW →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <section style={{ backgroundColor: 'var(--color-bg-cream)', padding: '6rem 2rem' }}>
        <h2 style={{ textAlign: 'center', color: '#68594d', fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>
          How Lexora Works
        </h2>
        <p style={{ textAlign: 'center', color: '#8a715a', marginBottom: '4rem', maxWidth: '550px', margin: '0 auto 4rem' }}>
          Three simple steps to understand your child's reading journey.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', flexWrap: 'wrap', maxWidth: '1000px', margin: '0 auto' }}>
          {[
            { img: bearImg, step: '1', title: 'Play a Fun Game', desc: 'Your child completes a short, engaging writing or reading activity — it feels like play, not a test.' },
            { img: owlImg, step: '2', title: 'Lexora Analyzes', desc: 'Our AI examines spelling patterns, letter reversals, reading fluency, and pause timing for signs of difficulty.' },
            { img: bunnyImg, step: '3', title: 'Get Clear Insights', desc: 'Parents and teachers receive a detailed, explainable report — not just a score, but exactly what was flagged and why.' },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: 'center', maxWidth: '260px', position: 'relative' }}>
              <div style={{
                position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: '#a05828', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-heading)',
                boxShadow: '0 3px 10px rgba(160,88,40,0.3)', zIndex: 2
              }}>
                {item.step}
              </div>
              <img src={item.img} alt={item.title} style={{
                width: '180px', height: '180px', objectFit: 'cover',
                borderRadius: '50%', marginBottom: '1.5rem', marginTop: '1rem',
                border: '4px solid white', boxShadow: '0 6px 20px rgba(0,0,0,0.06)'
              }} />
              <h3 style={{ color: '#4a4a4a', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ color: '#8a715a', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== TRUST / DISCLAIMER BANNER ===== */}
      <section style={{
        background: 'linear-gradient(135deg, #f0e6d6 0%, #e8dcc8 100%)',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <span style={{ fontSize: '2.5rem' }}>🛡️</span>
          <h3 style={{ color: '#68594d', fontSize: '1.3rem', marginTop: '1rem', marginBottom: '0.75rem' }}>
            A Screening Aid, Not a Diagnosis
          </h3>
          <p style={{ color: '#8a715a', lineHeight: 1.7, fontSize: '0.95rem' }}>
            Lexora is designed to flag early indicators of reading difficulty. It is <strong>not</strong> a clinical diagnosis tool.
            If results suggest risk, we recommend consulting a qualified educational psychologist or speech-language pathologist.
            All children's data is encrypted and processed under strict privacy standards.
          </p>
          <Link to="/about">
            <button style={{
              marginTop: '1.5rem',
              backgroundColor: 'transparent',
              color: '#a05828',
              border: '2px solid #a05828',
              padding: '0.6rem 1.5rem',
              borderRadius: 'var(--border-radius-pill)',
              fontWeight: 600,
              fontSize: '0.85rem',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.target.style.backgroundColor = '#a05828'; e.target.style.color = 'white'; }}
            onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#a05828'; }}
            >
              Learn More About Our Approach
            </button>
          </Link>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section style={{
        background: 'linear-gradient(180deg, #bde2ea 0%, #9dd0de 100%)',
        padding: '5rem 2rem',
        textAlign: 'center'
      }}>
        <h2 style={{ color: 'white', fontSize: '2.5rem', fontFamily: 'var(--font-heading)', marginBottom: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          Ready to Begin the Adventure?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', marginBottom: '2rem' }}>
          It only takes 5 minutes. No signup required for a quick screening.
        </p>
        <Link to="/task/written">
          <button style={{
            backgroundColor: 'white',
            color: '#a05828',
            border: 'none',
            padding: '1rem 3rem',
            fontSize: '1.1rem',
            borderRadius: 'var(--border-radius-pill)',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            boxShadow: '0 6px 25px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.target.style.transform = 'translateY(-3px)'}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Start Now — It's Free
          </button>
        </Link>
      </section>
    </div>
  );
}
