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
