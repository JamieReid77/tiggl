'use client';

import { type FormEvent, useEffect, useId, useState } from 'react';

import { type ScoreOffer, scoreOfferCopy } from '@/lib/highScores';
import { nameMaxLength, parsePlayerName } from '@/lib/playerName';

export type HighScoreEntryProps = {
  offer: ScoreOffer;
  saving?: boolean;
  nameError?: string | null;
  onSave?: (name: string) => void;
  onSkip?: () => void;
};

export const HighScoreEntry = ({
  offer,
  saving = false,
  nameError,
  onSave,
  onSkip,
}: HighScoreEntryProps) => {
  const nameId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError ?? nameError;
  const copy = scoreOfferCopy(offer);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) {
        return;
      }

      onSkip?.();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip, saving]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parsePlayerName(draft);

    if (!parsed.ok) {
      setLocalError(parsed.error);
      return;
    }

    setLocalError(null);
    onSave?.(parsed.name);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="tiggl-offer-in pointer-events-auto flex flex-col items-end gap-1.5"
    >
      <div className="flex h-11 items-center bg-zinc-900">
        <label
          htmlFor={nameId}
          className="tiggl-new-score flex items-center px-4 text-[11px] leading-none font-semibold tracking-[0.14em] text-[#f0c75e] uppercase [text-shadow:0_0_12px_rgb(240_199_94_/_0.45)]"
        >
          {copy}
        </label>
        <div className="tiggl-name-field flex h-full items-center px-3">
          <div
            className="relative font-mono text-[11px] font-semibold"
            style={{
              width: `calc(${nameMaxLength}ch + ${nameMaxLength - 1} * 0.4em)`,
            }}
          >
            <input
              id={nameId}
              value={draft}
              onChange={event => {
                setDraft(event.target.value.toUpperCase());
                setLocalError(null);
              }}
              maxLength={nameMaxLength}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              disabled={saving}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              placeholder="ENTER YOUR NAME"
              className="w-full bg-transparent p-0 font-mono text-[11px] leading-none font-semibold tracking-[0.4em] text-white uppercase caret-white outline-none placeholder:text-white/50 disabled:opacity-60"
            />
            <span
              className="pointer-events-none absolute inset-x-0 top-full flex gap-[0.4em]"
              aria-hidden
            >
              {Array.from({ length: nameMaxLength }, (_, index) => (
                <span
                  key={index}
                  className="block h-0 w-[1ch] shrink-0 border-b border-white/55"
                />
              ))}
            </span>
          </div>
        </div>
        <button type="submit" className="sr-only" disabled={saving}>
          {saving ? 'Saving' : 'Save'}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
};
