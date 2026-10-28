import React from 'react';
import { cn } from '../../lib/cn';

/** Black label used as the heading of every panel. */
export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-xs font-mono uppercase bg-[#141414] text-[#E4E3E0] px-2 py-0.5", className)}>{children}</h3>;
}

/** Heading row: a SectionTitle on the left and optional content on the right. */
export function SectionHeader({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-end mb-2">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}
