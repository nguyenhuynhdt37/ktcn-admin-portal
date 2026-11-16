import type { ReactNode } from 'react'
import { Input } from '@/shared/components/ui/input'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="builder-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function NumberField({
  label,
  value,
  min = 0,
  max = 120,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}) {
  return (
    <Field label={`${label}: ${value}`}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  )
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <div className="builder-color">
      <label>
        <input
          type="color"
          aria-label={label}
          value={value || '#ffffff'}
          onChange={(event) => onChange(event.target.value)}
        />
        <span>{label}</span>
      </label>
      <button
        type="button"
        onClick={() => onChange(null)}
        disabled={!value}
        aria-label={`Kế thừa ${label.toLowerCase()}`}
      >
        {value || 'Kế thừa'}
      </button>
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  maxLength = 255,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  maxLength?: number
}) {
  return (
    <Field label={label}>
      {multiline ? (
        <textarea
          rows={5}
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          maxLength={maxLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  )
}
