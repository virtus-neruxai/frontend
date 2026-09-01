import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

export default function CollapsibleSection({
  title, description, children, testId, defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border" data-testid={testId}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" className="h-auto w-full justify-between gap-3 p-4 text-left">
          <span>
            <span className="block font-semibold text-foreground">{title}</span>
            {description && (
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{description}</span>
            )}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
