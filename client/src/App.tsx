import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
};

export default function App(): JSX.Element {
  const [backendStatus, setBackendStatus] = useState<string>("checking...");

  useEffect(() => {
    const checkHealth = async (): Promise<void> => {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: HealthResponse = (await res.json()) as HealthResponse;
        setBackendStatus(data.status ?? "unknown");
      } catch {
        setBackendStatus("unreachable (is server running?)");
      }
    };

    void checkHealth();
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-8 font-sans">
      <h1 className="text-3xl font-bold">The Texcellence Conference</h1>
      <p className="mt-2 text-gray-700">
        Theme: Accelerating Africa&apos;s Digital Future
      </p>
      <p className="text-gray-700">
        Date: 13 October 2026 | Venue: Landmark Event Centre
      </p>
      <hr className="my-4" />
      <p>
        Chunk 1 foundation: React + TypeScript + Tailwind can talk to Express.
      </p>
      <p className="mt-2">
        Backend status: <strong>{backendStatus}</strong>
      </p>
    </main>
  );
}
