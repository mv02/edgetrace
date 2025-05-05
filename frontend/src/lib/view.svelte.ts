import { browser } from "$app/environment";
import chroma from "chroma-js";
import cytoscape from "cytoscape";
import cola from "cytoscape-cola";
import expandCollapse from "cytoscape-expand-collapse";
import { clone, deduplicate } from "./utils";
import type {
  ColaLayoutOptions,
  EdgeCollection,
  EdgeSingular,
  ElementDefinition,
  NodeCollection,
  NodeDefinition,
  NodeSingular,
} from "cytoscape";
import type contextMenus from "cytoscape-context-menus";
import type Graph from "./graph.svelte";
import type { ExpandCollapseInstance } from "cytoscape-expand-collapse";

const COLORS_LIGHT = ["#f3f4f6", "#bfdbfe", "#bbf7d0", "#fef08a", "#fecaca", "#d8b4fe", "#f9a8d4"];
const COLORS_DARK = ["#374151", "#1e40af", "#047857", "#a16207", "#b91c1c", "#7c3aed", "#be185d"];
const COLOR_SCALE = chroma.scale("Viridis");
const LAYOUT_OPTIONS: ColaLayoutOptions = { name: "cola", maxSimulationTime: 1000 };

const METHOD_NODES = "node[!level]";
const COMPOUND_NODES = "node[level > 0]";
const COLLAPSED_NODES = "node.cy-expand-collapse-collapsed-node";

if (browser) {
  const contextMenus = (await import("cytoscape-context-menus")).default;
  cytoscape.use(contextMenus);
}
cytoscape.use(cola);
cytoscape.use(expandCollapse);

export default class View {
  graph: Graph;
  title: string;
  cy: cytoscape.Core;
  isAttached: boolean = false;

  /** Mapping of node ID to corresponding node. */
  nodes: Map<string, NodeSingular> = $state(new Map());
  /** Mapping of edge ID to corresponding edge. */
  edges: Map<string, EdgeSingular> = $state(new Map());
  /** Mapping of node ID to parent node ID. */
  parentIds: Map<string, string> = new Map();

  /** Edges between collapsed compound nodes. */
  metaEdges?: EdgeCollection;

  selectedNode?: NodeSingular = $state();
  selectedEdge?: EdgeSingular = $state();
  methodDetailsTab: "properties" | "callers" | "callees" = $state("properties");
  topEdgesShown: number = $state(0);

  expandCollapse?: ExpandCollapseInstance;
  contextMenu?: contextMenus.ContextMenu;

  constructor(graph: Graph, title: string) {
    this.graph = graph;
    this.title = title.length > 50 ? title.substring(0, 50) + "…" : title;
    this.cy = cytoscape({
      minZoom: 0.1,
      maxZoom: 10,
      wheelSensitivity: 0.25,
    });

    this.updateColors();

    this.cy.on("select", "node", (e) => {
      const target: NodeSingular = e.target;
      this.selectedNode = target.is(COMPOUND_NODES) ? undefined : target;
      this.selectedEdge = undefined;
    });
    this.cy.on("select", "edge", (e) => {
      this.selectedNode = undefined;
      this.selectedEdge = e.target;
    });
    this.cy.on("unselect", () => {
      this.selectedNode = undefined;
      this.selectedEdge = undefined;
    });
    this.cy.on("cxttap", METHOD_NODES, (e) => {
      const target: NodeSingular = e.target;

      for (const type of ["callers", "callees"]) {
        const neighbors: NodeDefinition[][] = target.data(type) ?? [];

        if (neighbors.every((neighbor) => !this.shown(neighbor))) {
          this.contextMenu?.hideMenuItem(`hide-${type}`);
        } else {
          this.contextMenu?.showMenuItem(`hide-${type}`);
        }
        if (neighbors.every((neighbor) => this.shown(neighbor))) {
          this.contextMenu?.hideMenuItem(`show-${type}`);
        } else {
          this.contextMenu?.showMenuItem(`show-${type}`);
        }
      }
    });
  }

