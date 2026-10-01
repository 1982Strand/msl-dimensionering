import { useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '../components/ui/command';
import {
  filterProductPicker,
  type ProductPickerGroup,
  type ProductPickerItem,
} from '../engine/product-picker';
import { HelpHint } from './SettingField';
import './product-picker.css';

function ProductBadges({ item }: { item: ProductPickerItem }) {
  return (
    <span className="product-picker-badges">
      {item.badges.map((badge) => (
        <Badge
          key={badge.text}
          variant="outline"
          className={`product-picker-badge product-picker-${badge.tone}`}
        >
          {badge.text}
        </Badge>
      ))}
    </span>
  );
}

export function ProductPicker({
  id,
  value,
  groups,
  classLabel,
  help,
  onChange,
}: {
  id: string;
  value: string;
  groups: ProductPickerGroup[];
  classLabel: string;
  help?: string | null;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyRecommended, setOnlyRecommended] = useState(false);
  const [listId, setListId] = useState<string>();
  const search = useRef<HTMLInputElement>(null);
  const selected = groups.flatMap((g) => g.items).find((item) => item.name === value);
  const visible = filterProductPicker(groups, query, onlyRecommended);
  return (
    <div className="setting-field product-picker">
      <div className="setting-label-row">
        <label id={`${id}-label`} htmlFor={id}>
          Produkt
        </label>
        {help && <HelpHint label="Produkt" help={help} />}
      </div>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setQuery('');
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-labelledby={`${id}-label`}
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-haspopup="listbox"
            className="product-picker-trigger"
          >
            <span className="product-picker-value">
              <span className="product-picker-name">{value}</span>
              {selected && <ProductBadges item={selected} />}
            </span>
            <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={8}
          className="product-picker-popover"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            setListId(search.current?.getAttribute('aria-controls') ?? undefined);
            search.current?.focus();
          }}
        >
          <Command shouldFilter={false} label="Søg produkt, serie eller klasse">
            <CommandInput
              ref={search}
              placeholder="Søg produkt, serie eller klasse"
              aria-label="Søg produkt, serie eller klasse"
              value={query}
              onValueChange={setQuery}
            />
            <label className="setting-checkbox product-picker-filter">
              <input
                type="checkbox"
                checked={onlyRecommended}
                onChange={(event) => setOnlyRecommended(event.target.checked)}
              />
              <span>Kun anbefalet til {classLabel}</span>
            </label>
            <CommandList label="Produkter">
              <CommandEmpty>Ingen produkter fundet.</CommandEmpty>
              {visible.map((group) => (
                <CommandGroup key={group.series} heading={group.series}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item.name}
                      value={item.name}
                      aria-label={item.name}
                      onSelect={() => {
                        onChange(item.name);
                        setOpen(false);
                      }}
                    >
                      <Check
                        aria-hidden="true"
                        className={`size-4 shrink-0 ${item.name === value ? '' : 'invisible'}`}
                        data-product-check={item.name === value ? 'selected' : undefined}
                      />
                      <span className="product-picker-value">
                        <span className="product-picker-name">{item.name}</span>
                        <ProductBadges item={item} />
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
