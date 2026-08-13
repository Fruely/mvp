import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export type OnboardingChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  helper?: string;
  recommendation?: boolean;
};

export default function OnboardingChecklist({
  title,
  publishReadyLabel,
  recommendationLabel,
  items,
}: {
  title: string;
  publishReadyLabel: string;
  recommendationLabel: string;
  items: OnboardingChecklistItem[];
}) {
  return (
    <Card padding="lg" className="shadow-none">
      <CardHeader>
        <CardTitle className="text-freuly-card-title">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-freuly-3">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-start justify-between gap-freuly-3 rounded-freuly-md border border-freuly-border-subtle bg-freuly-border-subtle/40 px-freuly-3 py-freuly-3"
            >
              <div>
                <p className="text-freuly-body-sm font-medium text-freuly-text-primary">{item.label}</p>
                {item.helper ? (
                  <p className="mt-freuly-1 text-freuly-helper text-freuly-text-muted">{item.helper}</p>
                ) : null}
              </div>
              <Badge
                variant={item.done ? "success" : item.recommendation ? "warning" : "neutral"}
                className="shrink-0"
              >
                {item.done ? publishReadyLabel : item.recommendation ? recommendationLabel : "—"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
