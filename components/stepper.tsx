"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Step {
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("w-full py-4", className)}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <React.Fragment key={step.title}>
              <div className="flex items-center gap-3 relative z-10">
                <motion.div
                  initial={false}
                  animate={isCompleted ? { 
                    scale: [1, 1.3, 1],
                    backgroundColor: "var(--color-success)",
                    borderColor: "var(--color-success)",
                  } : isActive ? {
                    scale: 1,
                    backgroundColor: "var(--color-bg-base)",
                    borderColor: "var(--color-cipher)",
                  } : {
                    scale: 1,
                    backgroundColor: "var(--color-bg-base)",
                    borderColor: "var(--color-border-subtle)",
                  }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                    isCompleted && "text-text-inverse",
                    isActive && "text-cipher",
                    isUpcoming && "text-text-muted"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </motion.div>
                <div className="flex flex-col">
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      isActive ? "text-cipher" : "text-text-secondary"
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-[10px] text-text-muted uppercase">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "hidden md:block flex-1 h-[2px] mx-4 transition-colors duration-500",
                    isCompleted ? "bg-success/50" : "bg-border-subtle"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
