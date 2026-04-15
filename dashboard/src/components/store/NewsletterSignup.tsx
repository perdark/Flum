"use client";

import { useState } from "react";
import { Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/store/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await res.json();
      if (!j.success) {
        setStatus("err");
        setMsg(j.error || "Something went wrong");
        return;
      }
      setStatus("ok");
      setMsg("You are on the list — watch your inbox for deals.");
      setEmail("");
    } catch {
      setStatus("err");
      setMsg("Network error. Try again.");
    }
  }

  return (
    <section className="border-y border-border bg-gradient-to-r from-primary/10 via-card to-primary/10">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Copy */}
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-foreground">Never miss a deal</h2>
              <p className="mt-0.5 max-w-sm text-sm text-muted-foreground">
                Get launch alerts, coupons, and limited-time drops. No spam, ever.
              </p>
            </div>
          </div>

          {/* Form */}
          {status === "ok" ? (
            <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {msg}
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subscribing…
                  </>
                ) : (
                  "Subscribe"
                )}
              </button>
            </form>
          )}
        </div>

        {status === "err" && msg && (
          <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {msg}
          </div>
        )}
      </div>
    </section>
  );
}
