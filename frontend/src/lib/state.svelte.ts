import cytoscape from "cytoscape";

export const cy = $state(
  cytoscape({
    minZoom: 0.1,
    maxZoom: 10,
    wheelSensitivity: 0.25,
    style: [
      { selector: "node", style: { label: "data(label)", color: "gray" } },
      { selector: "edge", style: { "curve-style": "bezier", "target-arrow-shape": "triangle" } },
    ],
  }),
);

cy.removeAll = () => {
  cy.elements().remove();
};

cy.addEl = (elements: cytoscape.ElementDefinition[]) => {
  cy.add(elements);
  cy.reset();
  cy.layout({ name: "breadthfirst", directed: true }).run();
};

declare module "cytoscape" {
  interface Core {
    removeAll(): void;
    addEl(elements: cytoscape.ElementDefinition[]): void;
  }
}
