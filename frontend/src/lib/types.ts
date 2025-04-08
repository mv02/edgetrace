export type GraphInfo = {
  name: string;
  nodeCount: number;
  edgeCount: number;
};

export type Tree = {
  [key: string]: string | Tree;
};
