/** True for specialist private dashboard routes (used to disable aggressive Link prefetch). */
export function isPrivateDashboardPath(pathname: string): boolean {
  return pathname.includes("/specialist/dashboard");
}
