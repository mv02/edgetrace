declare module "cytoscape-cola" {
  const cola: cytoscape.Ext;
  export default cola;
}

declare namespace cytoscape {
  interface ColaLayoutOptions extends LayoutOptions {
    name: "cola";
    animate?: boolean;
    refresh?: number;
    maxSimulationTime?: number;
    ungrabifyWhileSimulating?: boolean;
    fit?: boolean;
    padding?: number;
    boundingBox?: BoundingBox12 | BoundingBoxWH;
    nodeDimensionsIncludeLabels?: boolean;
    ready?: () => void;
    stop?: () => void;
    randomize?: boolean;
    avoidOverlap?: boolean;
    handleDisconnected?: boolean;
    convergenceThreshold?: number;
    nodeSpacing?: number | ((node: NodeSingular) => number);
    flow?: { axis: "x" | "y"; minSeparation: number };
    alignment?: ColaAlignmentOptions;
    gapInequalities?: ColaGapInequality[];
    centerGraph?: boolean;
    edgeLength?: number | ((edge: EdgeSingular) => number);
    edgeSymDiffLength?: number | ((edge: EdgeSingular) => number);
    edgeJaccardLength?: number | ((edge: EdgeSingular) => number);
    unconstrIter?: number;
    userConstIter?: number;
    allConstIter?: number;
  }

  interface ColaAlignmentConstraint {
    node: NodeSingular;
    offset?: number;
  }

  interface ColaAlignmentOptions {
    horizontal?: ColaAlignmentConstraint[][];
    vertical?: ColaAlignmentConstraint[][];
  }

  interface ColaGapInequality {
    axis: "x" | "y";
    left: number;
    right: number;
    gap: number;
  }
}
