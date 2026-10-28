import { Loader2 } from 'lucide-react';

export function CenteredSpinner() {
  return (
    <div className="flex justify-center items-center py-8">
      <Loader2 className="animate-spin text-zinc-400" size={32} />
    </div>
  );
}
