import React from 'react';
import { cn } from '../../lib/cn';
import { useCollapsible } from '../../hooks/useUiState';

/** Full-width black bar that expands/collapses its content. Open state survives tab switches. */
export function CollapsibleSection({ id, title, defaultOpen = false, className, children }: {
  id: string;
  title: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, toggle] = useCollapsible(id, defaultOpen);
  return (
    <div className={cn("flex flex-col", className)}>
      <button
        onClick={toggle}
        className="flex justify-between items-center bg-ink text-paper p-3 text-xs font-mono uppercase hover:bg-zinc-800 transition-colors"
      >
        <span className="flex items-center gap-2">{title}</span>
        <span>{open ? '[-]' : '[+]'}</span>
      </button>
      {open && children}
    </div>
  );
}
