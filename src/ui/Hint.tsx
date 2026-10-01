/** Forklaringer som Hover Card i hele appen (B-053, B-064, B-065).
 * Åbner ved mus og tastaturfokus; et tryk åbner og lukker på berøringsskærme.
 * Åbningen styres her: Radix' egne forsinkede åbninger rydder ikke op ved Escape eller klik og
 * kunne genåbne et netop lukket kort. Radix bruges kun til at lukke (Escape, udenfor, mus væk). */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { CircleHelp, Info, TriangleAlert } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const hintIcons = { help: CircleHelp, warning: TriangleAlert, info: Info } as const;
export type HintKind = keyof typeof hintIcons | 'explain';

/** Lægger et Hover Card på `children` (ét element, der kan modtage fokus).
 * `toggle`: et klik eller tryk åbner og lukker. Slås fra på knapper med en egen handling, fx
 * sortering; dér åbner forklaringen ved mus og tastaturfokus. */
export function Hint({
  content,
  kind = 'explain',
  side = 'top',
  toggle = true,
  describedBy,
  children,
}: {
  content: ReactNode;
  kind?: HintKind;
  side?: 'top' | 'bottom';
  toggle?: boolean;
  describedBy?: string;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  // Et klik eller tryk giver også fokus; kun tastaturfokus åbner, så klikket alene skifter.
  const pointer = useRef(false);
  const trigger = useRef<HTMLElement>(null);
  const id = useId();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const set = (next: boolean) => {
    window.clearTimeout(timer.current);
    setOpen(next);
  };
  const hover = (e: PointerEvent, next: boolean, delay: number) => {
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
      <HoverCardTrigger
        asChild
        ref={trigger as React.Ref<HTMLAnchorElement>}
        aria-describedby={describedBy ?? (open ? id : undefined)}
        onPointerEnter={(e) => hover(e, true, 150)}
        onPointerLeave={(e) => hover(e, false, 100)}
        onPointerDown={() => {
          pointer.current = true;
        }}
        onClick={(e) => {
          pointer.current = false;
          if (!toggle) return;
          e.preventDefault();
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
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        id={id}
        role="tooltip"
        className={`help-hint-content hint-content-${kind}`}
        side={side}
        align="start"
        // Et tryk på udløseren er ikke »udenfor«; ellers lukker kortet og åbnes igen af klikket.
        onPointerDownOutside={(e) => {
          if (trigger.current?.contains(e.target as Node)) e.preventDefault();
        }}
        // Musen kan flyttes ind i kortet (fx for at rulle lang tekst) uden at det lukker.
        onPointerEnter={(e) => {
          if (e.pointerType !== 'touch') window.clearTimeout(timer.current);
        }}
        onPointerLeave={(e) => hover(e, false, 100)}
      >
        {content}
      </HoverCardContent>
    </HoverCard>
  );
}

/** Ikon med Hover Card: spørgsmålstegn (forklaring), trekant (advarsel) eller info. */
export function HintCard({
  label,
  kind = 'help',
  describedBy,
  children,
}: {
  label: string;
  kind?: keyof typeof hintIcons;
  describedBy?: string;
  children: ReactNode;
}) {
  const Icon = hintIcons[kind];
  return (
    <Hint
      content={children}
      kind={kind}
      side={kind === 'help' ? 'top' : 'bottom'}
      describedBy={describedBy}
    >
      <button type="button" className={`help-hint hint-${kind}`} aria-label={label}>
        <Icon aria-hidden="true" />
      </button>
    </Hint>
  );
}

/** Tekst med stiplet understregning og forklaring i Hover Card, fx en kolonneoverskrift. */
export function HintText({
  content,
  className,
  children,
}: {
  content: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Hint content={content}>
      <span className={['hint-text', className].filter(Boolean).join(' ')} tabIndex={0}>
        {children}
      </span>
    </Hint>
  );
}

/** Forklaring som spørgsmålstegn ved feltets etiket (B-053), som originalens hjælpeikon. */
export function HelpHint({ label, help }: { label: string; help: string }) {
  return <HintCard label={`Forklaring: ${label}`}>{help}</HintCard>;
}

/** Kort navn på en knap med kun et ikon (B-065), som lille tooltip i stedet for browserens. */
export function IconTip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