  resetLayout = (
    randomize: boolean = false,
    boundingBoxScale: number = 1,
    animate: boolean = true,
  ) => {
    boundingBoxScale = Math.max(Math.min(boundingBoxScale, 1), 0.5);
    let options: ColaLayoutOptions = { ...LAYOUT_OPTIONS, randomize, animate };
    if (randomize) {
      // Smaller bounding box to reduce node spread
      options.boundingBox = {
        x1: 0,
        y1: 0,
        w: this.cy.width() * boundingBoxScale,
        h: this.cy.height() * boundingBoxScale,
      };
    }
    this.cy.layout(options).run();
  };

  updateDiffColoring = () => {
    const relevantEdges = this.cy
      .edges()
      .filter((edge) => edge.data("relevant") && edge.data("value") > 0);
    let minDiffValue = Math.min(...relevantEdges.map((edge) => edge.data("value")));
    let maxDiffValue = Math.max(...relevantEdges.map((edge) => edge.data("value")));
    if (minDiffValue === maxDiffValue) {
      minDiffValue = 0;
      maxDiffValue = 1;
    }
    for (const edge of relevantEdges) {
      const weight = (edge.data("value") - minDiffValue) / (maxDiffValue - minDiffValue);
      edge.data("color", COLOR_SCALE(weight).hex());
    }
    this.cy
      .style()
      .selector("edge[value > 0]")
      .style({
        "line-color": `data(color)`,
        "target-arrow-color": "data(color)",
        width: `mapData(value, ${minDiffValue}, ${maxDiffValue}, 3, 6)`,
      });
  };

  updateColors = () => {
    const darkMode = this.graph.darkMode;
    const colors = darkMode ? COLORS_DARK : COLORS_LIGHT;
    this.cy.style([
      { selector: "node", style: { label: "data(label)", color: darkMode ? "white" : "black" } },
      {
        selector: COMPOUND_NODES,
        style: {
          shape: "round-hexagon",
          "background-color": (ele) => colors[(ele.data("level") - 1) % colors.length],
        },
      },
      { selector: COLLAPSED_NODES, style: { "border-color": "#cccccc", "border-width": 1 } },
      { selector: "edge", style: { "curve-style": "bezier", "target-arrow-shape": "triangle" } },
    ]);
  };

  attach = (container: HTMLElement) => {
    const prevContainer = this.cy.container();
    this.destroyContextMenu();
    this.cy.mount(container);
    this.isAttached = true;
    this.createContextMenu();
    this.expandCollapse = this.cy.expandCollapse({ animate: false, undoable: false, zIndex: 0 });
    if (!prevContainer) {
      this.resetLayout();
    }
  };

  detach = () => {
    if (!this.isAttached) return;
    this.destroyContextMenu();
    this.cy.unmount();
    this.isAttached = false;
  };

  shown = (nodeWithParents: NodeDefinition[]) => {
    const nodeId = nodeWithParents[0].data.id;
    if (!nodeId) return false;
    const node = this.nodes.get(nodeId);
    if (!node) return false;
    return node.inside();
  };

  showNode = (node: NodeSingular, expand: boolean = false) => {
    const id = node.id();
    const parentId = this.parentIds.get(id) as string;
    const parent = this.nodes.get(parentId);

    if (node.is(COMPOUND_NODES) && !this.graph.compoundNodesShown) return;

    if (parent) {
      // If showing a method node, expand all ancestors
      this.showNode(parent, expand || node.is(METHOD_NODES));
    }

    if (expand) this.expandCollapse?.expand(node);

    // Restore only if not inside a collapsed node
    if (!parent || !this.expandCollapse?.isExpandable(parent)) {
      // Restore the node and connected edges
      node.restore();
      // Only edges whose other node is shown
      for (const callerWithParents of node.data("callers") ?? []) {
        const caller: NodeDefinition = callerWithParents[0];
        if (this.nodes.get(caller.data.id as string)?.inside()) {
          this.showEdge(`${caller.data.id}->${id}`);
        }
      }
      for (const calleeWithParents of node.data("callees") ?? []) {
        const callee: NodeDefinition = calleeWithParents[0];
        if (this.nodes.get(callee.data.id as string)?.inside()) {
          this.showEdge(`${id}->${callee.data.id}`);
        }
      }
    }

    if (parent && node.inside()) {
      // The node has been restored, move it to its original parent
      node.move({ parent: parentId });
    }

    this.updateDiffColoring();
    this.nodes = new Map(this.nodes);
  };

