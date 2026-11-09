import { useEffect, useRef, useState } from 'react';
import { createXRDnaScene, type XRDnaScene } from './scene';

const MIN_BP = 6;
const MAX_BP = 30;

export default function XRDnaHelixSimulation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const vrBtnRef     = useRef<HTMLDivElement>(null);
  const sceneRef     = useRef<XRDnaScene | null>(null);
  const [basePairs, setBasePairs] = useState(14);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const s = createXRDnaScene(container);
    sceneRef.current = s;

    const btn = s.vrButton as HTMLElement;
    btn.style.position  = 'relative';
    btn.style.left      = 'unset';
    btn.style.bottom    = 'unset';
    btn.style.right     = 'unset';
    btn.style.transform = 'none';
    vrBtnRef.current?.appendChild(btn);

    s.onBasePairsChange = (n) => setBasePairs(n);

    return () => {
      s.dispose();
      sceneRef.current = null;
    };
  }, []);

  function handleBPChange(n: number) {
    setBasePairs(n);
    sceneRef.current?.setBasePairs(n);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#020d06', color: '#e0e0f0', fontFamily: 'Inter, sans-serif' }}>

      {/* Canvas XR */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>

        {/* Badge XR */}
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(46,204,113,0.15)', border: '1px solid #2ecc71',
          borderRadius: 6, padding: '4px 12px', fontSize: 11,
          letterSpacing: '0.15em', color: '#2ecc71', zIndex: 10,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          WebXR · Dupla Hélice de DNA
        </div>

        {/* Overlay info */}
        <div style={{ position: 'absolute', top: 16, left: 20, pointerEvents: 'none', zIndex: 10 }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: '#2ecc71', lineHeight: 1 }}>DNA</span>
          <div style={{ fontSize: 14, color: '#aaa', marginTop: 4 }}>
            Dupla Hélice · {basePairs} pares de base
          </div>
        </div>

        {/* Dica XR */}
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(2,13,6,0.75)', border: '1px solid #1a3322',
          borderRadius: 8, padding: '8px 18px', fontSize: 12, color: '#446644',
          backdropFilter: 'blur(4px)', zIndex: 10, textAlign: 'center',
          pointerEvents: 'none',
        }}>
          Em VR: gatilho direito ou A → +2 pares · gatilho esquerdo ou B → −2 pares · com controle, os analógicos andam e giram, RT/LT sobem e descem
        </div>
      </div>

      {/* Painel de controles (desktop) */}
      <div style={{
        padding: '14px 24px', background: '#040f06',
        borderTop: '1px solid #0d2212',
        display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center',
      }}>

        {/* Slider de pares de base */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: '#335533', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Pares de Base: {basePairs}
          </label>
          <input
            type="range" min={MIN_BP} max={MAX_BP} step={2} value={basePairs}
            onChange={(e) => handleBPChange(Number(e.target.value))}
            style={{ width: 180, cursor: 'pointer' }}
          />
        </div>

        {/* Legenda */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {[
            { color: '#e74c3c', label: 'Fita 1'  },
            { color: '#3498db', label: 'Fita 2'  },
            { color: '#f39c12', label: 'Par A-T' },
            { color: '#2ecc71', label: 'Par G-C' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
              <span style={{ color: '#446644' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Botão VR */}
        <div ref={vrBtnRef} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }} />
      </div>
    </div>
  );
}
