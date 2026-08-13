'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input, Field } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder = '••••••••',
  error,
  hint,
  required,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  placeholder?: string
  error?: string
  hint?: string
  required?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn('pr-11')}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="press absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Field>
  )
}
