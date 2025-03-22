import { browser } from "$app/environment";
import { PUBLIC_API_URL } from "$env/static/public";
import cytoscape from "cytoscape";
import expandCollapse from "cytoscape-expand-collapse";
import type { Collection, ElementDefinition, NodeSingular } from "cytoscape";
import type contextMenus from "cytoscape-context-menus";
import type { GraphContext } from "$lib/types";

const MAX_VIEWS = 10;
const MAX_NEIGHBORS = 10;
const COLORS_LIGHT = ["#f3f4f6", "#bfdbfe", "#bbf7d0", "#fef08a", "#fecaca", "#d8b4fe", "#f9a8d4"];
const COLORS_DARK = ["#374151", "#1e40af", "#047857", "#a16207", "#b91c1c", "#7c3aed", "#be185d"];
const LAYOUT_OPTIONS = { name: "breadthfirst", directed: true };

if (browser) {
  const contextMenus = (await import("cytoscape-context-menus")).default;
  cytoscape.use(contextMenus);
}
cytoscape.use(expandCollapse);

export default class View {
  graphName: string;
  title: string;
  timestamp: Date;
  cy: cytoscape.Core;
  isAttached: boolean = false;
  selectedNode?: cytoscape.NodeSingular = $state();
  contextMenu?: contextMenus.ContextMenu;

  constructor(
    elements: ElementDefinition[],
    graphName: string,
    title?: string,
    darkMode: boolean = false,
  ) {
    this.graphName = graphName;
    this.title = title ?? "Query";
    this.timestamp = new Date();
    this.cy = cytoscape({
      elements,
      minZoom: 0.1,
      maxZoom: 10,
      wheelSensitivity: 0.25,
    });
    this.setColors(darkMode);

    this.cy.on("tap", "node", (e: cytoscape.EventObject) => {
      const node: NodeSingular = e.target;
      if (node.isParent() || node.hasClass("cy-expand-collapse-collapsed-node")) {
        // Compound node (has children or is collapsed)
        // TODO: compound node properties
        this.selectedNode = undefined;
      } else {
        // Regular node
        this.selectedNode = e.target;
      }
    });
  }

  resetLayout = () => {
    this.cy.reset();
    this.cy.layout(LAYOUT_OPTIONS).run();
  };

  setColors = (darkMode: boolean = false) => {
    const colors = darkMode ? COLORS_DARK : COLORS_LIGHT;
    this.cy.style([
      { selector: "node", style: { label: "data(label)", color: darkMode ? "white" : "black" } },
      {
        selector: "node:parent, node.cy-expand-collapse-collapsed-node",
        style: {
          shape: "round-hexagon",
          "background-color": (ele) => colors[ele.data("level") % colors.length],
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
    return this.cy.add(elements);
  };

  expandNode = async (node: NodeSingular) => {
    const collapsed: Collection | undefined = node.data("collapsed");
    collapsed?.restore();

    const fetched: boolean = node.data("fetched") ?? false;

    if (!fetched) {
      // Fetch and add new neighbors
      const resp = await fetch(
        `${PUBLIC_API_URL}/graphs/${this.graphName}/method/${node.data("id")}/neighbors`,
      );
      const data: ElementDefinition[] = await resp.json();
      // TODO: selectable neighbor limit, incremental expansion
      const added = this.add(data.slice(0, MAX_NEIGHBORS * 2));
      if (added.length > 0) {
        this.cy.layout(LAYOUT_OPTIONS).run();
      }
      node.data("fetched", true);
    }

    this.unselectAll();
    node.select();
    this.selectedNode = node;
  };

  collapseNode = (node: NodeSingular) => {
    const removed = node.outgoers().remove();
    node.data("collapsed", removed);
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
          id: "expand",
          content: "Expand node",
          selector: "node",
          onClickFunction: (e) => this.expandNode(e.target),
        },
        {
          id: "collapse",
          content: "Collapse node",
          selector: "node",
          onClickFunction: (e) => this.collapseNode(e.target),
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
