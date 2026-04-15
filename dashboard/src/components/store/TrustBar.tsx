import { Zap, Headphones, ShieldCheck, Star } from "lucide-react";

const items = [
  { icon: Zap, title: "Instant delivery", sub: "Digital goods in minutes", color: "text-amber-500 bg-amber-500/10" },
  { icon: Headphones, title: "24/7 support", sub: "Real help when you need it", color: "text-blue-500 bg-blue-500/10" },
  { icon: ShieldCheck, title: "Secure checkout", sub: "Encrypted payments", color: "text-green-500 bg-green-500/10" },
  { icon: Star, title: "Verified reviews", sub: "From real buyers", color: "text-primary bg-primary/10" },
];

export function TrustBar() {
  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4 md:divide-x md:divide-border">
          {items.map(({ icon: Icon, title, sub, color }) => (
            <div
              key={title}
              className="flex items-center gap-3 md:px-6 first:md:pl-0 last:md:pr-0"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
