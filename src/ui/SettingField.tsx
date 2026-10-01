import { useEffect, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

/** Forklaring som spørgsmålstegn med Hover Card ved etiketten (B-053), som originalens hjælpeikon.
 * Åbner ved mus og tastaturfokus; et tryk åbner og lukker på berøringsskærme. */
export function HelpHint({ label, help }: { label: string; help: string }) {
  const [open, setOpen] = useState(false);
  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="help-hint"
          aria-label={`Forklaring: ${label}`}
          onClick={(e) => {
            e.preventDefault();
            setOpen((v) => !v);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <CircleHelp aria-hidden="true" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="help-hint-content" side="top" align="start">
        {help}
      </HoverCardContent>
    </HoverCard>
  );
}

export type SettingValue = string | number | boolean;
export interface SettingDefinition {
  key: string;
  label: string;
  kind: 'select' | 'radio' | 'checkbox' | 'number';
  options?: { value: SettingValue; label: string }[];
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  inline?: boolean;
}
export function SettingField({
  field,
  value,
  disabled = false,
  refresh = 0,
  change,
}: {
  field: SettingDefinition;
  value: SettingValue;
  disabled?: boolean;
  refresh?: number;
  change: (value: SettingValue) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    setDraft(String(value));
    setInvalid(false);
  }, [value, disabled, refresh]);
  const helpId = `${field.key}-help`;
  const options = field.options ?? [];
  return (
    <div
      className={`setting-field ${disabled ? 'setting-disabled' : ''} ${field.inline ? 'setting-inline' : ''}`}
    >
      {field.kind === 'checkbox' ? (
        <div className="setting-label-row">
          <label className="setting-checkbox">
            <input
              type="checkbox"
              checked={Boolean(value)}
              disabled={disabled}
              onChange={(e) => change(e.target.checked)}
              aria-describedby={field.help ? helpId : undefined}
            />
            <span>{field.label}</span>
          </label>
          {field.help && <HelpHint label={field.label} help={field.help} />}
        </div>
      ) : field.kind === 'radio' ? (
        <fieldset
          disabled={disabled}
          aria-labelledby={`${field.key}-label`}
          aria-describedby={field.help ? helpId : undefined}
        >
          {/* Gruppens navn er alene etiketten; hjælpeikonet står ved siden af (B-053). */}
          <legend>
            <span className="setting-label-row">
              <span id={`${field.key}-label`}>{field.label}</span>
              {field.help && <HelpHint label={field.label} help={field.help} />}
            </span>
          </legend>
          <div className="setting-options">
            {options.map((option, i) => (
              <label key={i}>
                <input
                  type="radio"
                  name={field.key}
                  value={i}
                  checked={value === option.value}
                  onChange={() => change(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <>
          <div className="setting-label-row">
            <label htmlFor={field.key}>{field.label}</label>
            {field.help && <HelpHint label={field.label} help={field.help} />}
          </div>
          {field.kind === 'select' ? (
            <select
              id={field.key}
              disabled={disabled}
              value={options.findIndex((o) => o.value === value)}
              onChange={(e) => change(options[Number(e.target.value)].value)}
              aria-describedby={field.help ? helpId : undefined}
            >
              {options.map((option, i) => (
                <option key={i} value={i}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={field.key}
              disabled={disabled}
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={draft}
              required
              aria-invalid={invalid}
              aria-describedby={invalid ? `${field.key}-error` : field.help ? helpId : undefined}
              onChange={(e) => {
                setDraft(e.target.value);
                setInvalid(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                  setDraft(String(value));
                  setInvalid(false);
                }
              }}
              onBlur={(e) => {
                if (draft === String(value)) return;
                const validity = e.currentTarget.validity;
                if (
                  !draft.trim() ||
                  validity.badInput ||
                  validity.rangeOverflow ||
                  validity.rangeUnderflow ||
                  !Number.isFinite(Number(draft)) ||
                  (field.integer && !Number.isInteger(Number(draft)))
                ) {
                  setInvalid(true);
                  return;
                }
                change(Number(draft));
              }}
            />
          )}
        </>
      )}
      {invalid && (
        <p className="setting-error" id={`${field.key}-error`} role="alert">
          Angiv et gyldigt tal{field.min === undefined ? '' : ` fra ${field.min}`}
          {field.max === undefined ? '' : ` til ${field.max}`}.
        </p>
      )}
      {/* Forklaringen står også skjult i DOM, så skærmlæsere får den via aria-describedby. */}
      {field.help && (
        <p id={helpId} className="sr-only">
          {field.help}
        </p>
      )}
    </div>
  );
}
