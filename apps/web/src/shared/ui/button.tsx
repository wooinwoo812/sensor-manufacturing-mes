import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/shared/lib";

const buttonVariants = cva(
  "relative inline-flex min-h-10 items-center justify-center gap-2 rounded-control border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-focus/35 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 motion-reduce:transition-none",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-accent-strong text-primary-foreground shadow-control hover:bg-accent-emphasis",
        secondary:
          "border-border bg-surface text-text shadow-control hover:border-border-strong hover:bg-surface-subtle",
        ghost:
          "border-transparent bg-transparent text-text hover:bg-surface-subtle",
        danger:
          "border-danger bg-danger text-primary-foreground shadow-control hover:bg-danger-strong",
      },
      size: {
        default: "h-10",
        compact: "h-9 min-h-9 px-3 text-xs",
        icon: "size-10 min-h-10 px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild = false,
      children,
      className,
      disabled,
      loading = false,
      loadingLabel = "처리 중",
      size,
      variant,
      ...props
    },
    ref,
  ) => {
    if (asChild) {
      return (
        <Slot
          aria-busy={loading || undefined}
          aria-disabled={disabled || loading || undefined}
          aria-label={loading ? loadingLabel : undefined}
          className={cn(buttonVariants({ variant, size }), className)}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        ref={ref}
        {...props}
      >
        {loading ? (
          <LoaderCircle
            className="absolute left-1/2 top-1/2 -ml-2 -mt-2 size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : null}
        {loading ? <span className="sr-only">{loadingLabel}</span> : null}
        <span
          className={cn(
            "inline-flex items-center justify-center gap-2",
            loading && "invisible",
          )}
          aria-hidden={loading || undefined}
        >
          {children}
        </span>
      </button>
    );
  },
);

Button.displayName = "Button";
