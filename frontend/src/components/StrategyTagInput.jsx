import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';

// Free-form animated strategy tags. No suggestions, no dropdown, no autocomplete.
export default function StrategyTagInput({ value = [], onChange, placeholder = 'Type a strategy, press Enter' }) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef();
  const tags = Array.isArray(value) ? value : [];

  const commit = () => {
    const t = draft.trim();
    if (!t) { setDraft(''); return; }
    if (!tags.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...tags, t]);
    setDraft('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && tags.length) {
      // pop last pill back into the input for editing
      const last = tags[tags.length - 1];
      onChange(tags.slice(0, -1));
      setDraft(last);
    }
  };

  const removeAt = (i) => onChange(tags.filter((_, idx) => idx !== i));
  const editAt = (i) => {
    const t = tags[i];
    onChange(tags.filter((_, idx) => idx !== i));
    setDraft((d) => (d ? `${d} ${t}` : t));
    inputRef.current?.focus();
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="min-h-[44px] w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-2 py-1.5 flex flex-wrap items-center gap-2 cursor-text transition focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20"
    >
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="pill-in inline-flex items-center gap-1.5 rounded-full border border-white/[0.16] bg-white/[0.05] pl-3 pr-2 py-1 text-sm text-gray-200 whitespace-nowrap"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); editAt(i); }}
            className="hover:text-white transition-colors"
            title="Click to edit"
          >
            {tag}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeAt(i); }}
            className="text-gray-500 hover:text-red-400 transition-colors"
            title="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={tags.length ? '' : placeholder}
        className="flex-1 min-w-[130px] bg-transparent outline-none text-sm text-white placeholder:text-gray-600 py-1"
      />
    </div>
  );
}
