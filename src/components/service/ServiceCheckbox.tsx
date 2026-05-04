'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

interface ServiceCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

export function ServiceCheckbox({
  id,
  label,
  checked,
  onChange,
  children,
  className = '',
}: ServiceCheckboxProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label
        htmlFor={id}
        className={`
          flex items-center gap-3 p-3 rounded-lg border cursor-pointer
          transition-all duration-200
          ${checked 
            ? 'bg-blue-50 border-blue-500 shadow-sm' 
            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }
        `}
      >
        <div
          className={`
            w-5 h-5 rounded border flex items-center justify-center
            transition-colors duration-200
            ${checked
              ? 'bg-blue-500 border-blue-500'
              : 'bg-white border-gray-300'
            }
          `}
        >
          {checked && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <span className={`font-medium ${checked ? 'text-blue-900' : 'text-gray-700'}`}>
          {label}
        </span>
      </label>
      
      {/* Conditional children (price/quantity fields) */}
      {checked && children && (
        <div className="pl-8 animate-in slide-in-from-top-1 duration-200">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface PriceFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}

export function PriceField({ label, value, onChange, placeholder }: PriceFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={0.01}
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder || '0.00'}
          className="
            w-full px-3 py-2 pr-12 rounded-lg border border-gray-300
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-all duration-200
          "
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          MDL
        </span>
      </div>
    </div>
  );
}

interface QuantityFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function QuantityField({ label, value, onChange, min = 1, max = 99 }: QuantityFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          -
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || min)}
          className="
            w-16 px-2 py-2 text-center rounded-lg border border-gray-300
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-all duration-200
          "
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

interface DescriptionFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DescriptionField({ value, onChange, placeholder }: DescriptionFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        Descriere serviciu
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Descrieți serviciul...'}
        rows={2}
        className="
          w-full px-3 py-2 rounded-lg border border-gray-300
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-all duration-200 resize-none
        "
      />
    </div>
  );
}
