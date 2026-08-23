/**
 * @ameva/sentinel-risk-core
 * Path Flow Aggregator & Transition Matrix Generator for Sankey Diagrams
 */

import type { PathFlowLink, PathFlowMatrix, PathFlowNode } from './types.js';

export class PathFlowAggregator {
  /**
   * Parse an array of past_paths_history strings and aggregate into a Sankey transition matrix.
   * e.g. ["/foundation/ -> /lib/playwright/ -> /sdk/sentinel/"]
   */
  static aggregateFlows(rawPathsList: (string | null | undefined)[]): PathFlowMatrix {
    const nodeVisitCounts = new Map<string, number>();
    const linkTransitions = new Map<string, number>();
    let totalHops = 0;
    let validPathsCount = 0;

    for (const raw of rawPathsList) {
      if (!raw || typeof raw !== 'string') continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;

      validPathsCount++;
      // Split by ' -> ' or ' ──> '
      const segments = trimmed.split(/\s*(?:->|──>)\s*/).map(s => s.trim()).filter(Boolean);
      if (segments.length === 0) continue;

      // Increment node visits
      for (const seg of segments) {
        nodeVisitCounts.set(seg, (nodeVisitCounts.get(seg) || 0) + 1);
      }

      // Increment transitions
      for (let i = 0; i < segments.length - 1; i++) {
        const source = segments[i];
        const target = segments[i + 1];
        if (source && target) {
          const key = source + '===>' + target;
          linkTransitions.set(key, (linkTransitions.get(key) || 0) + 1);
          totalHops++;
        }
      }
    }

    const nodes: PathFlowNode[] = Array.from(nodeVisitCounts.entries()).map(([id, totalVisits]) => ({
      id,
      name: id,
      totalVisits
    }));

    const links: PathFlowLink[] = Array.from(linkTransitions.entries()).map(([key, value]) => {
      const [source, target] = key.split('===>');
      return {
        source,
        target,
        value
      };
    });

    return {
      nodes,
      links,
      totalHops,
      uniquePaths: validPathsCount
    };
  }
}
