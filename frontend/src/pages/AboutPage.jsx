export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">About NightSafe</h1>
      <p className="text-gray-300 mb-4">
        NightSafe is an AI-powered navigation tool designed to help pedestrians
        find the safest walking routes at night. By combining crime statistics,
        street lighting data, and machine learning, we generate real-time safety
        scores for every street segment.
      </p>
      <h2 className="text-xl font-semibold mb-2">How It Works</h2>
      <ul className="list-disc list-inside text-gray-400 space-y-2 mb-6">
        <li>Crime incident data is aggregated from public datasets</li>
        <li>Street lighting coverage is mapped and scored</li>
        <li>An ML model produces a 0-100 safety score per area</li>
        <li>Routes are ranked by cumulative safety along the path</li>
      </ul>
      <h2 className="text-xl font-semibold mb-2">Multi-Agent Architecture</h2>
      <p className="text-gray-300">
        NightSafe is designed to scale into a multi-agent system where
        specialized agents handle routing, safety analysis, real-time incident
        monitoring, and user preference learning independently.
      </p>
    </div>
  );
}
