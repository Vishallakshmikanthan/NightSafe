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

// ── Agent & Dashboard endpoints ────────────────────────────────────

export async function fetchAnomalies(hour) {
  const params = hour !== undefined ? { hour } : {};
  const { data } = await client.get("/agents/anomalies", { params });
  return data;
}

export async function fetchGeoClusters(hour = 22) {
  const { data } = await client.get("/agents/geo-clusters", { params: { hour } });
  return data;
}

export async function fetchPredictions(hour = 22) {
  const { data } = await client.get("/agents/predict", { params: { hour } });
  return data;
}

export async function fetchPoliceAlerts() {
  const { data } = await client.get("/agents/police-alerts");
  return data;
}

export async function fetchGccAlerts() {
  const { data } = await client.get("/agents/gcc-alerts");
  return data;
}

export async function fetchInvestmentReport(top = 10) {
  const { data } = await client.get("/agents/investment-report", { params: { top } });
  return data;
}

export async function submitFeedback(body) {
  const { data } = await client.post("/agents/feedback", body);
  return data;
}

export async function triggerLearning() {
  const { data } = await client.post("/agents/learn");
  return data;
}

export async function fetchLearningStatus() {
  const { data } = await client.get("/agents/learning");
  return data;
}

export async function startSimulation(interval = 30) {
  const { data } = await client.post("/agents/simulation/start", null, {
    params: { interval },
  });
  return data;
}

export async function stopSimulation() {
  const { data } = await client.post("/agents/simulation/stop");
  return data;
}

export async function fetchSimulationStatus() {
  const { data } = await client.get("/agents/simulation/status");
  return data;
}
