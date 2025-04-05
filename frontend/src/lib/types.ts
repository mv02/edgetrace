import type View from "./view.svelte";

export type GraphInfo = {
  name: string;
  nodeCount: number;
  edgeCount: number;
};

export type GraphContext = GraphInfo & {
  views: View[];
  viewIndex: number;
  searchQuery: string;
  compoundNodesShown: boolean;
};

export type Tree = {
  [key: string]: number | Tree;
};
