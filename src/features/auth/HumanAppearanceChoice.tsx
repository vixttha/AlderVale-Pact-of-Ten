import React from 'react';
import type { WizardSculpt } from '../../../shared/wardrobe.ts';

interface Props {
  value: WizardSculpt['humanModel'];
  onChange: (value: 'rowan' | 'classic') => void;
}
export function HumanAppearanceChoice({ value = 'rowan', onChange }: Props) {
  return (
    <div className="space-y-1 text-xs">
      <label className="flex flex-wrap items-center gap-2 font-semibold">
        <span>Human appearance</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as 'rowan' | 'classic')}
          className="rounded-lg border border-white/20 bg-[#101626] px-2 py-1.5 text-white"
        >
          <option value="rowan">Rowan</option>
          <option value="classic">Classic customizable</option>
        </select>
      </label>
      <p className="font-normal opacity-80">
        {value === 'rowan'
          ? 'Rowan keeps its authored face, hair and outfit. Height, build and gear stats still apply. Choose Classic for custom styling.'
          : 'Classic supports custom hair, face, dyes and wardrobe styles.'}
      </p>
    </div>
  );
}
