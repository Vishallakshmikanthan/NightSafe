import { Card as ShadCard, CardHeader, CardTitle, CardContent } from "../components/ui/card";

export default function AboutPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
        <h1 className="text-3xl font-black mb-2">About NightSafe</h1>
        <p className="text-gray-400 text-sm mb-8">
          AI-powered safe route navigation for nighttime travel
        </p>

        <div className="space-y-4">
          <Card title="What is NightSafe?">
            <p className="text-gray-300 text-sm leading-relaxed">
              NightSafe is an AI-powered navigation tool designed to help pedestrians
              find the safest walking routes at night. By combining crime statistics,
              street lighting data, and machine learning, we generate real-time safety
              scores for every street segment in Chennai.
            </p>
          </Card>

          <Card title="How It Works">
            <ul className="space-y-2.5">
              {[
                ["📊", "Crime incident data is aggregated from public datasets"],
                ["💡", "Street lighting coverage is mapped and scored"],
                ["🤖", "An ML model produces a 0–100 safety score per area"],
                ["🗺️", "Routes are ranked by cumulative safety along the path"],
              ].map(([icon, text]) => (
                <li
                  key={text}
                  className="flex items-start gap-3 text-sm text-gray-300"
                >
                  <span className="text-base shrink-0">{icon}</span>
                  {text}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Multi-Agent Architecture">
            <p className="text-gray-300 text-sm leading-relaxed">
              NightSafe uses a multi-agent system where specialized agents handle
              routing, safety analysis, real-time incident monitoring, and user
              preference learning independently — aligned with UN SDG 11:
              Sustainable Cities and Communities.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <ShadCard className="bg-card/75 backdrop-blur-sm animate-slide-up">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </ShadCard>
  );
}