  showMethod = async (id: string, withEntrypoint: boolean = false) => {
    const node = this.nodes.get(id);

    if (node && !withEntrypoint) {
      // Method node already exists
      this.showNode(node);
    } else {
      // New method, get related element definitions and add it
      const data = await this.graph.getOrFetchMethod(id, withEntrypoint);
      this.add(deduplicate([...data.nodes.flat(), ...data.edges]));
      this.resetLayout();
    }
  };

  showEdge = async (edgeId: string, withNodes: boolean = false) => {
    const [sourceId, targetId] = edgeId.split("->");
    const edge = this.edges.get(edgeId);

    if (edge) {
      // Edge already exists
      if (!withNodes) {
        // Connected nodes are not required
        edge.restore();
        this.edges = new Map(this.edges);
        return;
      }

      if (this.nodes.has(sourceId) && this.nodes.has(targetId)) {
        // Connected nodes are required and already exist, show them
        this.showNode(this.nodes.get(sourceId) as NodeSingular);
        this.showNode(this.nodes.get(targetId) as NodeSingular);
        this.edges = new Map(this.edges);
        return;
      }
    }

    // New edge, get related element definitions and add it
    const data = await this.graph.getOrFetchEdge(edgeId, withNodes);
    this.add([...data.nodes.flat(), ...data.edges]);
    this.resetLayout();
    this.edges = new Map(this.edges);
  };

  showAllNodeNeighbors = async (node: NodeSingular, type: "callers" | "callees") => {
    const neighbors: NodeDefinition[][] = node?.data(type);
    let toShow: NodeCollection = this.cy.collection();

    for (const neighborWithParents of neighbors) {
      const neighborId = neighborWithParents[0].data.id;
      const neighborNode = neighborId && this.nodes.get(neighborId);
      if (!neighborNode) {
        // A neighbor node is missing, get or fetch all neighbors
        const data = await this.graph.getOrFetchAllMethodNeighbors(node.id(), type);
        this.add(deduplicate([...data.nodes.flat(), ...data.edges]));
        this.resetLayout();
        return;
      }
      toShow = toShow.union(neighborNode);
    }

    for (const node of toShow) this.showNode(node);
  };

  showAllMethodNeighbors = async (methodId: string, type: "callers" | "callees") => {
    const node = this.nodes.get(methodId);
    node && (await this.showAllNodeNeighbors(node, type));
  };

  hideNode = (node: NodeSingular) => {
    const parentsToHide = this.parentsToHide(node);
    node.remove();
    parentsToHide.remove();
    this.updateDiffColoring();
    this.nodes = new Map(this.nodes);
  };

  hideMethod = (id: string) => {
    const node = this.cy.nodes().getElementById(id);
    this.hideNode(node);
  };

  hideEdge = (id: string) => {
    const edge = this.cy.edges().getElementById(id);
    this.hideNode(edge.source());
    this.hideNode(edge.target());
    this.edges = new Map(this.edges);
  };

  hideAllNodeNeighbors = (node: NodeSingular, type: "callers" | "callees") => {
    const toHide = type === "callers" ? node.incomers("node") : node.outgoers("node");
    for (const node of toHide) this.hideNode(node);
  };

