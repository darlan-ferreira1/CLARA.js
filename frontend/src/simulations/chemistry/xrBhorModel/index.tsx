import { useEffect, useRef, useState } from 'react';
import { createXRBohrScene, XR_ELEMENTS, type XRBohrScene } from './scene';

export default function XRBohrModelSimulation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const vrBtnRef     = useRef<HTMLDivElement>(null);
  const sceneRef     = useRef<XRBohrScene | null>(null);
  const [elemIndex, setElemIndex] = useState(5); // Carbono

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const s = createXRBohrScene(container);
    sceneRef.current = s;

    // Posiciona o botão VR dentro do painel de controles
    const btn = s.vrButton as HTMLElement;
    btn.style.position  = 'relative';
    btn.style.left      = 'unset';
    btn.style.bottom    = 'unset';
    btn.style.right     = 'unset';
    btn.style.transform = 'none';
    vrBtnRef.current?.appendChild(btn);

    // Sincroniza estado React quando controllers XR mudam o elemento
    s.onElementChange = (idx) => setElemIndex(idx);

    return () => {
      s.dispose();
      sceneRef.current = null;
    };
  }, []);

  function handleElementChange(idx: number) {
    setElemIndex(idx);
    sceneRef.current?.setElement(idx);
  }

  const [sym, name, Z, N] = XR_ELEMENTS[elemIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#050510', color: '#e0e0f0', fontFamily: 'Inter, sans-serif' }}>

      {/* Canvas XR */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>

        {/* Badge XR */}
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(155,89,182,0.2)', border: '1px solid #9b59b6',
          borderRadius: 6, padding: '4px 12px', fontSize: 11,
          letterSpacing: '0.15em', color: '#9b59b6', zIndex: 10,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          WebXR · Modelo de Bohr
        </div>

        {/* Overlay do elemento (visível apenas no modo desktop) */}
        <div style={{ position: 'absolute', top: 16, left: 20, pointerEvents: 'none', zIndex: 10 }}>
          <span style={{ fontSize: 48, fontWeight: 700, color: '#3498db', lineHeight: 1 }}>{sym}</span>
          <div style={{ fontSize: 14, color: '#aaa', marginTop: 2 }}>
            {name} · Z={Z} · A={Z + N}
          </div>
        </div>

        {/* Dica XR (desktop) */}
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(5,5,20,0.75)', border: '1px solid #333366',
          borderRadius: 8, padding: '8px 18px', fontSize: 12, color: '#666',
          backdropFilter: 'blur(4px)', zIndex: 10, textAlign: 'center',
          pointerEvents: 'none',
        }}>
          Em VR: gatilho direito ou A → próximo elemento · gatilho esquerdo ou B → anterior · com controle, os analógicos andam e giram, RT/LT sobem e descem
        </div>
      </div>

      {/* Painel de controles (desktop) */}
      <div style={{
        padding: '14px 24px', background: '#0a0a20',
        borderTop: '1px solid #1a1a44',
        display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center',
      }}>

        {/* Seletor de elemento */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: '#556', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Elemento
          </label>
          <select
            value={elemIndex}
            onChange={(e) => handleElementChange(Number(e.target.value))}
            style={{
              background: '#111130', color: '#e0e0f0',
              border: '1px solid #2a2a55', borderRadius: 6,
              padding: '6px 10px', fontSize: 14, cursor: 'pointer',
            }}
          >
            {XR_ELEMENTS.map(([s, n, p], i) => (
              <option key={s} value={i}>{s} — {n} (Z={p})</option>
            ))}
          </select>
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {[
            { color: '#e74c3c', label: 'Próton'  },
            { color: '#95a5a6', label: 'Nêutron' },
            { color: '#3498db', label: 'Elétron' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
              <span style={{ color: '#666' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Botão VR */}
        <div ref={vrBtnRef} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }} />
      </div>
    </div>
  );
}
