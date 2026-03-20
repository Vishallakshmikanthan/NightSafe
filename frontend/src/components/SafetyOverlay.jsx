import { Circle } from "react-leaflet";

const scoreToColor = (score) => {
  if (score >= 70) return "#22c55e"; // safe
  if (score >= 40) return "#eab308"; // caution
  return "#ef4444"; // danger
};

export default function SafetyOverlay({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <>
      {data.map((point, idx) => (
        <Circle
          key={idx}
          center={[point.lat, point.lng]}
          radius={150}
          pathOptions={{
            color: scoreToColor(point.score),
            fillColor: scoreToColor(point.score),
            fillOpacity: 0.25,
            weight: 1,
          }}
        />
      ))}
    </>
  );
}
