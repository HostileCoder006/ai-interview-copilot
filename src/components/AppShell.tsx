import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Camera,
  LineChart,
  MessageSquare,
  Bell,
  Plus,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  Settings,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const nav = [
  { to: "/", label: "Home", icon: LayoutDashboard, kbd: "G H" },
  { to: "/voice", label: "Live Interview", icon: Camera, kbd: "G L" },
  { to: "/interview", label: "Text Mode", icon: MessageSquare, kbd: "G T" },
  { to: "/analytics", label: "History", icon: LineChart, kbd: "G A" },
  { to: "/copilot", label: "Coach", icon: Sparkles, kbd: "G C" },
] as const;

const secondary = [
  { to: "/copilot", label: "Settings", icon: Settings },
  { to: "/copilot", label: "Help", icon: HelpCircle },
] as const;

export function AppShell({
  title,
  eyebrow,
  children,
  actions,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* ambient layered glows */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[520px] [background:var(--gradient-glow)]"
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ambient-orb float-a -top-32 -left-24 h-[420px] w-[420px] bg-[oklch(0.78_0.14_295)]/30" />
        <div className="ambient-orb float-b top-1/3 -right-32 h-[480px] w-[480px] bg-[oklch(0.70_0.18_350)]/25" />
        <div className="ambient-orb float-a bottom-0 left-1/3 h-[360px] w-[360px] bg-[oklch(0.74_0.13_220)]/20" />
      </div>

      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside
          className={[
            "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl transition-[width] duration-300 ease-out md:flex",
            collapsed ? "w-[68px]" : "w-[232px]",
          ].join(" ")}
        >
          {/* Logo */}
          <div
            className={[
              "flex h-16 items-center gap-2.5",
              collapsed ? "justify-center px-2" : "px-5",
            ].join(" ")}
          >
            <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.72_0.18_320)] text-[14px] font-semibold text-primary-foreground shadow-[0_0_28px_-4px_oklch(0.78_0.14_295/0.7)]">
              I
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[oklch(0.78_0.16_160)] ring-2 ring-sidebar" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="text-[13.5px] font-semibold tracking-tight">InterviewAI</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Live Interview Platform
                </span>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav
            className={["mt-2 flex flex-1 flex-col gap-0.5", collapsed ? "px-2" : "px-3"].join(" ")}
          >
            {!collapsed && (
              <div className="px-3 pb-1.5 pt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                Workspace
              </div>
            )}
            {nav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={[
                    "group relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200",
                    collapsed ? "h-10 w-full justify-center" : "gap-3 px-3 py-2",
                    active
                      ? "active-pill text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  ].join(" ")}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_12px_oklch(0.78_0.14_295/0.9)]" />
                  )}
                  <Icon
                    className={[
                      "h-[17px] w-[17px] shrink-0 transition-colors",
                      active ? "text-primary" : "group-hover:text-foreground",
                    ].join(" ")}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary glow-dot" />
                  )}
                  {/* tooltip when collapsed */}
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11.5px] text-foreground shadow-[var(--shadow-soft)] group-hover:block">
                      {item.label}
                      <kbd className="ml-2 rounded border border-border bg-background/60 px-1 py-px text-[9.5px] text-muted-foreground">
                        {item.kbd}
                      </kbd>
                    </span>
                  )}
                </Link>
              );
            })}

            {!collapsed && (
              <div className="px-3 pb-1.5 pt-5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                Tools
              </div>
            )}
            {secondary.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={[
                    "group relative flex items-center rounded-lg text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-foreground",
                    collapsed ? "h-10 w-full justify-center" : "gap-3 px-3 py-2",
                  ].join(" ")}
                >
                  <Icon className="h-[17px] w-[17px] shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11.5px] text-foreground shadow-[var(--shadow-soft)] group-hover:block">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Pro upgrade card */}
          {!collapsed && (
            <div className="m-3 rounded-xl border border-border bg-[var(--gradient-surface)] p-3 relative overflow-hidden">
              <div
                aria-hidden
                className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/30 blur-2xl"
              />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> Pro
                </div>
                <p className="mt-1.5 text-[12px] leading-snug text-foreground/85">
                  Unlimited sessions, full history, and advanced coaching reports.
                </p>
                <button className="btn-glow mt-3 w-full rounded-lg px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]">
                  Upgrade
                </button>
              </div>
            </div>
          )}

          {/* User footer */}
          <div
            className={[
              "flex items-center border-t border-sidebar-border",
              collapsed ? "justify-center px-2 py-3" : "gap-2.5 px-4 py-3",
            ].join(" ")}
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[oklch(0.78_0.14_295)] to-[oklch(0.70_0.18_350)] text-[11px] font-semibold text-white">
              AK
            </div>
            {!collapsed && (
              <>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-[12.5px] font-medium">Aryan Maurya</span>
                  <span className="truncate text-[10.5px] text-muted-foreground">
                    aryan@interviewai.dev
                  </span>
                </div>
                <button
                  onClick={() => setCollapsed(true)}
                  className="ml-auto rounded-md p-1.5 text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground"
                  aria-label="Collapse sidebar"
                  title="Collapse (⌘B)"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </>
            )}
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                className="ml-2 rounded-md p-1.5 text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground"
                aria-label="Expand sidebar"
                title="Expand (⌘B)"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* TOPBAR */}
          <header className="sticky top-0 z-20 border-b border-border bg-background/60 backdrop-blur-xl">
            <div className="flex h-16 items-center gap-4 px-5 md:px-8">
              <div className="flex min-w-0 flex-col leading-tight">
                {eyebrow && (
                  <span className="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                    {eyebrow}
                  </span>
                )}
                <h1 className="truncate font-display text-[20px] md:text-[22px] text-foreground">
                  {title}
                </h1>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {/* Quick new interview */}
                <Link to="/voice">
                  <button
                    className="hidden h-9 items-center gap-1.5 rounded-lg border border-border bg-surface/80 px-3 text-[12.5px] font-medium text-foreground/85 transition hover:border-primary/40 hover:text-foreground md:inline-flex"
                    title="New interview"
                  >
                    <Plus className="h-3.5 w-3.5" /> New Interview
                  </button>
                </Link>

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotifOpen((v) => !v);
                      setProfileOpen(false);
                    }}
                    className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface/80 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary glow-dot" />
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 top-11 z-40 w-80 origin-top-right animate-in-up rounded-xl border border-border bg-popover/95 p-2 shadow-[var(--shadow-soft)] backdrop-blur-xl">
                      <div className="flex items-center justify-between px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Notifications{" "}
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                          2 new
                        </span>
                      </div>
                      {[
                        {
                          t: "New coaching insight ready",
                          d: "Amazon session · 3 recommendations",
                          dot: "bg-primary",
                        },
                        {
                          t: "7-day streak milestone",
                          d: "Keep it going — you're on a roll",
                          dot: "bg-[oklch(0.78_0.16_160)]",
                        },
                      ].map((n) => (
                        <button
                          key={n.t}
                          className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-muted/60"
                        >
                          <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${n.dot}`} />
                          <div className="min-w-0">
                            <div className="truncate text-[12.5px] font-medium text-foreground">
                              {n.t}
                            </div>
                            <div className="truncate text-[11.5px] text-muted-foreground">
                              {n.d}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Profile */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setProfileOpen((v) => !v);
                      setNotifOpen(false);
                    }}
                    className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface/80 pl-1 pr-2 transition hover:border-primary/40"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-[oklch(0.78_0.14_295)] to-[oklch(0.70_0.18_350)] text-[10.5px] font-semibold text-white">
                      AK
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-11 z-40 w-52 origin-top-right animate-in-up rounded-xl border border-border bg-popover/95 p-1.5 shadow-[var(--shadow-soft)] backdrop-blur-xl">
                      <div className="px-2.5 py-2">
                        <div className="text-[12.5px] font-medium">Aryan Maurya</div>
                        <div className="text-[11px] text-muted-foreground">
                          aryan@interviewai.dev
                        </div>
                      </div>
                      <div className="my-1 h-px bg-border" />
                      {[
                        { i: Settings, l: "Settings" },
                        { i: HelpCircle, l: "Help & shortcuts" },
                      ].map(({ i: I, l }) => (
                        <button
                          key={l}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] text-foreground/85 transition hover:bg-muted/60 hover:text-foreground"
                        >
                          <I className="h-3.5 w-3.5" /> {l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {actions}
              </div>
            </div>
          </header>

          <main className="relative mx-auto w-full max-w-[1280px] flex-1 px-5 py-8 md:px-8 md:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
