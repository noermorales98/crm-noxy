import { Block } from "@/src/components/ui";

interface WidgetCardProps {
  title: string;
  href: string;
  children: React.ReactNode;
}

/** Widget de lista del dashboard: un Block con su enlace «Ver todo». */
export function WidgetCard({ title, href, children }: WidgetCardProps) {
  return (
    <Block title={title} action={{ label: "Ver todo", href }} className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1">{children}</div>
    </Block>
  );
}
