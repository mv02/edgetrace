/*
 * File: frontend/src/routes/+layout.ts
 * Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
 * Description: Loads graph metadata for all pages and the navigation bar.
 */

import { PUBLIC_API_URL } from "$env/static/public";
import type { GraphInfo, LayoutLoad } from "./$types";

export const load: LayoutLoad = async ({ fetch }) => {
  const resp = await fetch(`${PUBLIC_API_URL}/graphs`);
  const graphs: Record<string, GraphInfo> = {};
  for (const graph of await resp.json()) {
    graphs[graph.name] = graph;
  }
  return { graphs };
};
