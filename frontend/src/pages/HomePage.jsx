import SafetyMap from "../components/SafetyMap.jsx";

export default function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Chennai Night Safety Map
      </h1>
      <p className="text-gray-400 text-sm mb-6">
        Explore real-time safety scores across 50 streets. Drag the time
        slider to see how safety changes from 8 PM to midnight.
      </p>
      <SafetyMap />
    </div>
  );
}