  add = (elements?: ElementDefinition[]) => {
    if (!elements) return;
    let copy = clone(elements);

    // Add nodes
    const addedNodes = this.cy.add(copy.filter((ele) => ele.group === "nodes"));

    for (const node of addedNodes) {
      // Save all added nodes and their parent IDs
      this.nodes.set(node.id(), node);
      this.parentIds.set(node.id(), node.parent().first().id());
    }

    // Add edges whose connected nodes are shown
    const addedEdges = this.cy.add(
      copy
        .filter((ele) => ele.group === "edges")
        .filter(
          (edge) =>
            this.nodes.get(edge.data.source)?.inside() &&
            this.nodes.get(edge.data.target)?.inside(),
        ),
    );

    for (const edge of addedEdges) {
      // Save all added edges
      this.edges.set(edge.id(), edge);
    }

    if (!this.graph.compoundNodesShown) this.hideCompoundNodes();
    this.updateDiffColoring();
    this.nodes = new Map(this.nodes);
    return addedNodes.union(addedEdges);
  };

  parentsToHide = (node: NodeSingular | NodeCollection): NodeCollection => {
    const parent = node.parent();
    if (node.is(METHOD_NODES)) {
      // Method node
      return parent
        .map((ele) => this.parentsToHide(ele))
        .reduce((col, cur) => col.union(cur), this.cy.collection());
    }
    // Compound node
    const children = node.children();
    if (children.length !== 1) return this.cy.collection();
    return node.union(this.parentsToHide(parent));
  };

  showCompoundNodes = () => {
    for (const node of this.nodes.values()) {
      // Skip method nodes that are hidden
      if (node.removed() && node.is(METHOD_NODES)) continue;
      // Skip compound nodes that are not collapsed (i.e. not the lowest level)
      if (this.expandCollapse?.isCollapsible(node)) continue;
      this.showNode(node);
    }

    // Restore edges between compound nodes
    this.metaEdges?.restore();
    this.metaEdges = undefined;
  };

  hideCompoundNodes = () => {
    // Save edges between compound nodes
    const metaEdges = this.cy.edges(".cy-expand-collapse-meta-edge");
    this.metaEdges = this.metaEdges?.union(metaEdges) ?? metaEdges;
    // Remove all nodes from their parents
    for (const node of this.nodes.values()) {
      if (node.removed()) continue;
      node.move({ parent: null });
    }
    // Remove the parent nodes
    for (const node of this.nodes.values().filter((el) => el.is(COMPOUND_NODES))) {
      node.remove();
    }
  };

  updateCompoundNodes = () => {
    if (this.graph.compoundNodesShown) this.showCompoundNodes();
    else this.hideCompoundNodes();
  };

  removeAll = () => {
    this.cy.elements().remove();
  };

  unselectAll = () => {
    this.cy.elements().unselect();
    this.selectedNode = undefined;
  };

  destroy = () => {
    this.cy.destroy();
  };

  createContextMenu = () => {
    this.contextMenu = this.cy.contextMenus({
      menuItems: [
        {
          id: "hide",
          content: "Hide node",
          selector: METHOD_NODES,
          onClickFunction: (e) => this.hideNode(e.target),
        },
        {
          id: "show-callers",
          content: "Show callers",
          selector: METHOD_NODES,
          onClickFunction: (e) => this.showAllNodeNeighbors(e.target, "callers"),
        },
        {
          id: "hide-callers",
          content: "Hide callers",
          selector: METHOD_NODES,
          onClickFunction: (e) => this.hideAllNodeNeighbors(e.target, "callers"),
        },
        {
          id: "show-callees",
          content: "Show callees",
          selector: METHOD_NODES,
          onClickFunction: (e) => this.showAllNodeNeighbors(e.target, "callees"),
        },
        {
          id: "hide-callees",
          content: "Hide callees",
          selector: METHOD_NODES,
          onClickFunction: (e) => this.hideAllNodeNeighbors(e.target, "callees"),
        },
      ],
    });
  };

  destroyContextMenu = () => {
    this.contextMenu?.destroy();
    this.contextMenu = undefined;
  };
}
