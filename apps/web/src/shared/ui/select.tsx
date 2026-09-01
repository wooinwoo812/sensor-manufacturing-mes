import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useId } from "react";
import { cn } from "@/shared/lib";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onValueChange?: (value: string) => void;
}

export function Select({
  defaultValue,
  disabled,
  error,
  label,
  onValueChange,
  options,
  placeholder = "선택하세요",
  value,
}: SelectProps) {
  const labelId = useId();
  const errorId = `${labelId}-error`;

  return (
    <div className="grid gap-2">
      <span className="text-xs font-semibold text-text" id={labelId}>
        {label}
      </span>
      <SelectPrimitive.Root
        {...(defaultValue !== undefined ? { defaultValue } : {})}
        {...(disabled !== undefined ? { disabled } : {})}
        {...(onValueChange ? { onValueChange } : {})}
        {...(value !== undefined ? { value } : {})}
      >
        <SelectPrimitive.Trigger
          className={cn(
            "flex h-10 min-w-44 items-center justify-between gap-3 rounded-control border border-border-strong bg-surface px-3 text-sm text-text-strong shadow-control outline-none transition-colors hover:border-text-subtle focus:border-accent focus:ring-3 focus:ring-focus/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-subtle",
            error && "border-danger focus:border-danger focus:ring-danger/15",
          )}
          aria-labelledby={labelId}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-4 text-text-muted" aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="z-overlay overflow-hidden rounded-control border border-border bg-surface shadow-panel"
            position="popper"
            sideOffset={5}
          >
            <SelectPrimitive.ScrollUpButton className="grid h-7 place-items-center text-text-muted">
              <ChevronUp className="size-4" aria-hidden="true" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="min-w-[var(--radix-select-trigger-width)] p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  className="relative flex h-9 cursor-default select-none items-center rounded-control py-1 pl-8 pr-3 text-sm text-text outline-none data-[disabled]:pointer-events-none data-[disabled]:text-text-subtle data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent-strong"
                  disabled={option.disabled ?? false}
                  key={option.value}
                  value={option.value}
                >
                  <span className="absolute left-2 grid size-4 place-items-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="size-4" aria-hidden="true" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="grid h-7 place-items-center text-text-muted">
              <ChevronDown className="size-4" aria-hidden="true" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error ? (
        <span className="text-xs font-medium text-danger-strong" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
