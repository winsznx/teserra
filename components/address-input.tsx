"use client";

import * as React from "react";
import { Input as BaseInput } from "@/components/ui/input";
import { Search, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddressInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helper?: string;
}

export function AddressInput({ label, helper, ...props }: AddressInputProps) {
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Trigger onChange manually if needed or just use state in parent
    } catch (err) {
      // Handle paste error
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-caption font-medium text-text-primary uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <BaseInput
          {...props}
          className="font-mono pr-20 h-12"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handlePaste}
          className="absolute right-1 top-1 h-10 px-3 text-cipher hover:text-cipher-hover hover:bg-cipher/5 gap-2"
        >
          <ClipboardPaste className="w-4 h-4" />
          Paste
        </Button>
      </div>
      {helper && (
        <p className="text-caption text-text-muted">{helper}</p>
      )}
    </div>
  );
}
