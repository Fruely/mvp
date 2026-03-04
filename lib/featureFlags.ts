function toBool(value: string | undefined, fallback = false): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export const featureFlags = {
  newSpecialistFunnel: toBool(process.env.NEW_SPECIALIST_FUNNEL_ENABLED, false),
  newSpecialistDashboard: toBool(process.env.NEW_SPECIALIST_DASHBOARD_ENABLED, false),
  featuredHomeBlock: toBool(process.env.FEATURED_HOME_BLOCK_ENABLED, false),
  programmaticSeo: toBool(process.env.PROGRAMMATIC_SEO_ENABLED, false),
};
