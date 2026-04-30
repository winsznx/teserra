import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cipher focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-bg-elevated text-text-secondary border-border-subtle",
        seal: "bg-seal-muted text-seal border-seal/30",
        cipher: "bg-cipher-muted text-cipher border-cipher/30",
        warning: "bg-warning/15 text-warning border-warning/30",
        error: "bg-error/15 text-error border-error/30",
        success: "bg-success/15 text-success border-success/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
