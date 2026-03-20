import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import SafetyOverlay from "./SafetyOverlay.jsx";

const DEFAULT_CENTER = [40.7128, -74.006]; // New York City
const DEFAULT_ZOOM = 13;

export default function MapView({ safetyData }) {
  return (
    <div className="h-[70vh] w-full rounded-lg overflow-hidden border border-night-600">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {safetyData?.map((point, idx) => (
          <Marker key={idx} position={[point.lat, point.lng]}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{point.label}</p>
                <p>Safety Score: {point.score}/100</p>
              </div>
            </Popup>
          </Marker>
        ))}
        <SafetyOverlay data={safetyData} />
      </MapContainer>
    </div>
  );
}
