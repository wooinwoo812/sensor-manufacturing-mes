import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, hideLabel = false, hint, id, label, required, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const descriptionId = `${inputId}-description`;

    return (
      <div className="grid gap-2">
        <label
          className={cn("text-xs font-semibold text-text", hideLabel && "sr-only")}
          htmlFor={inputId}
        >
          {label}
          {required ? <span className="ml-1 text-danger" aria-hidden="true">*</span> : null}
        </label>
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-describedby={hint || error ? descriptionId : undefined}
          aria-invalid={error ? true : undefined}
          className={cn(
            "h-10 w-full rounded-control border border-border-strong bg-surface px-3 text-sm text-text-strong shadow-control outline-none transition-colors placeholder:text-text-subtle hover:border-text-subtle focus:border-accent focus:ring-3 focus:ring-focus/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-text-subtle motion-reduce:transition-none",
            error && "border-danger focus:border-danger focus:ring-danger/15",
            className,
          )}
          {...props}
        />
        {hint || error ? (
          <span
            className={cn("text-xs leading-5 text-text-muted", error && "font-medium text-danger-strong")}
            id={descriptionId}
          >
            {error ?? hint}
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

export function NumberInput(props: Omit<InputProps, "type">) {
  return <Input inputMode="decimal" type="number" {...props} />;
}

export function DateInput(props: Omit<InputProps, "type">) {
  return <Input type="date" {...props} />;
}
