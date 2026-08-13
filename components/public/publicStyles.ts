/** Shared public marketplace styling aligned with Design Language A. */

export const publicPageStackClass = "space-y-freuly-8";

export const publicPageContainerClass = "mx-auto w-full max-w-7xl px-freuly-4 sm:px-freuly-6 lg:px-freuly-16";

export const publicSectionTitleClass = "text-freuly-page-title text-freuly-text-primary";

export const publicSectionSubtitleClass = "text-freuly-page-subtitle text-freuly-text-secondary";

export const publicFieldClass =
  "freuly-focus-ring w-full rounded-freuly-md border border-freuly-border-default bg-freuly-surface px-freuly-4 py-freuly-3 text-freuly-body text-freuly-text-primary placeholder:text-freuly-text-muted hover:border-freuly-text-muted/40";

export const publicLinkPrimaryClass =
  "inline-flex min-h-[37px] items-center justify-center rounded-freuly-button bg-freuly-primary px-freuly-4 py-[10px] text-freuly-button font-semibold text-freuly-text-on-primary transition-colors freuly-focus-ring hover:bg-freuly-primary-hover";

export const publicLinkSecondaryClass =
  "inline-flex min-h-[37px] items-center justify-center rounded-freuly-button border border-freuly-border-default bg-freuly-surface px-freuly-4 py-[10px] text-freuly-button font-semibold text-freuly-text-secondary transition-colors freuly-focus-ring hover:bg-freuly-border-subtle";

export const publicLinkOutlineClass =
  "inline-flex min-h-[37px] items-center justify-center rounded-freuly-button border-[1.5px] border-freuly-primary bg-freuly-surface px-freuly-4 py-[10px] text-freuly-button font-semibold text-freuly-primary transition-colors freuly-focus-ring hover:bg-freuly-primary-light";

export const publicCardClass =
  "rounded-freuly-card border border-freuly-border-default bg-freuly-surface text-freuly-text-primary";

export const publicWizardCardClass =
  "rounded-freuly-card border border-freuly-border-default bg-freuly-surface p-freuly-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)] sm:p-freuly-10";

export const publicChoiceButtonClass = (selected: boolean) =>
  [
    "w-full rounded-freuly-md border px-freuly-5 py-freuly-4 text-left transition-all duration-200 min-h-[3.75rem] freuly-focus-ring",
    selected
      ? "border-freuly-primary bg-freuly-primary-light text-freuly-primary shadow-sm"
      : "border-freuly-border-default bg-freuly-surface text-freuly-text-primary hover:border-freuly-primary/30 hover:bg-freuly-primary-light/40",
  ].join(" ");

/** Homepage hero search bar — Figma 102:36 (Language A). */
export const publicHomeSearchBarClass =
  "flex w-full flex-col gap-3 rounded-xl border-[1.5px] border-[#E0DEDA] bg-freuly-surface p-2 shadow-[0_4px_8px_rgba(0,0,0,0.06)] sm:h-16 sm:flex-row sm:items-center sm:gap-0 sm:py-0 sm:pl-6 sm:pr-2";

export const publicHomeSearchInputClass =
  "freuly-focus-ring min-h-12 w-full border-0 bg-transparent px-3 text-[15px] text-freuly-text-primary placeholder:text-[#9B9B9B] focus:ring-0 sm:min-h-0 sm:px-0";

export const publicHomeSearchCtaClass =
  "inline-flex h-12 shrink-0 items-center justify-center rounded-[10px] bg-freuly-primary px-8 text-sm font-semibold text-freuly-text-on-primary transition-colors freuly-focus-ring hover:bg-freuly-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:h-12";

export const publicHomeStepPanelClass =
  "rounded-freuly-card border border-freuly-border-default bg-freuly-surface p-5 text-left sm:p-6";
