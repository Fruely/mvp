"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isPrivateDashboardPath } from "@/lib/dashboard/isPrivateDashboardPath";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

export default function FooterPrefetchLink({ href, className, children }: Props) {
  const pathname = usePathname() ?? "";
  const disablePrefetch = isPrivateDashboardPath(pathname);

  return (
    <Link href={href} className={className} prefetch={disablePrefetch ? false : undefined}>
      {children}
    </Link>
  );
}
