export type MethodId = number | string;


export type GraphInfo = {
  name: string;
  nodeCount: number;
  edgeCount: number;
};

export type Tree = {
  [key: string]: number | Tree;
};
