/**
 * File: frontend/src/lib/types.ts
 * Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
 * Description: Type declarations used by the SvelteKit frontend.
 */

import type { EdgeDefinition, NodeDefinition } from "cytoscape";

export type BackendResponseData = {
  nodes: NodeDefinition[][];
  edges: EdgeDefinition[];
  topEdges?: EdgeDefinition[];
};

export type EdgeWithNodesDefinition = {
  source: NodeDefinition;
  target: NodeDefinition;
  edge: EdgeDefinition;
};

export type GraphInfo = {
  name: string;
  nodeCount: number;
  edgeCount: number;
  otherGraph: string | null;
  iterations: number | null;
};

export type Tree = {
  [key: string]: string | Tree;
};
