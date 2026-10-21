import type { ReactNode } from "react";
import { formatTime, NODE_LIMIT, type Scene, type ViewState } from "@/library";

interface UnderTheHoodProps {
  scene: Scene | null;
  view: ViewState;
  songCount: number;
  transitionCount: number;
  rootTitle: string;
  targetTitle: string;
}

const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-panel-2 px-1.5 py-px text-[13px] text-text">{children}</code>
);

/** Plain-language explanation of the algorithms behind the current tree. */
export function UnderTheHood({ scene, view, songCount, transitionCount, rootTitle, targetTitle }: UnderTheHoodProps) {
  const p = "my-1 max-w-[78ch] text-muted";
  const steps = `${view.depth} step${view.depth > 1 ? "s" : ""}`;

  return (
    <section aria-live="polite" className="rounded-2xl border border-line bg-panel px-4 py-3.5">
      <h2 className="mb-1.5 font-display text-[17px] font-bold">Under the hood</h2>
      {scene && (
        <>
          <p className={p}>
            Your library is a directed graph with <Code>{songCount}</Code> songs (nodes) and{" "}
            <Code>{transitionCount}</Code> transitions (edges).{" "}
            {view.direction === "ahead" ? (
              <>
                Look ahead ran a depth-limited DFS over <b>outgoing</b> edges from <b>{rootTitle}</b>, {steps} deep,
                and unrolled the graph into a tree of <Code>{scene.nodeCount}</Code> nodes.
              </>
            ) : (
              <>
                Look toward ran the same DFS over <b>incoming</b> edges (the reversed graph), so every branch is a path
                you know that ends at <b>{rootTitle}</b>. <Code>{scene.nodeCount}</Code> nodes.
              </>
            )}
          </p>
          <p className={p}>
            Songs already on the current path are shown as dashed &ldquo;loops back&rdquo; stubs. Without that check, a
            cycle like A → B → A would expand forever.
            {scene.truncated && ` The tree hit the ${NODE_LIMIT}-node cap, so reduce the depth to see it all.`}
          </p>
          {scene.reachableCount !== null && (
            <p className={p}>
              Pathfinder ran one BFS backward from <b>{targetTitle}</b>. That labels every song with its
              fewest-transitions distance to the target in O(V + E); <Code>{scene.reachableCount}</Code> song
              {scene.reachableCount === 1 ? "" : "s"} can reach it. Amber edges step one closer each time.
            </p>
          )}
          {view.direction === "ahead" && (
            <p className={p}>
              Timing: at <Code>{formatTime(view.positionSec)}</Code> into the current track,{" "}
              <Code>{scene.passedCount}</Code> of its transitions have a cue point you&rsquo;ve already passed, so
              those branches are dimmed.
            </p>
          )}
        </>
      )}
      <div className="mt-2 flex flex-wrap gap-4 text-[13px] text-muted">
        <LegendItem color="var(--accent)">shortest route to target</LegendItem>
        <LegendItem color="var(--danger)">cue point already passed</LegendItem>
        <LegendItem color="var(--line)">saved transition</LegendItem>
      </div>
    </section>
  );
}

function LegendItem({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-[3px] w-[18px]" style={{ background: color }} />
      {children}
    </span>
  );
}
