import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

interface ConfirmDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm?: () => void;
}

export function ConfirmDialog({
  confirmLabel,
  danger = false,
  description,
  onConfirm,
  title,
  trigger,
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-overlay data-[state=closed]:animate-out data-[state=open]:animate-in motion-reduce:animate-none" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-sidebar w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-panel border border-border bg-surface p-6 shadow-panel outline-none focus-visible:ring-3 focus-visible:ring-focus/30">
          <DialogPrimitive.Title className="pr-9 text-lg font-bold text-text-strong">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-text-muted">
            {description}
          </DialogPrimitive.Description>
          <div className="mt-6 flex justify-end gap-2">
            <DialogPrimitive.Close asChild>
              <Button variant="secondary">취소</Button>
            </DialogPrimitive.Close>
            <DialogPrimitive.Close asChild>
              <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Close asChild>
            <Button className="absolute right-3 top-3" size="icon" variant="ghost" aria-label="대화상자 닫기">
              <X className="size-4" aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
