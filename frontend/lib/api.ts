export type Signal = {
  id: number;
  lat: number;
  lng: number;
  city: string;
  state: string;
  category: string;
  title: string;
  description: string;
  budget: number;
  timeline: string;
  stakeholders: string[];
};

export type MatchResult = {
  signal: Signal;
  score: number;
  reasoning: string;
};

export type MatchResponse = {
  matches: MatchResult[];
};

export async function matchStartup(startupDescription: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startup_description: startupDescription }),
  });

  if (!response.ok) {
    throw new Error(`Match request failed: ${response.status}`);
  }

  return (await response.json()) as MatchResponse;
}
