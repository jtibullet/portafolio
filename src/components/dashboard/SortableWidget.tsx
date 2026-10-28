import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SIZE_OPTIONS = [
  { size: 2, label: '1/3', title: '1/3 Width' },
  { size: 3, label: '1/2', title: '1/2 Width' },
  { size: 4, label: '2/3', title: '2/3 Width' },
  { size: 6, label: 'Max', title: 'Full Width' },
];

/** Dashboard grid cell that can be dragged to reorder and resized via a hover toolbar. */
export function SortableWidget({ id, children, className, size, onSizeChange }: {
  id: string;
  children: React.ReactNode;
  className?: string;
  size?: number;
  onSizeChange?: (size: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
    touchAction: 'none',
  };
  return (
    <div ref={setNodeRef} style={style} className={className}>
      <div className="absolute top-0 right-0 p-1 mt-1 mr-1 z-10 opacity-0 hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-zinc-300">
        {onSizeChange && (
          <div className="flex items-center gap-1 pr-1 border-r border-zinc-300">
            {SIZE_OPTIONS.map(opt => (
              <button key={opt.size} onClick={() => onSizeChange(opt.size)} title={opt.title} className={`px-1 text-[9px] font-mono hover:text-[#141414] ${size === opt.size ? 'text-blue-600 font-bold' : 'text-zinc-400'}`}>{opt.label}</button>
            ))}
          </div>
        )}
        <div {...attributes} {...listeners} className="cursor-grab text-zinc-400 hover:text-[#141414] px-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
        </div>
      </div>
      {children}
    </div>
  );
}
