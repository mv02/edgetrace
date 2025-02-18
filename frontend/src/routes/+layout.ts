import type { LayoutLoad } from "./$types";
import { PUBLIC_API_URL } from "$env/static/public";

type Graph = {
  name: string;
  nodeCount: number;
};

export const load: LayoutLoad = async ({ fetch }) => {
  const resp = await fetch(`${PUBLIC_API_URL}/graphs`);
  const graphs: Graph[] = await resp.json();
  return { graphs };
};
