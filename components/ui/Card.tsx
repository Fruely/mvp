import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export type CardPadding = "none" | "sm" | "md" | "lg";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: CardPadding;
};

const paddingClasses: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-freuly-4",
  md: "p-freuly-5",
  lg: "p-freuly-6",
};

export default function Card({
  padding = "md",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-freuly-lg border border-freuly-border-default bg-freuly-surface text-freuly-text-primary shadow-sm",
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-freuly-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-freuly-card-title text-freuly-text-primary", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-freuly-1 text-freuly-body-sm text-freuly-text-secondary", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-freuly-4 flex flex-wrap items-center gap-freuly-2", className)} {...props}>
      {children}
    </div>
  );
}

export type CardSectionProps = {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function CardSection({ title, description, children, className }: CardSectionProps) {
  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      )}
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}
