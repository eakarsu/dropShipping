'use client';

export type FullFieldPreset = { label: string; values: Record<string, unknown> };

/**
 * Fill every field in the current AI form, required and optional.
 * Ported from the canonical FullFieldPresets pattern so every preset button
 * populates the whole request, not just one input.
 */
export function fillEveryField(values: Record<string, unknown>, variant = 0, choices: Record<string, unknown[]> = {}) {
  const names = ['Standard operations review', 'Detailed fulfillment review', 'Returns and policy review'];
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    if (['id', 'created_at', 'updated_at', 'user_id'].includes(key)) return [key, value];
    if (choices[key]) return [key, choices[key][variant % choices[key].length]];
    if (Array.isArray(value)) return [key, [`${names[variant]} example`, 'Confirm against verified order and supplier records.']];
    if (value && typeof value === 'object') return [key, {}];
    if (typeof value === 'boolean') return [key, true];
    if (/date|deadline|valid_until/.test(key)) return [key, new Date(Date.now() + (variant + 7) * 86400000).toISOString().slice(0, 10)];
    if (/email/.test(key)) return [key, `operator${variant + 1}@example.com`];
    if (/budget|price|cost|amount/.test(key)) return [key, [2400, 650, 4200][variant]];
    if (typeof value === 'number') return [key, [3, 2, 5][variant]];
    if (/status/.test(key)) return [key, 'Pending'];
    if (/title|name/.test(key)) return [key, names[variant]];
    return [key, `${names[variant]} example: use only the verified context supplied, state uncertainty, and list the evidence and human approvals required before any supplier, order, payment or fulfillment action.`];
  }));
}

export default function FullFieldPresets({ value, onChange, choices = {}, presets, disabled = false }: {
  value?: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  choices?: Record<string, unknown[]>;
  presets?: FullFieldPreset[];
  disabled?: boolean;
}) {
  const labels = presets ? presets.map((preset) => preset.label) : ['Standard example', 'Detailed example', 'Exception example'];
  return (
    <div className="ai-preset-bar">
      <div>
        <strong>Fill every field</strong>
        <p>Each example fills required and optional fields. Review and edit before generating.</p>
      </div>
      <div className="ai-actions">
        {labels.map((label, index) => (
          <button
            type="button"
            className="button subtle"
            key={label}
            disabled={disabled}
            onClick={() => onChange(presets ? { ...(value ?? {}), ...presets[index].values } : fillEveryField(value ?? {}, index, choices))}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
