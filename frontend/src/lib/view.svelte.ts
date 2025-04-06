import { browser } from "$app/environment";
import { PUBLIC_API_URL } from "$env/static/public";
import chroma from "chroma-js";
import cytoscape from "cytoscape";
import cola from "cytoscape-cola";
import expandCollapse from "cytoscape-expand-collapse";
import type {
  ColaLayoutOptions,
  Collection,
  EdgeSingular,
  ElementDefinition,
  NodeCollection,
  NodeSingular,
} from "cytoscape";
import type contextMenus from "cytoscape-context-menus";
import type { GraphContext } from "$lib/types";

const MAX_VIEWS = 10;
const MAX_NEIGHBORS = 10;
const COLORS_LIGHT = ["#f3f4f6", "#bfdbfe", "#bbf7d0", "#fef08a", "#fecaca", "#d8b4fe", "#f9a8d4"];
const COLORS_DARK = ["#374151", "#1e40af", "#047857", "#a16207", "#b91c1c", "#7c3aed", "#be185d"];
const COLOR_SCALE = chroma.scale("Viridis");
const LAYOUT_OPTIONS: ColaLayoutOptions = { name: "cola", maxSimulationTime: 1000 };

const LEAF_NODES = "node[!level]";
const COMPOUND_NODES = "node[level > 0]";

if (browser) {
  const contextMenus = (await import("cytoscape-context-menus")).default;
  cytoscape.use(contextMenus);
}
cytoscape.use(cola);
cytoscape.use(expandCollapse);

export default class View {
  graphName: string;
  title: string;
  timestamp: Date;
  cy: cytoscape.Core;
  isAttached: boolean = false;
  selectedNode?: NodeSingular = $state();
  selectedEdge?: EdgeSingular = $state();
  compoundNodesShown: boolean;
  hiddenCompoundNodes: NodeCollection;
  contextMenu?: contextMenus.ContextMenu;

  constructor(
    elements: ElementDefinition[],
    graphName: string,
    title: string,
    compoundNodesShown: boolean = true,
    darkMode: boolean = false,
  ) {
    this.graphName = graphName;
    this.title = title.length > 50 ? title.substring(0, 50) + "…" : title;
    this.timestamp = new Date();
    this.cy = cytoscape({
      minZoom: 0.1,
      maxZoom: 10,
      wheelSensitivity: 0.25,
    });
    this.compoundNodesShown = compoundNodesShown;
    this.hiddenCompoundNodes = this.cy.collection();
    this.setColors(darkMode);
    this.add(elements);

    this.cy.on("tap", "node", (e) => {
      const target: NodeSingular = e.target;
      this.selectedNode = target.is(COMPOUND_NODES) ? undefined : target;
      this.selectedEdge = undefined;
    });
    this.cy.on("tap", "edge", (e) => {
      this.selectedNode = undefined;
      this.selectedEdge = e.target;
    });
  }

  resetLayout = () => {
    this.cy.reset();
    this.cy.layout(LAYOUT_OPTIONS).run();
  };

  updateDiffColoring = () => {
    const maxDiffValue = Math.max(...this.cy.edges().map((edge) => edge.data("value")));
    for (const edge of this.cy.edges()) {
      edge.data("color", COLOR_SCALE(edge.data("value") / maxDiffValue).hex());
    }
    this.cy
      .style()
      .selector("edge[value > 0]")
      .style({
        "line-color": `data(color)`,
        "target-arrow-color": "data(color)",
        width: `mapData(value, 0, ${maxDiffValue}, 3, 6)`,
      });
  };

