"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const popupClassName =
  "relative z-50 max-h-60 w-(--anchor-width) min-w-36 overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95";

const itemClassName =
  "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground";

interface MultiSearchableSelectProps {
  id?: string;
  value: string[];
  onValueChange: (value: string[]) => void;
  items: readonly string[];
  placeholder?: string;
  emptyMessage?: string;
}

export function MultiSearchableSelect({
  id,
  value,
  onValueChange,
  items,
  placeholder = "Search and select…",
  emptyMessage = "No matches",
}: MultiSearchableSelectProps) {
  const availableItems = React.useMemo(
    () => items.filter((item) => !value.includes(item)),
    [items, value]
  );

  return (
    <Combobox.Root items={availableItems} value={value} onValueChange={onValueChange} multiple>
      <Combobox.Chips
        className={cn(
          "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-2 py-1",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30"
        )}
      >
        {value.map((item) => (
          <Combobox.Chip
            key={item}
            aria-label={`Remove ${item}`}
            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-sm text-secondary-foreground"
          >
            {item}
            <Combobox.ChipRemove className="rounded-sm p-0.5 hover:bg-secondary-foreground/10">
              <XIcon className="size-3" />
            </Combobox.ChipRemove>
          </Combobox.Chip>
        ))}
        <Combobox.Input
          id={id}
          placeholder={value.length === 0 ? placeholder : undefined}
          className="min-w-16 flex-1 bg-transparent py-0.5 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        />
        <div className="pointer-events-none ml-auto flex items-center pr-1 text-muted-foreground">
          <ChevronDownIcon className="size-4" />
        </div>
      </Combobox.Chips>
      <Combobox.Portal>
        <Combobox.Positioner side="bottom" sideOffset={4} align="start" className="z-50">
          <Combobox.Popup className={popupClassName}>
            <Combobox.Empty className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</Combobox.Empty>
            <Combobox.List>
              {(item: string) => (
                <Combobox.Item key={item} value={item} className={itemClassName}>
                  <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </Combobox.ItemIndicator>
                  {item}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
