import axios from "axios";

// NEW FILE TO BYPASS MODULE CACHING
const API_BASE = "http://localhost:8001/api";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

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
