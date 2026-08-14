import { Card, CardContent, CardHeader } from "@/components/ui";

export default function OverviewStatsSkeleton() {
  return (
    <div className="space-y-freuly-8 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      <Card>
        <CardHeader>
          <div className="h-5 w-40 rounded bg-freuly-border-subtle" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-4 w-full max-w-md rounded bg-freuly-border-subtle" />
          <div className="h-4 w-3/4 max-w-sm rounded bg-freuly-border-subtle" />
        </CardContent>
      </Card>
      <div className="grid gap-freuly-6 md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardHeader>
            <div className="h-5 w-32 rounded bg-freuly-border-subtle" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-4 w-full rounded bg-freuly-border-subtle" />
            <div className="h-4 w-2/3 rounded bg-freuly-border-subtle" />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="h-5 w-24 rounded bg-freuly-border-subtle" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-4 w-full rounded bg-freuly-border-subtle" />
            <div className="h-4 w-1/2 rounded bg-freuly-border-subtle" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="h-5 w-48 rounded bg-freuly-border-subtle" />
        </CardHeader>
        <CardContent>
          <div className="h-12 w-20 rounded bg-freuly-border-subtle" />
        </CardContent>
      </Card>
    </div>
  );
}
