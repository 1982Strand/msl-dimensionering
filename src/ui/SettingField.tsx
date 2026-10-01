import { useEffect, useRef, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

/** Forklaring som spørgsmålstegn med Hover Card ved etiketten (B-053), som originalens hjælpeikon.
 * Åbner ved mus og tastaturfokus; et tryk åbner og lukker på berøringsskærme.
 * Åbningen styres her: Radix' egne forsinkede åbninger rydder ikke op ved Escape eller klik og
 * kunne genåbne et netop lukket kort. Radix bruges kun til at lukke (Escape, udenfor, mus væk). */
export function HelpHint({ label, help }: { label: string; help: string }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  // Et klik eller tryk giver også fokus; kun tastaturfokus åbner, så klikket alene skifter.
  const pointer = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const set = (next: boolean) => {
    window.clearTimeout(timer.current);
    setOpen(next);
  };
  const hover = (e: React.PointerEvent, next: boolean, delay: number) => {
    if (e.pointerType === 'touch') return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), delay);
  };
  return (
    <HoverCard
      open={open}
      onOpenChange={(next) => {
        if (!next) set(false);
      }}
    >
      <HoverCardTrigger asChild>
        <button
          ref={trigger}
          type="button"
          className="help-hint"
          aria-label={`Forklaring: ${label}`}
          onPointerEnter={(e) => hover(e, true, 150)}
          onPointerLeave={(e) => hover(e, false, 100)}
          onPointerDown={() => {
            pointer.current = true;
          }}
          onClick={(e) => {
            e.preventDefault();
            pointer.current = false;
            set(!open);
          }}
          onFocus={() => {
            if (!pointer.current) set(true);
          }}
          onBlur={() => {
            pointer.current = false;
            set(false);
          }}
        >
          <CircleHelp aria-hidden="true" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        className="help-hint-content"
        side="top"
        align="start"
        // Et tryk på ikonet er ikke »udenfor«; ellers lukker kortet og åbnes igen af klikket.
        onPointerDownOutside={(e) => {
          if (trigger.current?.contains(e.target as Node)) e.preventDefault();
        }}
        // Musen kan flyttes ind i kortet (fx for at rulle lang tekst) uden at det lukker.
        onPointerEnter={(e) => {
          if (e.pointerType !== 'touch') window.clearTimeout(timer.current);
        }}
        onPointerLeave={(e) => hover(e, false, 100)}
      >
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
  /** Korte valg som segmenteret knaprække; stadig radioknapper (B-058). */
  segmented?: boolean;
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
  const index = options.findIndex((o) => o.value === value);
  const selectedIndex = index < 0 ? '' : String(index);
  return (
    <div
      className={`setting-field ${disabled ? 'setting-disabled' : ''} ${field.inline ? 'setting-inline' : ''}`}
    >
      {field.kind === 'checkbox' ? (
        <div className="setting-label-row">
          <div className="setting-checkbox">
            <Checkbox
              id={field.key}
              checked={Boolean(value)}
              disabled={disabled}
              onCheckedChange={(checked) => change(checked === true)}
              aria-describedby={field.help ? helpId : undefined}
            />
            <Label htmlFor={field.key}>{field.label}</Label>
          </div>
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
          {field.segmented ? (
            <RadioGroupPrimitive.Root
              className="segmented"
              orientation="horizontal"
              aria-labelledby={`${field.key}-label`}
              value={selectedIndex}
              disabled={disabled}
              onValueChange={(i) => change(options[Number(i)].value)}
            >
              {options.map((option, i) => (
                <RadioGroupPrimitive.Item key={i} value={String(i)} className="segmented-item">
                  {option.label}
                </RadioGroupPrimitive.Item>
              ))}
            </RadioGroupPrimitive.Root>
          ) : (
            <RadioGroup
              className="setting-options"
              aria-labelledby={`${field.key}-label`}
              value={selectedIndex}
              disabled={disabled}
              onValueChange={(i) => change(options[Number(i)].value)}
            >
              {options.map((option, i) => (
                <div className="setting-option" key={i}>
                  <RadioGroupItem id={`${field.key}-${i}`} value={String(i)} />
                  <Label htmlFor={`${field.key}-${i}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </fieldset>
      ) : (
        <>
          <div className="setting-label-row">
            <label htmlFor={field.key}>{field.label}</label>
            {field.help && <HelpHint label={field.label} help={field.help} />}
          </div>
          {field.kind === 'select' ? (
            <Select
              value={selectedIndex}
              disabled={disabled}
              onValueChange={(i) => change(options[Number(i)].value)}
            >
              <SelectTrigger
                id={field.key}
                className="setting-select"
                aria-describedby={field.help ? helpId : undefined}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
