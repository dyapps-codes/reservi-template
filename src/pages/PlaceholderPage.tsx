import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({
  title,
  description = 'Build the private workflow for this area.',
}: PlaceholderPageProps) {
  return (
    <Card className="border-dashed shadow-soft">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
          No data yet
        </div>
      </CardContent>
    </Card>
  )
}
