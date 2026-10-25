import { useState, useEffect, useRef } from 'react';
import { simulations, type SimulationMeta } from '../simulations/registry';
import { isNativeApp } from '../core/platform';

const MOBILE_BREAKPOINT = 640;

const CATEGORY_ACCENT: Record<string, string> = {
  Química: 'var(--accent-quimica)',
  Física:  'var(--accent-fisica)',
  Biologia:'var(--accent-bio)',
};

const CATEGORY_GRADIENT: Record<string, string> = {
  Química: 'linear-gradient(135deg, #0d2a4a 0%, #1a4a7a 50%, #0d2a4a 100%)',
  Física:  'linear-gradient(135deg, #1a0d2e 0%, #3a1a5a 50%, #1a0d2e 100%)',
  Biologia:'linear-gradient(135deg, #0d2a1a 0%, #1a4a2e 50%, #0d2a1a 100%)',
};

const ALL_CATEGORIES = ['Todas', 'Química', 'Física', 'Biologia'] as const;

interface Props {
  onNavigate: (id: string) => void;
  onGoMuseum: () => void;
  onGoSobre: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Home({ onNavigate, onGoMuseum, onGoSobre, theme, onToggleTheme }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  const filtered = simulations.filter((s) => {
    const matchCat = activeCategory === 'Todas' || s.category === activeCategory;
    const matchSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const available = filtered.filter((s) => s.available);
  const soon      = filtered.filter((s) => !s.available);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Navbar ── */}
      <header style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1152,
          margin: '0 auto',
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: '1.35rem',
            color: 'var(--accent-fisica)',
            letterSpacing: '-0.01em',
            flexShrink: 0,
          }}>
            CLARA<span style={{ color: 'var(--text-muted)', fontWeight: 400, fontStyle: 'italic' }}>.js</span>
          </span>

          {isMobile ? (
            /* ── Hamburger ── */
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Menu"
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ display: 'block', width: 18, height: 2, background: 'currentColor', borderRadius: 2 }} />
                <span style={{ display: 'block', width: 18, height: 2, background: 'currentColor', borderRadius: 2 }} />
                <span style={{ display: 'block', width: 18, height: 2, background: 'currentColor', borderRadius: 2 }} />
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '8px 0',
                  minWidth: 180,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  zIndex: 100,
                }}>
                  {[
                    { label: 'Simulações',    onClick: () => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
                    { label: 'Museu Virtual', onClick: () => { setMenuOpen(false); onGoMuseum(); } },
                    { label: 'Sobre',         onClick: () => { setMenuOpen(false); onGoSobre(); } },
                  ].map(({ label, onClick }) => (
                    <button
                      key={label}
                      onClick={onClick}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        padding: '10px 20px',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        fontSize: 14,
                        fontFamily: 'Inter, sans-serif',
                        transition: 'color 0.15s, background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-surface2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
                    >
                      {label}
                    </button>
                  ))}

                  <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />

                  <button
                    onClick={() => { setMenuOpen(false); onToggleTheme(); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: '10px 20px',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: 14,
                      fontFamily: 'Inter, sans-serif',
                      transition: 'color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-surface2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
                  >
                    <span style={{ fontSize: 16 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
                    {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Nav links */}
              <nav style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 14 }}>
                {[
                  { label: 'Simulações',    onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
                  { label: 'Museu Virtual', onClick: onGoMuseum },
                  { label: 'Sobre',         onClick: onGoSobre },
                ].map(({ label, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: 14,
                      fontFamily: 'Inter, sans-serif',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {/* Theme toggle */}
              <button
                onClick={onToggleTheme}
                title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                style={{
                  background: 'var(--bg-surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '64px 24px',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--accent-fisica)',
            marginBottom: 16,
          }}>
            Simulações Científicas Interativas
          </p>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            lineHeight: 1.15,
            color: 'var(--text)',
            marginBottom: 20,
          }}>
            Explore a ciência<br />
            <em style={{ color: 'var(--accent-fisica)', fontStyle: 'italic' }}>em três dimensões.</em>
          </h1>
          <p style={{
            fontSize: 16,
            color: 'var(--text-muted)',
            lineHeight: 1.7,
            maxWidth: 480,
            margin: '0 auto 36px',
          }}>
            Física, Química e Biologia com simulações 3D de física real — ajuste parâmetros e observe em tempo real.
          </p>

          {/* Search bar */}
          <div style={{ position: 'relative', maxWidth: 440, margin: '0 auto' }}>
            <svg style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              width: 18, height: 18, color: 'var(--text-muted)',
            }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar simulações…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '12px 16px 12px 44px',
                fontSize: 14,
                color: 'var(--text)',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-fisica)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div style={{
        background: 'var(--bg-surface2)',
        borderBottom: '1px solid var(--border)',
        padding: '16px 24px',
      }}>
        <div style={{
          maxWidth: 1152,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '12px 48px',
        }}>
          {[
            { value: '7',          label: 'Simulações disponíveis' },
            { value: '3',          label: 'Áreas do conhecimento'  },
            { value: 'Física real', label: 'Motor de simulação'    },
            { value: '3D',         label: 'WebGL interativo'       },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: '1.3rem',
                color: 'var(--accent-fisica)',
              }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Conteúdo principal ── */}
      <main style={{ maxWidth: 1152, margin: '0 auto', padding: '48px 24px' }}>

        {/* Filtros + contagem */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 32,
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              fontSize: '1.35rem',
              color: 'var(--text)',
              marginBottom: 2,
            }}>
              Experimentos
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {available.length} disponíve{available.length !== 1 ? 'is' : 'l'}
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 99,
                  fontSize: 13,
                  fontWeight: 500,
                  border: '1px solid',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background:  activeCategory === cat ? 'var(--accent-fisica)' : 'var(--bg-surface)',
                  color:       activeCategory === cat ? '#fff' : 'var(--text-muted)',
                  borderColor: activeCategory === cat ? 'var(--accent-fisica)' : 'var(--border)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {available.length === 0 && soon.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem' }}>
              Nenhuma simulação encontrada
            </p>
            <p style={{ fontSize: 13, marginTop: 8 }}>Tente outra busca ou categoria.</p>
          </div>
        ) : (
          <>
            {available.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 20,
                marginBottom: soon.length > 0 ? 48 : 0,
              }}>
                {available.map((sim) => (
                  <SimCard key={sim.id} sim={sim} onClick={() => onNavigate(sim.id)} />
                ))}
              </div>
            )}

            {soon.length > 0 && (
              <>
                <h3 style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                  marginBottom: 16,
                }}>
                  Em breve
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 20,
                }}>
                  {soon.map((sim) => (
                    <SimCard key={sim.id} sim={sim} onClick={() => {}} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        padding: '32px 24px',
        marginTop: 16,
      }}>
        <div style={{
          maxWidth: 1152,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: '1.1rem',
            color: 'var(--accent-fisica)',
          }}>
            CLARA<span style={{ color: 'var(--text-muted)', fontWeight: 400, fontStyle: 'italic' }}>.js</span>
          </span>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            © 2026 CLARA.js — TCC Darlan Ferreira
          </p>
          <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-muted)' }}>
            <button onClick={onGoSobre}     style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 13 }}>Sobre</button>
            <button onClick={onGoMuseum} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 13 }}>Museu Virtual</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ──────────────── SimCard ──────────────── */
