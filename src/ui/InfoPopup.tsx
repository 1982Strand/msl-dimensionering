import type { ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InfoPopup({
  label,
  title,
  children,
  wide = false,
}: {
  label: string;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="link" size="sm" className="dim-popup-trigger">
          {label}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="info-popup-overlay" />
        <Dialog.Content
          className={`info-popup ${wide ? 'info-popup-wide' : ''}`}
          aria-describedby={undefined}
        >
          <div className="info-popup-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Luk popup">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="info-popup-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
