"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("Dialog components must be used within Dialog");
  return ctx;
}

export function Dialog({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  children,
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] =
    React.useState<boolean>(defaultOpen);
  const isControlled = typeof controlledOpen === "boolean";
  const open = isControlled ? controlledOpen! : uncontrolledOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setUncontrolledOpen(v);
    onOpenChange?.(v);
  };
  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  asChild,
  children,
  onClick,
}: {
  asChild?: boolean;
  children: React.ReactElement;
  onClick?: () => void;
}) {
  const { setOpen } = useDialog();
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children.props as any).onClick?.(e);
        onClick?.();
        setOpen(true);
      },
    });
  }
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        setOpen(true);
      }}
    >
      {children}
    </button>
  );
}

export function DialogContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { open, setOpen } = useDialog();
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-[95vw] sm:max-w-lg rounded-t-2xl sm:rounded-xl border bg-background shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
    >
      {children}
    </h2>
  );
}

export function DialogDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export function DialogFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-2 gap-2",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DialogClose({
  asChild,
  className,
  children,
  onClick,
}: {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  const { setOpen } = useDialog();
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children.props as any).onClick?.(e);
        onClick?.();
        setOpen(false);
      },
    });
  }
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
      className={cn("text-sm", className)}
    >
      {children ?? "Close"}
    </button>
  );
}
