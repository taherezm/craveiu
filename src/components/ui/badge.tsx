import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#990000]/40 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#990000] text-white",
        secondary:
          "border-transparent bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200",
        destructive:
          "border-transparent bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400",
        outline:
          "border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-zinc-300",
        success:
          "border-transparent bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400",
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
