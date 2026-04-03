import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const ZONES = [
  {
    color: "#22c55e",
    label: "Safe",
    range: "≥ 70",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-400",
  },
  {
    color: "#eab308",
    label: "Caution",
    range: "40 – 70",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    text: "text-yellow-400",
  },
  {
    color: "#ef4444",
    label: "Danger",
    range: "< 40",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-400",
  },
];

export default function LegendPanel() {
  return (
    <Card className="bg-card/75 backdrop-blur-sm animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          Safety Zones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
        {ZONES.map((z) => (
          <div
            key={z.label}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${z.bg} border ${z.border}
                        transition-all duration-300 hover:scale-[1.02]`}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor: z.color,
                boxShadow: `0 0 10px ${z.color}50`,
              }}
            />
            <span className={`text-sm font-semibold ${z.text}`}>
              {z.label}
            </span>
            <span className="text-xs text-gray-500 ml-auto tabular-nums">
              {z.range}
            </span>
          </div>
        ))}
        </div>
      </CardContent>
    </Card>
  );
}
