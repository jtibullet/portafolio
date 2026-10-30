import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useI18n, type MessageKey } from '../../i18n';

const SIZE_OPTIONS: { size: number; label: string; title: MessageKey }[] = [
  { size: 2, label: '1/3', title: 'widget.size2' },
  { size: 3, label: '1/2', title: 'widget.size3' },
  { size: 4, label: '2/3', title: 'widget.size4' },
  { size: 6, label: 'max', title: 'widget.size6' },
];

/**
 * Dashboard grid cell that can be dragged to reorder and resized via a hover toolbar.
 * The toolbar only exists on wide screens, where the grid has more than one column; on phones
 * the widgets stack and scrolling must not be captured by the drag handle.
 */
export function SortableWidget({ id, children, className, size, onSizeChange }: {
  id: string;
  children: React.ReactNode;
  className?: string;
  size?: number;
  onSizeChange?: (size: number) => void;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };
  return (
    <div ref={setNodeRef} style={style} className={className}>
      <div className="absolute top-0 right-0 p-1 mt-1 mr-1 z-10 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity hidden lg:flex items-center gap-1 bg-white border border-zinc-300 print:hidden">
        {onSizeChange && (
          <div className="flex items-center gap-1 pr-1 border-r border-zinc-300">
            {SIZE_OPTIONS.map(opt => (
              <button key={opt.size} onClick={() => onSizeChange(opt.size)} title={t(opt.title)} className={`px-1 text-[9px] font-mono hover:text-ink ${size === opt.size ? 'text-blue-600 font-bold' : 'text-zinc-400'}`}>
                {opt.label === 'max' ? t('widget.max') : opt.label}
              </button>
            ))}
          </div>
        )}
        <div {...attributes} {...listeners} title={t('widget.drag')} style={{ touchAction: 'none' }} className="cursor-grab text-zinc-400 hover:text-ink px-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
        </div>
      </div>
      {children}
    </div>
  );
}
