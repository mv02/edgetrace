declare module "cytoscape-expand-collapse" {
  import cytoscape from "cytoscape";

  interface ExpandCollapseOptions {
    layoutBy?: null | Record<string, any> | ((cy: cytoscape.Core) => void);
    fisheye?: boolean | (() => boolean);
    animate?: boolean | (() => boolean);
    animationDuration?: number;
    ready?: () => void;
    undoable?: boolean;
    cueEnabled?: boolean;
    expandCollapseCuePosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    expandCollapseCueSize?: number;
    expandCollapseCueLineSize?: number;
    expandCueImage?: string;
    collapseCueImage?: string;
    expandCollapseCueSensitivity?: number;
    edgeTypeInfo?: string | ((edge: cytoscape.EdgeSingular) => string | undefined);
    groupEdgesOfSameTypeOnCollapse?: boolean;
    allowNestedEdgeCollapse?: boolean;
    zIndex?: number;
  }

  export interface ExpandCollapseInstance {
    expandAll(): void;
    collapseAll(): void;
    expand(nodes: cytoscape.NodeCollection): void;
    collapse(nodes: cytoscape.NodeCollection): void;
    isCollapsible(node: cytoscape.NodeSingular): boolean;
    isExpandable(node: cytoscape.NodeSingular): boolean;
  }

  const expandCollapse: cytoscape.Ext;
  export default expandCollapse;

  declare module "cytoscape" {
    interface Core {
      expandCollapse(options?: Partial<ExpandCollapseOptions>): ExpandCollapseInstance;
    }
  }
}
