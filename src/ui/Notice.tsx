/** Fælles besked (shadcn Alert) i tre udgaver: info, advarsel og fejl (B-058). */
import type { ComponentProps, ReactNode } from 'react';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from 'cn';

export type NoticeKind = 'info' | 'warning' | 'error';

export function Notice({
  kind = 'info',
  title,
  children,
  className,
  role,
  ...props
}: {
  kind?: NoticeKind;
  title?: ReactNode;
  children?: ReactNode;
} & Omit<ComponentProps<'div'>, 'title'>) {
  const Icon = kind === 'warning' ? TriangleAlert : kind === 'error' ? CircleAlert : Info;
  return (
    // Alert sætter role="alert"; kun beskeder, der skal læses op straks, beholder den.
    <Alert role={role} className={cn('notice', `notice-${kind}`, className)} {...props}>
      <Icon aria-hidden="true" />
      {title && <AlertTitle className="notice-title">{title}</AlertTitle>}
      {children !== undefined && (
        <AlertDescription className="notice-body">{children}</AlertDescription>
      )}
    </Alert>
  );
}
