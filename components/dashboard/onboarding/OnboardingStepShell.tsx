import type { ReactNode } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui";

export default function OnboardingStepShell({
  title,
  body,
  children,
  footer,
  titleAs = "h1",
}: {
  title: string;
  body?: string;
  children?: ReactNode;
  footer?: ReactNode;
  titleAs?: "h1" | "h2";
}) {
  const titleClass = titleAs === "h1" ? "text-freuly-page-title" : "text-freuly-card-title";

  return (
    <Card padding="lg" className="shadow-none">
      <CardHeader>
        {titleAs === "h1" ? (
          <h1 className={titleClass}>{title}</h1>
        ) : (
          <CardTitle className={titleClass}>{title}</CardTitle>
        )}
        {body ? (
          <p className="mt-freuly-2 max-w-3xl text-freuly-body-sm text-freuly-text-secondary">{body}</p>
        ) : null}
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}
