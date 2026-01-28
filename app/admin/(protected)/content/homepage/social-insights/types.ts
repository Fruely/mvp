export type LangTriple = { ua: string; ru: string; de: string };

export type SocialInsightsBlockInitial = {
  title: LangTriple;
  subtitle: LangTriple;
  is_active: boolean;
};

export type SocialInsightItemRow = {
  id: string;
  platform: string;
  partner_name: string;
  url: string;
  backlink_required: boolean;
  backlink_verified: boolean;
  is_active: boolean;
  title: LangTriple;
  excerpt: LangTriple;
  created_at: string;
};