  setColors = (darkMode: boolean = false) => {
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
      { selector: "edge", style: { "curve-style": "bezier", "target-arrow-shape": "triangle" } },
    ]);
  };

  attach = (container: HTMLElement) => {
    const prevContainer = this.cy.container();
    this.destroyContextMenu();
    this.cy.mount(container);
    this.isAttached = true;
    this.createContextMenu();
    this.cy.expandCollapse({ animate: false, undoable: false, zIndex: 0 });
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

  add = (elements: ElementDefinition[]) => {
    const added = this.cy.add(elements);
    if (!this.compoundNodesShown) this.hideCompoundNodes();
    this.updateDiffColoring();
    return added;
  };

  remove = (nodes: NodeCollection) => {
    let removed = this.cy.collection();
    for (const node of nodes) {
      const parentsToRemove = this.parentsToRemove(node);
      removed = removed.union(node.remove());
      removed = removed.union(parentsToRemove.remove());
      removed = removed.union(parentsToRemove); // Include hidden compound nodes (not actually removed)
      this.hiddenCompoundNodes = this.hiddenCompoundNodes.difference(parentsToRemove);
    }
    this.updateDiffColoring();
    return removed;
  };

  restore = (elements: Collection) => {
    if (this.compoundNodesShown) {
      const restored = elements.restore();
      this.updateDiffColoring();
      return restored;
    }
    const compoundNodes = elements.filter(COMPOUND_NODES);
    this.hiddenCompoundNodes = this.hiddenCompoundNodes.union(compoundNodes);
    const restored = elements.difference(compoundNodes).restore();
    this.updateDiffColoring();
    return restored;
  };

  parent = (node: NodeCollection): NodeCollection => {
    const parent = node.parent();
    if (parent.nonempty()) return parent;

    const id = node.is(LEAF_NODES) ? node.data("savedParent") : node.data("parent");
    return this.hiddenCompoundNodes.filter(`[id = "${id}"]`);
  };

  children = (node: NodeSingular): NodeCollection => {
    const children = node.children();
    if (children.nonempty()) return children;

    const compoundChildren = this.hiddenCompoundNodes.filter(`[parent = "${node.id()}"]`);
    const leafChildren = this.cy.nodes(`[savedParent = "${node.id()}"]`);
    return compoundChildren.union(leafChildren);
  };

  parentsToRemove = (node: NodeCollection): NodeCollection => {
    const parent = this.parent(node);
    if (node.is(LEAF_NODES)) {
      // Leaf node
      return parent
        .map((ele) => this.parentsToRemove(ele))
        .reduce((col, cur) => col.union(cur), this.cy.collection());
    }
    // Compound node
    const children = this.children(node.first());
    if (children.length !== 1) return this.cy.collection();
    return node.union(this.parentsToRemove(parent));
  };

  showNeighbors = async (node: NodeSingular, type: "callers" | "callees") => {
    const neighbors: Collection | undefined = node.data(type);
    if (neighbors) this.restore(neighbors);

    const fetched: boolean = node.data(`${type}Fetched`) ?? false;

    if (!fetched) {
      // Fetch and add new neighbors
      const resp = await fetch(
        `${PUBLIC_API_URL}/graphs/${this.graphName}/method/${node.data("id")}/${type}`,
      );
      const data: ElementDefinition[] = await resp.json();
      // TODO: selectable neighbor limit, incremental expansion
      const added = this.add(data.slice(0, MAX_NEIGHBORS * 2));
      if (added.length > 0) {
        this.cy.layout(LAYOUT_OPTIONS).run();
      }
      node.data(type, neighbors?.union(added) ?? added);
      node.data(`${type}Fetched`, true);
    }

    this.unselectAll();
    node.select();
    this.selectedNode = node;
  };

  hideNeighbors = async (node: NodeSingular, type: "callers" | "callees") => {
    const neighbors = type === "callers" ? node.incomers("node") : node.outgoers("node");
    const removed = this.remove(neighbors);
    node.data(type, neighbors.union(removed));
  };

  showCompoundNodes = () => {
    this.compoundNodesShown = true;
    // Restore hidden compound nodes
    this.hiddenCompoundNodes.restore();
    this.hiddenCompoundNodes = this.cy.collection();
    // Restore original parents
    for (const node of this.cy.nodes(LEAF_NODES)) {
      node.move({ parent: node.data("savedParent") });
      node.data("savedParent", undefined);
    }
  };

  hideCompoundNodes = () => {
    this.compoundNodesShown = false;
    // Save original parents
    const leafNodes = this.cy.nodes(LEAF_NODES);
    for (const node of leafNodes) {
      node.data("savedParent", node.data("parent"));
      node.move({ parent: null });
    }
    // Remove and save compound nodes
    const removed = this.cy.nodes(COMPOUND_NODES).remove();
    this.hiddenCompoundNodes = this.hiddenCompoundNodes.union(removed) ?? removed;
  };

  toggleCompoundNodes = () => {
    if (this.compoundNodesShown) this.hideCompoundNodes();
    else this.showCompoundNodes();
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
          id: "show-callers",
          content: "Show callers",
          selector: LEAF_NODES,
          onClickFunction: (e) => this.showNeighbors(e.target, "callers"),
        },
        {
          id: "hide-callers",
          content: "Hide callers",
          selector: LEAF_NODES,
          onClickFunction: (e) => this.hideNeighbors(e.target, "callers"),
        },
        {
          id: "show-callees",
          content: "Show callees",
          selector: LEAF_NODES,
          onClickFunction: (e) => this.showNeighbors(e.target, "callees"),
        },
        {
          id: "hide-callees",
          content: "Hide callees",
          selector: LEAF_NODES,
          onClickFunction: (e) => this.hideNeighbors(e.target, "callees"),
        },
      ],
    });
  };

  destroyContextMenu = () => {
    this.contextMenu?.destroy();
    this.contextMenu = undefined;
  };
}

export const addView = (graph: GraphContext, view: View) => {
  if (graph.views.length === MAX_VIEWS) {
    graph.views.pop();
  }
  graph.views.unshift(view);
};
