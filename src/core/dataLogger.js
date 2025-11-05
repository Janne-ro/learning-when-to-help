const logs = [];

export function log(event, data = {}) {
  logs.push({ ts: Date.now(), event, ...data });
  console.log("LOG:", { event, ...data });
}

export function exportLogs() {
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "experiment_logs.json";
  a.click();
}
