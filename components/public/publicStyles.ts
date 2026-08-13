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

/** Search wizard card — Figma 102:2325 (560 / r16 / p40). */
export const publicWizardCardClass =
  "w-full max-w-[560px] rounded-freuly-xl border border-freuly-border-default bg-freuly-surface p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] sm:p-10";

export const publicWizardCtaClass =
  "inline-flex w-full min-h-12 items-center justify-center rounded-freuly-md bg-freuly-primary px-6 py-4 text-base font-semibold text-freuly-text-on-primary transition-colors freuly-focus-ring hover:bg-freuly-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:py-[14px]";

export const publicWizardFieldClass =
  "freuly-focus-ring w-full rounded-freuly-md border-[1.5px] border-freuly-border-default bg-freuly-surface px-4 py-3.5 text-[15px] text-freuly-text-primary placeholder:text-[#9B9B9B] hover:border-freuly-text-muted/40 focus:border-freuly-primary sm:py-3";

export const publicChoiceButtonClass = (selected: boolean) =>
  [
    "flex w-full min-h-14 items-center justify-between rounded-freuly-md px-5 py-4 text-left transition-all duration-200 freuly-focus-ring",
    selected
      ? "border-[1.5px] border-freuly-primary bg-freuly-primary-light text-freuly-primary"
      : "border border-freuly-border-default bg-freuly-surface text-freuly-text-primary hover:border-freuly-primary/40",
  ].join(" ");

export const publicFormatChoiceClass = (selected: boolean) =>
  [
    "flex w-full min-h-[76px] flex-col items-start gap-1 rounded-freuly-md p-4 text-left transition-all duration-200 freuly-focus-ring",
    selected
      ? "border-[1.5px] border-freuly-primary bg-freuly-primary-light"
      : "border border-freuly-border-default bg-freuly-surface hover:border-freuly-primary/40",
  ].join(" ");

export const publicRadiusChipClass = (selected: boolean) =>
  [
    "inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 py-3 text-sm transition-colors freuly-focus-ring",
    selected
      ? "bg-freuly-primary font-semibold text-freuly-text-on-primary"
      : "border border-freuly-border-default bg-freuly-surface font-medium text-freuly-text-primary hover:border-freuly-primary/40",
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
