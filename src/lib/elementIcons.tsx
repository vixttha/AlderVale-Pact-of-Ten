import React from 'react';
import { ELEMENTS, type ElementId } from '../../shared/elements.ts';

interface ElementCrestProps {
  elementId: ElementId;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

/**
 * Colorblind-safe geometric Element Crest + optional text badge.
 * Never communicates element identity by color hue alone.
 */
export const ElementCrest: React.FC<ElementCrestProps> = ({
  elementId,
  size = 18,
  showLabel = false,
  className = '',
}) => {
  const el = ELEMENTS[elementId];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${className}`}
      title={`${el.name} (${el.crestShape})`}
    >
      <span
        className="inline-flex items-center justify-center rounded-md border border-black/20 shadow-xs shrink-0"
        style={{
          width: size + 6,
          height: size + 6,
          backgroundColor: el.primaryHex,
          color: '#fffdf7',
        }}
      >
        <svg
          width={size - 2}
          height={size - 2}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={el.crestSvgPath} fill="currentColor" fillOpacity="0.28" />
        </svg>
      </span>
      {showLabel && <span className="text-xs tracking-tight">{el.name}</span>}
    </span>
  );
};
