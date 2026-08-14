'use client'

import { Check } from 'lucide-react'
import { Avatar, AVATAR_OPTIONS } from '@/features/shared/avatar'
import { Field, Input } from '@/components/ui/input'
import { DISPLAY_NAME_MAX, validateDisplayName } from '@/lib/profile'

export function DisplayNameField({
  value,
  onChange,
  disabled = false,
  id = 'display-name',
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
}) {
  const error = value.length > 0 ? validateDisplayName(value) : 'Display name is required.'
  return (
    <Field label="Display name" htmlFor={id} error={error ?? undefined}>
      <Input
        id={id}
        value={value}
        maxLength={DISPLAY_NAME_MAX}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        placeholder="Your name"
      />
    </Field>
  )
}

export function AvatarPicker({
  name,
  value,
  onChange,
  disabled = false,
}: {
  name: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2.5" role="group" aria-label="Choose avatar color">
      {AVATAR_OPTIONS.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            disabled={disabled}
            aria-pressed={active}
            aria-label={`Avatar color ${option}`}
            className="press relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            <Avatar name={name || 'Word Smartify'} avatarId={option} size="md" />
            {active ? (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border-2 border-foreground bg-foreground text-primary-foreground">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function profileSaveDisabled(name: string, saving: boolean): boolean {
  return saving || validateDisplayName(name) != null
}
