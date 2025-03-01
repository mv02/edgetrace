import cytoscape from "cytoscape";
import type { ElementDefinition } from "cytoscape";
import type { GraphContext } from "$lib/types";

const MAX_VIEWS = 10;

export default class View {
  title: string;
  timestamp: Date;
  cy: cytoscape.Core;
  selectedNode: cytoscape.NodeSingular | undefined = $state();

  constructor(elements: ElementDefinition[], title?: string) {
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

  attach = (container: HTMLElement) => {
    const prevContainer = this.cy.container();
    this.cy.mount(container);
    if (!prevContainer) {
      this.cy.reset();
      this.cy.layout({ name: "breadthfirst", directed: true }).run();
    }
  };

  detach = () => {
    this.cy.unmount();
  };

  add = (elements: ElementDefinition[]) => {
    this.cy.add(elements);
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
}

export const addView = (graph: GraphContext, view: View) => {
  if (graph.views.length === MAX_VIEWS) {
    graph.views.pop();
  }
  graph.views.unshift(view);
};
