// Painel de ajustes gerado a partir de ControlDef (core/controls.ts). Usado pelo
// Museu Virtual (HUD da sala interativa, camada A) e pelas páginas de AR.
//
// Não conhece nenhum experimento: desenha qualquer lista de ControlDef
// (core/controls.ts). É o "hospedeiro" dos controles no Museu Virtual — a
// página do experimento continua com seus sliders próprios em JSX.

import type { ControlDef, ControlValue, ControlValues } from '../../core/controls';

interface Props {
  title: string;
  controls: ControlDef[];
  values: ControlValues;
  compact: boolean; // celular: painel embaixo, largura total
  onChange: (id: string, value: ControlValue) => void;
  onClose: () => void;
  closeLabel: string;
  // Controle de videogame: linha selecionada e dica de uso (opcionais).
  focusedId?: string;
  hint?: string;
}

export default function ControlsHud({ title, controls, values, compact, onChange, onClose, closeLabel, focusedId, hint }: Props) {
  return (
    <div
      role="dialog"
      aria-label={`Ajustes — ${title}`}
      style={{
        position: 'absolute', zIndex: 20,
        ...(compact
          ? { left: 0, right: 0, bottom: 0, borderRadius: '16px 16px 0 0', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }
          : { top: 20, right: 20, width: 340, borderRadius: 12 }),
        background: 'var(--bg-surface)', color: 'var(--text)', border: '1px solid var(--border)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4)', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'Inter, sans-serif',
      }}
    >
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ajustes</div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
      </div>

      {controls.map((c) => (
        <label
          key={c.id}
          style={{
            display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, borderRadius: 4,
            outline: c.id === focusedId ? '2px solid var(--primary)' : 'none', outlineOffset: 4,
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>
            {c.label}
            {c.kind === 'range' && (
              <strong style={{ color: 'var(--text)', marginLeft: 6 }}>
                {Number(values[c.id]).toFixed(decimals(c.step))}{c.unit ? ` ${c.unit}` : ''}
              </strong>
            )}
          </span>
          {c.kind === 'range' ? (
            <input
              type="range" min={c.min} max={c.max} step={c.step}
              value={Number(values[c.id])}
              onChange={(e) => onChange(c.id, Number(e.target.value))}
              style={{ width: '100%' }}
            />
          ) : (
            <select
              value={String(values[c.id])}
              onChange={(e) => onChange(c.id, e.target.value)}
              style={{
                background: 'var(--bg-surface2)', color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '6px 8px', fontSize: 14,
              }}
            >
              {c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
        </label>
      ))}

      {hint && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hint}</div>}

      <button
        onClick={onClose}
        style={{
          marginTop: 4, background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none',
          borderRadius: 8, padding: '9px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {closeLabel}
      </button>
    </div>
  );
}

function decimals(step: number): number {
  const s = String(step);
  return s.includes('.') ? s.split('.')[1].length : 0;
}
