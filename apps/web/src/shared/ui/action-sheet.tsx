import { useRef, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./shadcn/sheet";

/** Contextual input keeps the source list visible and restores focus to its opener. */
export function ActionSheet({
  children,
  description,
  onOpenChange,
  open,
  title,
}: {
  children: ReactNode;
  description: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="w-full overflow-y-auto sm:max-w-xl"
        side="right"
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          if (opener.current?.isConnected) {
            event.preventDefault();
            opener.current.focus();
          }
        }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="min-w-0 px-4 pb-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
