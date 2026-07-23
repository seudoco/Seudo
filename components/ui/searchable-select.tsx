"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80";

const popupClassName =
  "relative z-50 max-h-60 w-(--anchor-width) min-w-36 overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95";

const itemClassName =
  "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground";

interface SearchableSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  items: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  onInputValueChange?: (value: string) => void;
  loading?: boolean;
}

export function SearchableSelect({
  id,
  value,
  onValueChange,
  items,
  placeholder,
  disabled,
  emptyMessage = "No matches",
  onInputValueChange,
  loading,
}: SearchableSelectProps) {
  const listItems = React.useMemo(() => {
    if (value && !items.includes(value)) {
      return [value, ...items];
    }
    return [...items];
  }, [items, value]);

  return (
    <Combobox.Root
      items={listItems}
      value={value || null}
      onValueChange={(next) => onValueChange(next ?? "")}
      onInputValueChange={onInputValueChange}
      disabled={disabled}
    >
      <div className="relative w-full">
        <Combobox.Input id={id} placeholder={placeholder} className={cn(inputClassName, "pr-8")} />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-muted-foreground">
          <ChevronDownIcon className="size-4" />
        </div>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner side="bottom" sideOffset={4} align="start" className="z-50">
          <Combobox.Popup className={popupClassName}>
            {loading ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">Searching…</p>
            ) : (
              <Combobox.Empty className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</Combobox.Empty>
            )}
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

interface AsyncSearchableSelectProps extends Omit<SearchableSelectProps, "items" | "onInputValueChange"> {
  fetchItems: (query: string) => Promise<string[]>;
  minQueryLength?: number;
}

export function AsyncSearchableSelect({
  fetchItems,
  minQueryLength = 0,
  emptyMessage = "No matches",
  ...props
}: AsyncSearchableSelectProps) {
  const [items, setItems] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const requestId = React.useRef(0);

  const loadItems = React.useCallback(
    async (query: string) => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const nextItems = await fetchItems(query);
        if (id === requestId.current) {
          setItems(nextItems);
        }
      } finally {
        if (id === requestId.current) {
          setLoading(false);
        }
      }
    },
    [fetchItems]
  );

  React.useEffect(() => {
    void loadItems(props.value);
  }, [loadItems, props.value]);

  function handleInputChange(query: string) {
    if (query.trim().length < minQueryLength) {
      setItems([]);
      return;
    }
    void loadItems(query);
  }

  return (
    <SearchableSelect
      {...props}
      items={items}
      loading={loading}
      onInputValueChange={handleInputChange}
      emptyMessage={
        props.disabled
          ? "Select a country first"
          : minQueryLength > 0 && !props.value
            ? `Type at least ${minQueryLength} characters`
            : emptyMessage
      }
    />
  );
}
