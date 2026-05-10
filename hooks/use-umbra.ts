"use client";

import * as React from "react";
import { __UmbraContext } from "@/components/umbra-provider";

export function useUmbra() {
  const ctx = React.useContext(__UmbraContext);
  if (!ctx) {
    throw new Error("useUmbra must be used inside <UmbraProvider>");
  }
  return ctx;
}
