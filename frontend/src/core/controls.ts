// Descrição DECLARATIVA de controles (ver ARQUITETURA.md, seção 22).
//
// Em vez de cada experimento desenhar seus sliders em JSX, ele descreve os
// controles como dados. Cada hospedeiro decide como exibi-los — hoje o HUD do
// Museu Virtual (museum/ControlsHud.tsx); no futuro, um painel 3D no VR.

export type ControlValue = number | string;
export type ControlValues = Record<string, ControlValue>;

interface BaseControl {
  id: string;
  label: string;
}

export interface RangeControl extends BaseControl {
  kind: 'range';
  min: number;
  max: number;
  step: number;
  unit?: string;
  default: number;
}

export interface SelectControl extends BaseControl {
  kind: 'select';
  options: { value: string; label: string }[];
  default: string;
}

export type ControlDef = RangeControl | SelectControl;

// Valor seguinte de um controle (direction = +1 ou -1), para quem ajusta por
// passos em vez de arrastar, como o controle de videogame: o range anda um
// `step` e para nos limites; o select percorre as opções em círculo.
export function stepControl(control: ControlDef, value: ControlValue, direction: 1 | -1): ControlValue {
  if (control.kind === 'select') {
    const n = control.options.length;
    const current = control.options.findIndex((o) => o.value === value);
    return control.options[(current + direction + n) % n].value;
  }
  const stepped = Number(value) + direction * control.step;
  const decimals = (String(control.step).split('.')[1] ?? '').length;
  return Number(Math.min(Math.max(stepped, control.min), control.max).toFixed(decimals));
}

export function defaultValues(controls: ControlDef[]): ControlValues {
  return Object.fromEntries(controls.map((c) => [c.id, c.default]));
}
