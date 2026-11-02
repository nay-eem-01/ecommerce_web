interface Props {
  value: number
  min?: number
  max: number
  label: string
  onChange: (value: number) => void
  disabled?: boolean
}

/** The prototype's quantity stepper: − value +. */
export function Stepper({ value, min = 1, max, label, onChange, disabled }: Props) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label="One less" disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label="One more" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}
