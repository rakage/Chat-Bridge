"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onChange, disabled, id, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(event.target.checked);
    };

    return (
      <div className="relative">
        <input
          ref={ref}
          type="checkbox"
          id={id}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <label
          htmlFor={id}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white",
            "cursor-pointer transition-colors",
            "hover:border-gray-400",
            checked && "bg-blue-600 border-blue-600 text-white",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
        >
          {checked && <Check className="h-3 w-3" />}
        </label>
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
