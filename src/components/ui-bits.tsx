import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "info" | "primary";
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    success: "bg-[oklch(0.74_0.16_160/0.12)] text-[oklch(0.78_0.16_160)]",
    warning: "bg-[oklch(0.80_0.14_80/0.12)] text-[oklch(0.82_0.14_80)]",
    info: "bg-[oklch(0.74_0.13_220/0.12)] text-[oklch(0.78_0.13_220)]",
    primary: "bg-[oklch(0.78_0.14_295/0.12)] text-[oklch(0.82_0.14_295)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-medium tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
  interactive = true,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={`surface-card relative p-5 shadow-[var(--shadow-soft)] ${interactive ? "hover-lift" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </div>
        {hint && <div className="mt-1 text-[12px] text-muted-foreground/80">{hint}</div>}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "primary",
}: {
  value: number;
  tone?: "primary" | "success" | "warning" | "danger" | "info";
}) {
  const tones: Record<string, string> = {
    primary: "from-[oklch(0.78_0.14_295)] to-[oklch(0.72_0.18_320)]",
    success: "from-[oklch(0.74_0.16_160)] to-[oklch(0.80_0.16_150)]",
    warning: "from-[oklch(0.80_0.14_80)] to-[oklch(0.84_0.16_70)]",
    danger: "from-[oklch(0.66_0.21_25)] to-[oklch(0.70_0.21_15)]",
    info: "from-[oklch(0.74_0.13_220)] to-[oklch(0.78_0.13_210)]",
  };
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${tones[tone]} transition-[width] duration-700`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "primary" | "success" | "warning" | "info";
}) {
  const colors: Record<string, string> = {
    primary: "text-[oklch(0.82_0.14_295)]",
    success: "text-[oklch(0.78_0.16_160)]",
    warning: "text-[oklch(0.82_0.14_80)]",
    info: "text-[oklch(0.78_0.13_220)]",
  };
  return (
    <div className="flex flex-col gap-1">
      <span
        className={`font-display text-[34px] leading-none ${accent ? colors[accent] : "text-foreground"}`}
      >
        {value}
      </span>
      <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "subtle";
  size?: "sm" | "md";
}) {
  const variants: Record<string, string> = {
    primary: "btn-glow",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-muted/60",
    outline: "border border-border text-foreground hover:bg-muted/50 hover:border-primary/40",
    subtle: "bg-muted text-foreground hover:bg-muted/80",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-[12px]",
    md: "h-9 px-4 text-[13px]",
  };
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all active:scale-[0.98] disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Sparkline({
  points,
  tone = "primary",
}: {
  points: number[];
  tone?: "primary" | "success";
}) {
  const w = 280,
    h = 64,
    pad = 6;
  const min = Math.min(...points),
    max = Math.max(...points);
  const range = max - min || 1;
  const step = (w - pad * 2) / (points.length - 1);
  const coords = points.map(
    (p, i) => [pad + i * step, h - pad - ((p - min) / range) * (h - pad * 2)] as const,
  );
  const d = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${d} L${(w - pad).toFixed(1)},${(h - pad).toFixed(1)} L${pad},${(h - pad).toFixed(1)} Z`;
  const stroke = tone === "success" ? "oklch(0.78 0.16 160)" : "oklch(0.82 0.14 295)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full">
      <defs>
        <linearGradient id={`sg-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${tone})`} />
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
