import type { ReactNode } from "react";

export default function OnboardingStepShell({
  title,
  body,
  children,
  footer,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {body ? <p className="mt-2 max-w-3xl text-sm text-gray-600">{body}</p> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
      {footer ? <div className="mt-5 flex flex-wrap gap-3">{footer}</div> : null}
    </section>
  );
}
