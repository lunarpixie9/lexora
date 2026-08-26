import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Mail, MessageCircle } from 'lucide-react';

const faqs = [
  {
    category: 'General',
    questions: [
      { q: 'What is Lexora?', a: 'Lexora is an AI-powered screening tool designed to detect early indicators of reading difficulties (such as dyslexia) in children through fun, game-like tasks. It analyzes writing patterns and reading fluency to flag potential risks.' },
      { q: 'Is Lexora a diagnosis tool?', a: 'No. Lexora is a screening aid, not a clinical diagnosis. It identifies patterns associated with reading difficulty and recommends professional evaluation when risk is detected.' },
      { q: 'What age group is Lexora designed for?', a: 'Lexora is designed for children aged 5–12. The reading passages and writing prompts are calibrated for different difficulty levels within this range.' },
      { q: 'Is it free to use?', a: 'The basic screening is free. Detailed reports, historical tracking, and classroom-level analytics may require a subscription in the future.' },
    ]
  },
  {
    category: 'For Teachers',
    questions: [
      { q: 'Can I use Lexora for my entire classroom?', a: 'Yes! Teachers can create multiple student profiles and run screenings individually. The dashboard shows aggregate insights across all students.' },
      { q: 'What should I do if a student is flagged as high risk?', a: 'We recommend sharing the report with the child\'s parents and referring to a qualified educational psychologist or speech-language pathologist for a full evaluation.' },
      { q: 'How long does a screening take?', a: 'A typical screening session takes 5–10 minutes, covering 2–3 writing prompts or reading passages.' },
    ]
  },
  {
    category: 'For Parents',
    questions: [
      { q: 'Is my child\'s data safe?', a: 'Absolutely. All audio recordings and written text are encrypted at rest. We comply with COPPA, GDPR-K, and India\'s DPDP Act. We never sell data to third parties.' },
      { q: 'Will this upset my child?', a: 'No! Lexora is designed to feel like a game, not a test. Children interact with friendly animal characters and complete creative writing or storytelling activities. Most children enjoy the experience.' },
      { q: 'What if Lexora says my child is at risk?', a: 'Don\'t panic. "Risk" means the tool detected patterns worth investigating further. Many factors (tiredness, distraction, nervousness) can influence results. We recommend repeating the screening and consulting a professional.' },
    ]
  },
  {
    category: 'Technical',
    questions: [
      { q: 'What indicators does Lexora detect?', a: 'Letter reversals (b/d, p/q), letter transpositions (was→saw), phonetic spelling errors, reading fluency (words per minute), pause patterns, and spelling consistency.' },
      { q: 'What AI/ML models does Lexora use?', a: 'Lexora uses a combination of rule-based NLP for spelling pattern detection, OpenAI Whisper for speech-to-text, forced alignment for fluency timing, and XGBoost for the overall risk scoring model. The system is designed for explainability.' },
      { q: 'Does Lexora work with non-English speakers?', a: 'Currently, Lexora supports English only. We are exploring support for Hindi and other Indic languages in a future version.' },
    ]
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      backgroundColor: 'white', borderRadius: '12px',
      overflow: 'hidden', boxShadow: open ? 'var(--shadow-soft)' : 'none',
      border: '1px solid #e5dccf', transition: 'box-shadow 0.2s'
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '1.25rem 1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: open ? '#faf5ed' : 'white',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          fontFamily: 'var(--font-primary)', fontSize: '1rem',
          fontWeight: 600, color: 'var(--color-text-dark)',
          transition: 'background-color 0.2s'
        }}
      >
        {q}
        {open ? <ChevronUp size={18} color="#999" /> : <ChevronDown size={18} color="#999" />}
      </button>
      {open && (
        <div style={{ padding: '0 1.5rem 1.25rem', color: '#8a715a', lineHeight: 1.7, fontSize: '0.92rem' }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function Support() {
  return (
    <div>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #bde2ea 0%, #a8d8e4 100%)',
        padding: '5rem 2rem', textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '3rem', color: 'white', marginBottom: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>Help & FAQ</h1>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem' }}>Everything you need to know about using Lexora.</p>
      </section>

      {/* FAQ Sections */}
      <section style={{ padding: '4rem 2rem', backgroundColor: 'var(--color-bg-cream)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {faqs.map((section, i) => (
            <div key={i} style={{ marginBottom: '3rem' }}>
              <h2 style={{ color: '#a05828', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1rem' }}>
                {section.category}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {section.questions.map((faq, j) => (
                  <FAQItem key={j} q={faq.q} a={faq.a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section style={{ padding: '4rem 2rem', backgroundColor: '#f0e6d6' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: '#68594d', fontSize: '1.8rem', marginBottom: '1rem' }}>Still Have Questions?</h2>
          <p style={{ color: '#8a715a', marginBottom: '2rem' }}>
            We're here to help. Reach out to our team.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{
              backgroundColor: 'white', padding: '2rem 3rem',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: 'var(--shadow-soft)', textAlign: 'center',
              minWidth: '250px'
            }}>
              <Mail size={32} color="#a05828" style={{ marginBottom: '0.75rem' }} />
              <h3 style={{ color: '#4a4a4a', marginBottom: '0.5rem' }}>Email Us</h3>
              <p style={{ color: '#8a715a', fontSize: '0.9rem' }}>support@lexora.app</p>
            </div>
            <div style={{
              backgroundColor: 'white', padding: '2rem 3rem',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: 'var(--shadow-soft)', textAlign: 'center',
              minWidth: '250px'
            }}>
              <MessageCircle size={32} color="#5ba4b5" style={{ marginBottom: '0.75rem' }} />
              <h3 style={{ color: '#4a4a4a', marginBottom: '0.5rem' }}>Live Chat</h3>
              <p style={{ color: '#8a715a', fontSize: '0.9rem' }}>Available Mon–Fri, 9am–5pm IST</p>
            </div>
          </div>
        </div>
      </section>

      {/* Accessibility Note */}
      <section style={{ padding: '3rem 2rem', backgroundColor: 'var(--color-bg-cream)', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <span style={{ fontSize: '2rem' }}>♿</span>
          <h3 style={{ color: '#68594d', margin: '0.75rem 0' }}>Accessibility</h3>
          <p style={{ color: '#8a715a', fontSize: '0.9rem', lineHeight: 1.7 }}>
            Lexora is committed to making our platform accessible to all users. We follow WCAG 2.1 guidelines. If you encounter any accessibility barriers, please contact us and we will work to resolve them promptly.
          </p>
        </div>
      </section>
    </div>
  );
}
