import { PUBLIC_API_URL } from "$env/static/public";
import View from "./view.svelte";
import type { EdgeDefinition, ElementDefinition, NodeDefinition } from "cytoscape";
import type { GraphInfo } from "./types";

const MAX_VIEWS = 10;

export default class Graph {
  readonly name: string;
  readonly nodeCount: number;
  readonly edgeCount: number;

  views: View[] = $state([]);
  viewIndex: number = $state(0);
  currentView: View = $derived(this.views[this.viewIndex]);

  darkMode: boolean = $state(false);
  searchQuery: string = $state("");
  compoundNodesShown: boolean = $state(true);
  diffOtherGraph: string = $state("");
  diffMaxIterations: number = $state(1000);

  /** Mapping of node ID to corresponding element definition. */
  nodeDefinitions: Map<string, NodeDefinition> = new Map();
  /** Mapping of edge ID to corresponding element definition. */
  edgeDefinitions: Map<string, EdgeDefinition> = new Map();
  /** Mapping of node ID to definitions of elements on its path to entrypoint. */
  entrypointPathDefinitions: Map<string, ElementDefinition[]> = new Map();

  constructor(info: GraphInfo, darkMode: boolean = false) {
    this.name = info.name;
    this.nodeCount = info.nodeCount;
    this.edgeCount = info.edgeCount;
    this.darkMode = darkMode;
  }

  addView = (view: View) => {
    if (this.views.length === MAX_VIEWS) this.views.pop();
    this.views.unshift(view);
  };

  createView = (title: string) => {
    const view = new View(this, title);
    this.addView(view);
    return view;
  };

  closeView = (index: number) => {
    this.currentView?.detach();
    this.views[index].destroy();
    this.views.splice(index, 1);
    if (this.viewIndex > index) {
      this.viewIndex--;
    }
    if (this.viewIndex >= this.views.length) {
      this.viewIndex = Math.max(this.views.length - 1, 0);
    }
  };

  getOrFetchMethod = async (id: string, withEntrypoint: boolean = true) => {
    if (this.nodeDefinitions.has(id)) {
      // Node definition is present, use it
      const nodeDefinition = this.nodeDefinitions.get(id);
      if (!nodeDefinition) return [];

      // Get also all parent node definitions
      const parentDefinitions: NodeDefinition[] = [];
      let parentId = nodeDefinition.data.parent;
      while (parentId) {
        let parentDefinition = parentId && this.nodeDefinitions.get(parentId);
        if (!parentDefinition) break;
        parentDefinitions.push(parentDefinition);
        parentId = parentDefinition.data.parent;
      }

      const allDefinitions = [nodeDefinition, ...parentDefinitions];
      if (!withEntrypoint) return allDefinitions;

      if (this.entrypointPathDefinitions.has(id)) {
        // Entrypoint path definition is required and present, use it
        return [...(this.entrypointPathDefinitions.get(id) ?? []), ...allDefinitions];
      }
    }

    // Node definition or entrypoint path definition is missing, fetch it
    return await this.fetchMethod(id, withEntrypoint);
  };

  fetchMethod = async (id: string, withEntrypoint: boolean = true) => {
    const url =
      `${PUBLIC_API_URL}/graphs/${this.name}/method/${id}` +
      (withEntrypoint ? "?entrypoint=1" : "");
    const resp = await fetch(url);
    const data: ElementDefinition[] = await resp.json();

    for (const element of data) {
      const elementId = element.data.id;
      if (!elementId) continue;

      if (element.group === "nodes") {
        this.nodeDefinitions.set(elementId, element);
      } else {
        this.edgeDefinitions.set(elementId, element as EdgeDefinition);
      }

      if (withEntrypoint && elementId && elementId !== id) {
        // Save as part of the node's path to entrypoint
        this.entrypointPathDefinitions.set(id, [
          ...(this.entrypointPathDefinitions.get(id) ?? []),
          element,
        ]);
      }
    }
    return data;
  };

  calculateDiff = async () => {
    await fetch(
      `${PUBLIC_API_URL}/graphs/${this.name}/diff/${this.diffOtherGraph}?max_iterations=${this.diffMaxIterations}`,
      { method: "POST" },
    );
  };

  fetchTopEdges = async (n: number) => {
    const resp = await fetch(`${PUBLIC_API_URL}/graphs/${this.name}/diff/edges?n=${n}`);
    const data = await resp.json();
    return data;
  };

  updateCompoundNodes = () => {
    for (const view of this.views) view.updateCompoundNodes();
  };

  setColors = (darkMode: boolean) => {
    this.darkMode = darkMode;
    for (const view of this.views) view.updateColors();
  };
}
