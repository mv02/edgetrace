import { browser } from "$app/environment";
import { PUBLIC_API_URL } from "$env/static/public";
import cytoscape from "cytoscape";
import expandCollapse from "cytoscape-expand-collapse";
import type { ElementDefinition, NodeSingular } from "cytoscape";
import type contextMenus from "cytoscape-context-menus";
import type { GraphContext } from "$lib/types";

const MAX_VIEWS = 10;
const MAX_NEIGHBORS = 10;

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

  constructor(elements: ElementDefinition[], graphName: string, title?: string) {
    this.graphName = graphName;
    this.title = title ?? "Query";
    this.timestamp = new Date();
    this.cy = cytoscape({
      elements,
      minZoom: 0.1,
      maxZoom: 10,
      wheelSensitivity: 0.25,
      style: [
        { selector: "node", style: { label: "data(label)", color: "gray" } },
        { selector: "edge", style: { "curve-style": "bezier", "target-arrow-shape": "triangle" } },
      ],
    });

    this.cy.on("tap", "node", (e: cytoscape.EventObject) => {
      this.selectedNode = e.target;
    });
  }

  resetLayout = () => {
    this.cy.reset();
    this.cy.layout({ name: "breadthfirst", directed: true }).run();
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

  add = (elements: ElementDefinition[], layout: boolean = false) => {
    this.cy.add(elements);
    if (layout) {
      this.resetLayout();
    }
  };

  expandNode = async (node: NodeSingular) => {
    const resp = await fetch(
      `${PUBLIC_API_URL}/graphs/${this.graphName}/method/${node.data("id")}/neighbors`,
    );
    const data: ElementDefinition[] = await resp.json();
    // TODO: selectable neighbor limit, incremental expansion
    this.add(data.slice(0, MAX_NEIGHBORS * 2), true);
    this.unselectAll();
    node.select();
    this.selectedNode = node;
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
