import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export async function fetchSafetyScores(params = {}) {
  const { data } = await client.get("/safety/scores", { params });
  return data;
}

export async function fetchRoute(origin, destination) {
  const { data } = await client.get("/routes/safe", {
    params: { origin, destination },
  });
  return data;
}

export async function fetchHealthCheck() {
  const { data } = await client.get("/health");
  return data;
}

export async function fetchStreets() {
  const { data } = await client.get("/streets");
  return data;
}

export async function fetchSafetyScore(streetId, hour) {
  const { data } = await client.get("/safety-score", {
    params: { street_id: streetId, hour },
  });
  return data;
}

export async function fetchDangerZones(hour) {
  const { data } = await client.get("/danger-zones", { params: { hour } });
  return data;
}

export async function fetchTransitionAlerts() {
  const { data } = await client.get("/transition-alerts");
  return data;
}

export async function fetchAlerts() {
  const { data } = await client.get("/alerts");
  return data;
}

export async function fetchSafeRoute(start, end, hour) {
  const { data } = await client.get("/routes/safe-route", {
    params: { start, end, hour },
  });
  return data;
}

export async function fetchStreetNames() {
  const { data } = await client.get("/routes/street-names");
  return data;
}
