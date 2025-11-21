"use client";

import { useState } from "react";

interface CountryCode {
  code: string;
  country: string;
  flag: string;
  digits: number;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: "+91", country: "IN", flag: "🇮🇳", digits: 10 },
  { code: "+1", country: "US", flag: "🇺🇸", digits: 10 },
];

interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function CountryCodeSelect({ value, onChange, disabled }: CountryCodeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCountry = COUNTRY_CODES.find(c => c.code === value) || COUNTRY_CODES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 h-10 border border-input bg-background rounded-l-md hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        <span className="text-lg">{selectedCountry.flag}</span>
        <span className="text-sm font-medium">{selectedCountry.code}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-48 bg-background border border-input rounded-md shadow-lg z-50">
            {COUNTRY_CODES.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => {
                  onChange(country.code);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors text-left"
              >
                <span className="text-lg">{country.flag}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{country.country}</div>
                  <div className="text-xs text-muted-foreground">{country.code}</div>
                </div>
                {country.code === value && (
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function getCountryCodeDigits(code: string): number {
  return COUNTRY_CODES.find(c => c.code === code)?.digits || 10;
}

