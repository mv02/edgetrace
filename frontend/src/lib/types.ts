import type View from "./view.svelte";

export type GraphContext = {
  views: View[];
  viewIndex: number;
};

export type Tree = {
  [key: string]: number | Tree;
};