function SimCard({ sim, onClick }: { sim: SimulationMeta; onClick: () => void }) {
  const accent   = CATEGORY_ACCENT[sim.category]   ?? '#aaa';
  const gradient = CATEGORY_GRADIENT[sim.category] ?? 'linear-gradient(135deg, #111 0%, #222 100%)';
  // No app de desktop não há WebXR: as variantes RA/RV aparecem, mas
  // desativadas e com a explicação de onde usá-las.
  const webOnly = isNativeApp && !!sim.xr;
  const available = sim.available && !webOnly;

  return (
    <button
      onClick={available ? onClick : undefined}
      disabled={!available}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        textAlign: 'left',
        cursor: available ? 'pointer' : 'default',
        opacity: available ? 1 : 0.5,
        transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        if (!available) return;
        const el = e.currentTarget;
        el.style.borderColor = accent;
        el.style.transform = 'translateY(-3px)';
        el.style.boxShadow = `0 8px 24px ${accent}33`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = 'var(--border)';
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
        {sim.thumbnail ? (
          <img
            src={sim.thumbnail}
            alt={sim.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <CategoryIcon category={sim.category} color={accent} />
          </div>
        )}

        <span style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: `${accent}22`,
          border: `1px solid ${accent}66`,
          color: accent,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '3px 8px',
          borderRadius: 6,
          fontFamily: "'JetBrains Mono', monospace",
          backdropFilter: 'blur(6px)',
        }}>
          {sim.category}
        </span>

        {!available && (
          <span style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 6,
          }}>
            {webOnly ? 'SÓ NO SITE' : 'EM BREVE'}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
          {sim.title}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55, flex: 1 }}>
          {sim.description}
        </p>
        {available && (
          <span style={{ fontSize: 12, color: accent, fontWeight: 500, marginTop: 4 }}>
            Abrir simulação →
          </span>
        )}
        {webOnly && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {sim.xr === 'ar'
              ? 'Realidade aumentada: abra pelo site ou pelo app Android, no celular.'
              : 'Realidade virtual imersiva: abra pelo site no Chrome, com um headset.'}
          </span>
        )}
      </div>
    </button>
  );
}

function CategoryIcon({ category, color }: { category: string; color: string }) {
  const s: React.CSSProperties = { opacity: 0.7, color };

  if (category === 'Física') return (
    <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" style={s}>
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );

  if (category === 'Química') return (
    <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" style={s}>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="4"  r="1.5" /><circle cx="12" cy="20" r="1.5" />
      <circle cx="4"  cy="12" r="1.5" /><circle cx="20" cy="12" r="1.5" />
      <line x1="12" y1="7"  x2="12" y2="9"  />
      <line x1="12" y1="15" x2="12" y2="17" />
      <line x1="7"  y1="12" x2="9"  y2="12" />
      <line x1="15" y1="12" x2="17" y2="12" />
    </svg>
  );

  return (
    <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" style={s}>
      <path d="M12 3c0 0-4 4-4 9s4 9 4 9 4-4 4-9-4-9-4-9z" />
      <path d="M3 12h18" />
      <path d="M5 7.5c2 1.5 5 2.5 7 2.5s5-1 7-2.5" />
      <path d="M5 16.5c2-1.5 5-2.5 7-2.5s5 1 7 2.5" />
    </svg>
  );
}
