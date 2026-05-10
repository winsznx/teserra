"use client";

import * as React from "react";
import { Banknote, Award, Send, PowerOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUmbra } from "@/hooks/use-umbra";
import { USDC_MINT } from "@/lib/constants";

interface AgentControlPanelProps {
  agentPubkey: string;
  agentUmbraAddress: string;
  running: boolean;
  onStop: () => void;
}

const TRIGGER_AMOUNT_ATOMIC = BigInt(500_000); // 0.5 dUSDC at 6 decimals
const X402_AMOUNT_ATOMIC = BigInt(10_000); // 0.01 dUSDC

type ButtonId = "trigger" | "mint" | "x402" | "stop";

async function postCommand(agentPubkey: string, command: Record<string, unknown>): Promise<void> {
  const res = await fetch("/api/agent/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentPubkey, command }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`command rejected (${res.status}): ${text.slice(0, 120)}`);
  }
}

export function AgentControlPanel({
  agentPubkey,
  agentUmbraAddress,
  running,
  onStop,
}: AgentControlPanelProps) {
  const { state: umbraState, deposit } = useUmbra();
  const [busy, setBusy] = React.useState<ButtonId | null>(null);

  const senderAddress =
    umbraState.phase === "ready" ? umbraState.umbraAddress : "";

  const triggerPayment = async () => {
    if (busy || !running) return;
    setBusy("trigger");
    try {
      const result = await deposit({
        recipientUmbraAddress: agentUmbraAddress,
        amount: TRIGGER_AMOUNT_ATOMIC,
        mint: USDC_MINT,
      });
      await postCommand(agentPubkey, {
        type: "ack-incoming-payment",
        txSignature: result.queueSignature,
        amount: TRIGGER_AMOUNT_ATOMIC.toString(),
        fromUmbraAddress: senderAddress,
      });
      toast.success("Payment shielded ✓");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/User rejected|cancelled/i.test(msg)) {
        toast.error("Transaction cancelled.");
      } else {
        toast.error("Payment failed. Check the live feed for detail.");
      }
    } finally {
      setBusy(null);
    }
  };

  const payX402 = async () => {
    if (busy || !running) return;
    setBusy("x402");
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const nonce = `agent-ui-${Date.now()}`;
      await postCommand(agentPubkey, {
        type: "pay-x402",
        serviceUrl: `${origin}/api/x402/charge`,
        amount: X402_AMOUNT_ATOMIC.toString(),
        nonce,
      });
      toast.info("Pay x402 queued — watch the live feed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const stopAgent = () => {
    if (busy) return;
    onStop();
  };

  return (
    <Card className="bg-bg-elevated/30 border-border-strong p-6 flex flex-col gap-4">
      <div className="text-overline text-text-muted">Actions</div>
      <div className="grid grid-cols-1 gap-3">
        <ActionRow
          icon={<Banknote className="w-4 h-4 text-cipher" aria-hidden="true" />}
          label="Trigger payment"
          subtitle="0.5 dUSDC · you → agent"
          onClick={triggerPayment}
          loading={busy === "trigger"}
          disabled={!running || busy !== null}
        />
        <ActionRow
          icon={<Award className="w-4 h-4 text-text-muted" aria-hidden="true" />}
          label="Mint credential"
          subtitle="Blocked on Umbra SDK scanner (G81)"
          onClick={() => undefined}
          disabled
          title="Blocked on Umbra SDK scanner fix (G125 / G81). Real path: agent generates real proof server-side and mints real credential. Wired but disabled until Cal's patch lands."
        />
        <ActionRow
          icon={<Send className="w-4 h-4 text-cipher" aria-hidden="true" />}
          label="Pay x402 service"
          subtitle="0.01 dUSDC · agent → /api/x402/charge"
          onClick={payX402}
          loading={busy === "x402"}
          disabled={!running || busy !== null}
        />
        <ActionRow
          icon={<PowerOff className="w-4 h-4 text-error" aria-hidden="true" />}
          label="Stop agent"
          subtitle="Tear down session (server agent stays alive)"
          onClick={stopAgent}
          disabled={!running || busy !== null}
          danger
        />
      </div>
    </Card>
  );
}

function ActionRow({
  icon,
  label,
  subtitle,
  onClick,
  loading,
  disabled,
  danger,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  onClick: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <Button
      variant={danger ? "outline" : "secondary"}
      onClick={() => void onClick()}
      disabled={disabled}
      title={title}
      className={`h-auto py-3 px-4 gap-3 justify-start text-left ${
        danger ? "hover:bg-error/5 hover:border-error/30" : ""
      }`}
    >
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        {loading ? <Loader2 className="w-4 h-4 animate-spin text-cipher" aria-hidden="true" /> : icon}
      </div>
      <div className="flex flex-col items-start gap-0.5 min-w-0">
        <span className="text-sm font-medium leading-tight">{label}</span>
        <span className="text-[10px] text-text-muted leading-tight">{subtitle}</span>
      </div>
    </Button>
  );
}
