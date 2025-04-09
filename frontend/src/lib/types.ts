import type { EdgeDefinition, NodeDefinition } from "cytoscape";

export type BackendResponseData = {
  nodes: NodeDefinition[][];
  edges: EdgeDefinition[];
};

export type GraphInfo = {
  name: string;
  nodeCount: number;
  edgeCount: number;
};

export type Tree = {
  [key: string]: string | Tree;
};
