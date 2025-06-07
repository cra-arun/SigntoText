import { Hand } from 'lucide-react';

export function AppLogo() {
  return (
    <div className="flex items-center gap-2 text-primary">
      <Hand className="h-8 w-8" />
      <h1 className="text-3xl font-headline font-semibold">SignText</h1>
    </div>
  );
}
