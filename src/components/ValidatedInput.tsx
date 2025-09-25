"use client"

import { Check, X } from "lucide-react"
import { useState } from "react"

type ValidatedInputProps = {
  label: string
  type?: string
  placeholder?: string
  required?: boolean
  validate?: (value: string) => boolean
  value: string
  onChange: (value: string) => void
}

export default function ValidatedInput({
  label,
  type = "text",
  placeholder,
  required = false,
  validate,
  value,
  onChange,
}: ValidatedInputProps) {
  const [touched, setTouched] = useState(false)

  const isValid = validate ? validate(value) : value.trim() !== ""

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          required={required}
          onBlur={() => setTouched(true)}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full border rounded px-3 py-2 pr-8 focus:outline-none ${
            touched
              ? isValid
                ? "border-green-500"
                : "border-red-500"
              : "border-gray-300"
          }`}
        />
        {touched && isValid && (
          <Check className="absolute right-2 top-1/2 -translate-y-1/2 text-green-600 w-4 h-4" />
        )}
        {touched && !isValid && (
          <X className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600 w-4 h-4" />
        )}
      </div>
    </div>
  )
}
