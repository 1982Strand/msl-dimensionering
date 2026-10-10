import { useEffect, useState } from 'react';
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
import { HelpHint } from './Hint';

export { HelpHint, HintCard } from './Hint';

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
