import { PUBLIC_API_URL } from "$env/static/public";
import { deduplicate } from "./utils";
import View from "./view.svelte";
import type {
  EdgeDefinition,
  ElementDefinition,
  ElementsDefinition,
  NodeDefinition,
} from "cytoscape";
import type { BackendResponseData, GraphInfo } from "./types";

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

  getParentDefinitions = (id: string) => {
    const nodeDefinition = this.nodeDefinitions.get(id) as NodeDefinition;

    const parentDefinitions: NodeDefinition[] = [];
    let parentId = nodeDefinition.data.parent;
    while (parentId) {
      let parentDefinition = parentId && this.nodeDefinitions.get(parentId);
      if (!parentDefinition) break;
      parentDefinitions.push(parentDefinition);
      parentId = parentDefinition.data.parent;
    }
    return parentDefinitions;
  };

  getOrFetchMethod = async (id: string, withEntrypoint: boolean = true) => {
    if (this.nodeDefinitions.has(id)) {
      // Node definition is present, use it
      const nodeDefinition = this.nodeDefinitions.get(id);
      if (!nodeDefinition) return [];

      // Get also all parent node definitions
      const parentDefinitions = this.getParentDefinitions(id);

      const allDefinitions = [nodeDefinition, ...parentDefinitions];
      if (!withEntrypoint) return allDefinitions;

      if (this.entrypointPathDefinitions.has(id)) {
        // Entrypoint path definition is required and present, use it
        return deduplicate([...(this.entrypointPathDefinitions.get(id) ?? []), ...allDefinitions]);
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
    const data: BackendResponseData = await resp.json();

    for (const element of [...data.nodes.flat(), ...data.edges]) {
      const elementId = element.data.id;
      if (!elementId) continue;

      if (element.group === "nodes" && !this.nodeDefinitions.has(elementId)) {
        this.nodeDefinitions.set(elementId, element);
      } else {
        this.edgeDefinitions.set(elementId, element as EdgeDefinition);
      }

      const callers: NodeDefinition[][] = element.data.callers ?? [];
      const callees: NodeDefinition[][] = element.data.callees ?? [];

      for (const neighbors of [...callers, ...callees]) {
        const neighborId = neighbors[0].data.id;
        if (neighborId && !this.nodeDefinitions.has(neighborId)) {
          for (const subnode of neighbors) {
            const subnodeId = subnode.data.id;
            subnodeId && this.nodeDefinitions.set(subnodeId, subnode);
          }
        }
      }

      if (withEntrypoint && elementId && elementId !== id) {
        // Save as part of the node's path to entrypoint
        this.entrypointPathDefinitions.set(id, [
          ...(this.entrypointPathDefinitions.get(id) ?? []),
          element,
        ]);
      }
    }
    return deduplicate([...data.nodes.flat(), ...data.edges]);
  };

  getOrFetchMethodNeighbor = async (
    methodId: string,
    type: "callers" | "callees",
    neighborId: string,
    withEdges: boolean = true,
  ) => {
    if (this.nodeDefinitions.has(methodId)) {
      // Node definition is present, use it
      const nodeDefinition = this.nodeDefinitions.get(methodId) as NodeDefinition;

      let neighbor: NodeDefinition[] | undefined;

      // Try to get neighbor definitions list from inside node definition
      const neighbors: NodeDefinition[][] | undefined = nodeDefinition.data[type];
      if (neighbors) {
        // Neighbor definitions list present inside the node definition
        neighbor = neighbors.filter((neighbor) => {
          const methodNode = neighbor[0];
          return methodNode.data.id === neighborId;
        })[0];
      }

      if (neighbor) {
        // Neighbor definition has been found
        if (!withEdges) {
          // Edge definition is not required
          return { nodes: [neighbor], edges: [] };
        }

        const edgeId =
          type === "callers" ? `${neighborId}->${methodId}` : `${methodId}->${neighborId}`;

        if (withEdges && this.edgeDefinitions.has(edgeId)) {
          // Edge definition is required and present, use it
          return {
            nodes: [neighbor],
            edges: [this.edgeDefinitions.get(edgeId) as EdgeDefinition],
          };
        }
      }
    }

    // Neighbor definition or edge definition is missing, fetch it
    const data = await this.fetchMethodNeighbors(methodId, type, neighborId);
    if (!withEdges) return { nodes: data.nodes, edges: [] };
    return { nodes: data.nodes, edges: deduplicate(data.edges) };
  };

  getOrFetchAllMethodNeighbors = async (
    methodId: string,
    type: "callers" | "callees",
    withEdges: boolean = true,
  ) => {
    if (this.nodeDefinitions.has(methodId)) {
      const nodeDefinition = this.nodeDefinitions.get(methodId) as NodeDefinition;

      // Try to get neighbor definitions list from inside node definition
      const definitions: NodeDefinition[][] | undefined = nodeDefinition.data[type];

      if (definitions) {
        if (!withEdges) return { nodes: definitions, edges: [] };
        // TODO: get existing edge definitions
      }
    }

    // Neighbor definition or edge definition is missing, fetch it
    const data = await this.fetchMethodNeighbors(methodId, type);
    if (!withEdges) return { nodes: data.nodes, edges: [] };
    return { nodes: data.nodes, edges: deduplicate(data.edges) };
  };

  fetchMethodNeighbors = async (
    methodId: string,
    type: "callers" | "callees",
    neighborId?: string,
  ) => {
    let url = `${PUBLIC_API_URL}/graphs/${this.name}/method/${methodId}/${type}`;
    if (neighborId) {
      url += `/${neighborId}`;
    }
    const resp = await fetch(url);
    const data: BackendResponseData = await resp.json();

    for (const element of [...data.nodes.flat(), ...data.edges]) {
      const elementId = element.data.id;
      if (!elementId) continue;

      if (element.group === "nodes") {
        this.nodeDefinitions.set(elementId, element);
      } else {
        this.edgeDefinitions.set(elementId, element as EdgeDefinition);
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
