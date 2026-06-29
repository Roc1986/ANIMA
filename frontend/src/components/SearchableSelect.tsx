import { useRef, useState } from 'react'
import { Controller } from 'react-hook-form'

export interface SelectOption {
  value: string | number
  label: string
}

interface SearchableSelectProps {
  options: SelectOption[]
  value?: string | number
  onChange?: (value: string | number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  className = '',
  disabled = false,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedLabel = options.find(o => String(o.value) === String(value ?? ''))?.label ?? ''
  const displayValue = editing ? query : selectedLabel

  const filtered = options.filter(o =>
    !query || o.label.toLowerCase().includes(query.toLowerCase())
  )

  const selectOption = (opt: SelectOption) => {
    onChange?.(opt.value)
    setQuery('')
    setEditing(false)
    setOpen(false)
    setHighlightIdx(-1)
  }

  return (
    <div className="relative">
      <input
        type="text"
        className={`input-field ${className}`}
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onChange={e => { setQuery(e.target.value); setEditing(true); setOpen(true); setHighlightIdx(-1) }}
        onFocus={() => { setOpen(true); setEditing(true); setQuery('') }}
        onBlur={() => setTimeout(() => { setOpen(false); setEditing(false); setQuery('') }, 150)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setHighlightIdx(i => Math.min(i + 1, filtered.length - 1))
            setTimeout(() => {
              const el = listRef.current?.children[Math.min(highlightIdx + 1, filtered.length - 1)] as HTMLElement
              el?.scrollIntoView({ block: 'nearest' })
            }, 0)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightIdx(i => Math.max(i - 1, 0))
          } else if ((e.key === 'Enter' || e.key === 'Tab') && open && filtered.length > 0) {
            const idx = highlightIdx >= 0 ? highlightIdx : 0
            if (filtered[idx]) {
              if (e.key === 'Enter') e.preventDefault()
              selectOption(filtered[idx])
            }
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto text-sm"
        >
          {filtered.map((opt, idx) => (
            <li
              key={String(opt.value)}
              className={`px-4 py-2 cursor-pointer ${idx === highlightIdx ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
              onMouseEnter={() => setHighlightIdx(idx)}
              onMouseDown={() => selectOption(opt)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// react-hook-form Controller wrapper — replaces <select {...register('field')} ...>
interface RHFSearchableSelectProps {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any
  rules?: Record<string, unknown>
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  asNumber?: boolean  // coerce value to number on change
}

export function RHFSearchableSelect({
  name,
  control,
  rules,
  options,
  placeholder,
  className,
  disabled,
  asNumber = false,
}: RHFSearchableSelectProps) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <SearchableSelect
          options={options}
          value={field.value ?? ''}
          onChange={v => field.onChange(asNumber ? Number(v) : v)}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
        />
      )}
    />
  )
}
