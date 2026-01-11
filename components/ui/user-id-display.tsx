"use client";

import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface UserIdDisplayProps {
  userId: string;
  className?: string;
  textClassName?: string;
  variant?: "default" | "compact" | "inline";
}

export function UserIdDisplay({ 
  userId, 
  className, 
  textClassName,
  variant = "default" 
}: UserIdDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      toast.success("User ID copied");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy User ID");
    }
  };

  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className={cn("font-mono", textClassName)}>{userId}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          className="h-5 w-5"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className={cn("font-mono text-sm font-semibold", textClassName)}>
          {userId}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          className="h-6 w-6"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("font-mono text-sm font-semibold break-all flex-1", textClassName)}>
        {userId}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        className="h-7 w-7 shrink-0"
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
