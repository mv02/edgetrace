import type View from "./view.svelte";

export type GraphContext = {
  views: View[];
  viewIndex: number;
};
