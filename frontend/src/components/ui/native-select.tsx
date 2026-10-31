import { cn } from "@/lib/utils";

/**
 * Native <select> styled to match the shadcn Input primitive.
 * Native (not Radix) because @radix-ui/react-select is not a project dependency.
 */
interface NativeSelectProps
  extends React.ComponentProps<"select"> {
  className?: string;
}

export function NativeSelect({ className, children, ...props }: NativeSelectProps) {
  return (
    <select
      className={cn(
        "flex h-9 w-full appearance-none rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
