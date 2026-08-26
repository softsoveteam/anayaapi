"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type Pending = ConfirmOptions & {
  resolve: (ok: boolean) => void;
};

export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        confirmLabel: "Delete",
        cancelLabel: "Close",
        destructive: true,
        ...options,
        resolve,
      });
    });
  }, []);

  function finish(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  const dialog = (
    <Dialog
      open={Boolean(pending)}
      onOpenChange={(open) => {
        if (!open) finish(false);
      }}
    >
      <DialogContent
        className="z-[80] sm:max-w-md"
        overlayClassName="z-[80]"
      >
        <DialogHeader>
          <DialogTitle>{pending?.title}</DialogTitle>
          {pending?.description ? (
            <DialogDescription>{pending.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => finish(false)}>
            {pending?.cancelLabel || "Close"}
          </Button>
          <Button
            type="button"
            variant={pending?.destructive ? "destructive" : "default"}
            onClick={() => finish(true)}
          >
            {pending?.confirmLabel || "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, dialog };
}
