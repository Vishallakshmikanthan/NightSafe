import { useState, useEffect, useCallback } from "react";
import { fetchSimulationStatus, startSimulation, stopSimulation } from "../services/api.js";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";

export default function SimulationControls() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchSimulationStatus();
      setStatus(data);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (status?.running) {
        await stopSimulation();
      } else {
        await startSimulation(30);
      }
      await refresh();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const running = status?.running;

  return (
    <Card className="bg-card/75 backdrop-blur-sm animate-slide-up">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Simulation Engine
          </CardTitle>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${running ? "bg-green-500 animate-pulse" : "bg-gray-600"}`}
            />
            <span className={`text-[11px] font-bold ${running ? "text-green-400" : "text-gray-500"}`}>
              {running ? "RUNNING" : "STOPPED"}
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent>

      {status && (
        <div className="flex gap-3 mb-3">
          <div className="flex-1 text-center px-2 py-1.5 rounded-lg bg-night-800 border border-night-600">
            <p className="text-xs text-gray-500">Tick</p>
            <p className="text-sm font-bold text-white tabular-nums">{status.tick ?? 0}</p>
          </div>
          <div className="flex-1 text-center px-2 py-1.5 rounded-lg bg-night-800 border border-night-600">
            <p className="text-xs text-gray-500">Interval</p>
            <p className="text-sm font-bold text-white tabular-nums">{status.interval ?? 30}s</p>
          </div>
        </div>
      )}

      <Button
        onClick={handleToggle}
        disabled={loading}
        variant={running ? "destructive" : "default"}
        className={`w-full shadow-lg ${
          running
            ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 shadow-red-500/10"
            : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 shadow-green-500/10"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            Processing...
          </span>
        ) : running ? (
          "Stop Simulation"
        ) : (
          "Start Simulation"
        )}
      </Button>
      </CardContent>
    </Card>
  );
}
