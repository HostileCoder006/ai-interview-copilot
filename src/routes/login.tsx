import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui-bits";
import { Github, Mail } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:var(--gradient-glow)]"
      />

      {/* LEFT — form */}
      <div className="relative flex flex-col justify-between p-8 lg:p-12">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.72_0.18_320)] text-[13px] font-semibold text-primary-foreground">
            C
          </div>
          <span className="text-[14px] font-semibold tracking-tight">Copilot</span>
        </Link>

        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-display text-[40px] leading-[1.05]">Welcome back.</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground">
            Continue where you left off — your AI interviewer is waiting.
          </p>

          <div className="mt-8 space-y-3">
            <Button variant="outline" className="w-full">
              <Github className="h-4 w-4" /> Continue with GitHub
            </Button>
            <Button variant="outline" className="w-full">
              <Mail className="h-4 w-4" /> Continue with Google
            </Button>
          </div>

          <div className="my-7 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-3">
            <Field label="Email" placeholder="you@startup.dev" type="email" />
            <Field label="Password" placeholder="••••••••" type="password" />
            <Button className="mt-2 w-full">Sign in</Button>
          </form>

          <p className="mt-6 text-center text-[12.5px] text-muted-foreground">
            New here?{" "}
            <a className="text-foreground underline-offset-4 hover:underline" href="#">
              Create an account
            </a>
          </p>
        </div>

        <span className="text-[11px] text-muted-foreground">
          © 2026 Copilot. All rights reserved.
        </span>
      </div>

      {/* RIGHT — visual */}
      <div className="relative hidden overflow-hidden border-l border-border bg-[var(--gradient-surface)] lg:block">
        <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_40%,#000,transparent)]" />
        <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="surface-card max-w-md p-6 backdrop-blur">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              Today's insight
            </div>
            <p className="mt-3 font-display text-[28px] leading-[1.1] text-gradient">
              "Your hash-map intuition is sharper than 92% of peers. Let's push DP next."
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.72_0.18_320)] text-[12px] font-semibold text-primary-foreground">
                A
              </div>
              <div className="text-left leading-tight">
                <div className="text-[12.5px] font-medium">Alex</div>
                <div className="text-[11px] text-muted-foreground">Your AI interviewer</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">{label}</span>
      <input
        {...rest}
        className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-[13.5px] outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/70"
      />
    </label>
  );
}
