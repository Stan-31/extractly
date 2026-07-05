import { CheckCircle2, Clock, LoaderCircle, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UploadListItem } from "@/types";

const STATUS_CONFIG = {
  PENDING: { label: "Pending", icon: Clock, className: "text-muted-foreground" },
  PROCESSING: { label: "Processing", icon: LoaderCircle, className: "text-primary" },
  COMPLETED: { label: "Completed", icon: CheckCircle2, className: "text-green-600 dark:text-green-500" },
  FAILED: { label: "Failed", icon: TriangleAlert, className: "text-destructive" },
} as const;

export function UploadsList({ uploads }: { uploads: UploadListItem[] }) {
  if (uploads.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        No invoices uploaded yet.
      </p>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-border rounded-xl border">
      {uploads.map((upload) => {
        const status = STATUS_CONFIG[upload.status];
        const Icon = status.icon;
        return (
          <li key={upload.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{upload.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(upload.createdAt).toLocaleString()}
              </p>
              {upload.status === "FAILED" && upload.errorMessage && (
                <p className="mt-0.5 text-xs text-destructive">{upload.errorMessage}</p>
              )}
            </div>
            <div className={cn("flex shrink-0 items-center gap-1.5 text-xs font-medium", status.className)}>
              <Icon className="size-3.5" />
              {status.label}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
