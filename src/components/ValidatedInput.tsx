"use client";

import { Check, X } from "lucide-react";
import { useState, type ChangeEvent } from "react";

type ValidatedInputProps = {
  label?: string;                     // ← ahora opcional
  type?: string;
  placeholder?: string;
  required?: boolean;
  validate?: (value: string) => boolean;
  value: string;
  onChange: (value: string) => void;
};

export default function ValidatedInput({
  label,
  type = "text",
  placeholder,
  required = false,
  validate,
  value,
  onChange,
}: ValidatedInputProps) {
  const [touched, setTouched] = useState(false);

  const isValid = validate ? validate(value) : value.trim() !== "";
  const labelText = label ?? placeholder ?? "";

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-1">
      {labelText && <label className="text-sm font-medium">{labelText}</label>}
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          required={required}
          onBlur={() => setTouched(true)}
          onChange={handleChange}
          aria-label={labelText || undefined}
          aria-invalid={touched ? !isValid : undefined}   // ← booleano, no string
          className={`w-full border rounded px-3 py-2 pr-8 focus:outline-none ${
            touched ? (isValid ? "border-green-500" : "border-red-500") : "border-gray-300"
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
  );
}
