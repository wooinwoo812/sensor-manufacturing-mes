import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

interface ToastRegionProps {
  children: ReactNode;
}

export function ToastRegion({ children }: ToastRegionProps) {
  return (
    <ToastPrimitive.Provider duration={4500} swipeDirection="right">
      {children}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-skip grid w-[calc(100%-2rem)] max-w-sm gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}

interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
}

export function Toast({ description, onOpenChange, open, title }: ToastProps) {
  return (
    <ToastPrimitive.Root
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-panel border border-success-border bg-surface p-4 shadow-panel data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none"
      onOpenChange={onOpenChange}
      open={open}
    >
      <CheckCircle2 className="mt-1 size-5 text-success" aria-hidden="true" />
      <div>
        <ToastPrimitive.Title className="text-sm font-bold text-text-strong">
          {title}
        </ToastPrimitive.Title>
        {description ? (
          <ToastPrimitive.Description className="mt-1 text-xs leading-5 text-text-muted">
            {description}
          </ToastPrimitive.Description>
        ) : null}
      </div>
      <ToastPrimitive.Close asChild>
        <Button className="-mr-2 -mt-2" size="icon" variant="ghost" aria-label="알림 닫기">
          <X className="size-4" aria-hidden="true" />
        </Button>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}
