"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      className="toaster"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-card text-card-foreground border border-border",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          success: "border-success/50",
          error: "border-destructive/50",
          warning: "border-warning/50",
          info: "border-info/50",
        },
      }}
    />
  );
}
