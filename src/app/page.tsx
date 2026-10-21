import { TransitionGraph, type Song, type Transition } from "@/graph";

// Placeholder data so the page exercises the graph engine until the real UI lands.
const songs: Song[] = [
  { id: "a", title: "Night Ferry", artist: "Lumen Drift", bpm: 122, key: "8A", lengthSec: 384, rating: 4 },
  { id: "b", title: "Copper Lines", artist: "Halden", bpm: 123, key: "9A", lengthSec: 402, rating: 5 },
  { id: "c", title: "Saltwater Tape", artist: "Odessa Rail", bpm: 124, key: "8B", lengthSec: 355, rating: 3 },
];
const transitions: Transition[] = [
  { id: "t1", from: "a", to: "b", cueSec: 300 },
  { id: "t2", from: "a", to: "c", cueSec: 320 },
];

export default function Home() {
  const graph = new TransitionGraph(songs, transitions);
  const root = songs[0]!;
  const next = graph.step(root.id, "ahead");

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold tracking-tight">Branchline</h1>
      <p className="mt-2 text-muted">Save the transitions you trust. Explore every set they add up to.</p>

      <section className="mt-10 rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-display text-lg font-bold">
          After <span className="text-accent">{root.title}</span> you can play
        </h2>
        <ul className="mt-3 space-y-2">
          {next.map(({ next: id }) => {
            const s = songs.find((x) => x.id === id)!;
            return (
              <li key={id} className="flex justify-between rounded-lg bg-panel-2 px-3 py-2">
                <span>
                  {s.title} <span className="text-muted">· {s.artist}</span>
                </span>
                <span className="text-accent-2">
                  {s.bpm} · {s.key}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
