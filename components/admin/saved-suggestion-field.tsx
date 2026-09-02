"use client";

import { useMemo } from "react";
import {
  normalizeSuggestionSearch,
  SAVED_SUGGESTION_MAX_LENGTH,
} from "@/lib/admin/saved-suggestions";

type SavedSuggestionFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  emptyNone: string;
  emptyNoMatch: string;
};

export function SavedSuggestionField({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  emptyNone,
  emptyNoMatch,
}: SavedSuggestionFieldProps) {
  const filtered = useMemo(() => {
    const query = normalizeSuggestionSearch(value);

    if (!query) {
      return suggestions;
    }

    return suggestions.filter((item) =>
      normalizeSuggestionSearch(item).includes(query)
    );
  }, [suggestions, value]);

  return (
    <div>
      <label className="block">
        <span className="mb-2 block text-sm text-slate-300">{label}</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={SAVED_SUGGESTION_MAX_LENGTH}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
        />
      </label>
      <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-700/50">
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-sm text-slate-500">
            {suggestions.length === 0 ? emptyNone : emptyNoMatch}
          </p>
        ) : (
          <ul>
            {filtered.map((item) => {
              const active =
                normalizeSuggestionSearch(item) ===
                normalizeSuggestionSearch(value);

              return (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => onChange(item)}
                    className={`w-full px-3 py-2 text-left text-sm transition ${
                      active
                        ? "bg-cyan-400/15 font-medium text-cyan-300"
                        : "text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {item}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
