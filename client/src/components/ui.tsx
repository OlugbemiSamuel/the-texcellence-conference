// Shared visual primitives: one place for buttons, inputs, cards and
// status badges so every page speaks the same visual language.
// Colours follow the conference flyer: navy = primary, gold = accent,
// slate = neutrals, semantic hues ONLY for system status (badges/errors).

export const btnPrimary =
  "rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export const btnSmallPrimary =
  "rounded-md bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50";

export const btnSmallGhost =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export const btnSmallAccent =
  "rounded-md bg-brand-gold px-3 py-1.5 text-xs font-semibold text-brand-deep transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50";

export const inputCls =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-brand-navy";

export const cardCls = "rounded-xl border border-slate-200 bg-white shadow-sm";

export const fieldErrorCls = "mt-1 text-sm text-red-600";

export const alertErrorCls =
  "rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700";

export const noticeInfoCls =
  "rounded-lg border border-brand-navy/20 bg-indigo-50 px-4 py-3 text-sm text-brand-navy";

export const noticeSuccessCls =
  "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800";

type BadgeTone = "amber" | "green" | "gray" | "blue" | "navy" | "gold" | "red";

const badgeTones: Record<BadgeTone, string> = {
  amber: "bg-amber-100 text-amber-900",
  green: "bg-green-100 text-green-900",
  gray: "bg-slate-200 text-slate-700",
  blue: "bg-blue-100 text-blue-900",
  navy: "bg-brand-navy text-white",
  gold: "bg-brand-goldlight text-brand-deep",
  red: "bg-red-100 text-red-800",
};

// Status pill: label text always accompanies colour, so meaning never
// depends on hue alone.
export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }): JSX.Element {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

// Text brand lockup in conference colours. If official logo files are
// added later (client/public/logo.png), swap this for the image.
// Needed files: client/public/logo.png (logo), client/public/flyer.jpg (hero art).
export function EventBrand({ compact = false }: { compact?: boolean }): JSX.Element {
  return (
    <div>
      <p className={`${compact ? "text-xs" : "text-sm"} font-semibold uppercase tracking-[0.2em] text-brand-gold`}>
        The TeXcellence Conference
      </p>
      {!compact && (
        <p className="mt-1 text-sm text-slate-300">Accelerating Africa&apos;s Digital Future</p>
      )}
    </div>
  );
}

// Navy admin header shared by dashboard + accreditation desk.
export function AdminHeader({
  title,
  email,
  nav,
  onLogout,
}: {
  title: string;
  email?: string;
  nav: React.ReactNode;
  onLogout: () => void;
}): JSX.Element {
  return (
    <header className="bg-brand-navy text-white shadow">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-base font-bold sm:text-lg">{title}</h1>
          {email && <p className="text-xs text-slate-300">{email}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {nav}
          <button
            onClick={onLogout}
            className="rounded-lg border border-white/30 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      </div>
      <div className="h-1 bg-brand-gold" aria-hidden="true" />
    </header>
  );
}
