import { PUBLIC_API_URL } from "$env/static/public";
import View from "./view.svelte";
import type { EdgeDefinition, NodeDefinition } from "cytoscape";
import type { BackendResponseData, GraphInfo } from "./types";

const MAX_VIEWS = 10;

export default class Graph {
  readonly name: string;
  readonly nodeCount: number;
  readonly edgeCount: number;
  otherGraph: string | null = $state(null);
  iterations: number | null = $state(null);
  currentIterations: number = $state(0);

  views: View[] = $state([]);
  viewIndex: number = $state(0);
  currentView: View = $derived(this.views[this.viewIndex]);

  darkMode: boolean = $state(false);
  searchQuery: string = $state("");
  compoundNodesShown: boolean = $state(true);
  diffOtherGraph: string = $state("");
  diffMaxIterations: number = $state(1000);

  /** Mapping of node ID to definition of corresponding node and its parents. */
  nodeDefinitions: Map<string, NodeDefinition[]> = new Map();
  /** Mapping of edge ID to corresponding element definition. */
  edgeDefinitions: Map<string, EdgeDefinition> = new Map();
  /** Mapping of node ID to definitions of nodes and their parents on its path to entrypoint. */
  entrypointPathNodes: Map<string, NodeDefinition[][]> = new Map();
  /** Mapping of node ID to definitions of edges on its path to entrypoint. */
  entrypointPathEdges: Map<string, EdgeDefinition[]> = new Map();

  /** Definitions of top diff edges and their connected nodes. */
  diffDefinitions: BackendResponseData[] = [];

  constructor(info: GraphInfo, darkMode: boolean = false) {
    this.name = info.name;
    this.nodeCount = info.nodeCount;
    this.edgeCount = info.edgeCount;
    this.otherGraph = info.otherGraph;
    this.iterations = info.iterations;
    if (info.otherGraph) {
      this.diffOtherGraph = info.otherGraph;
    }
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

  getOrFetchMethod = async (id: string, withEntrypoint: boolean = false) => {
    if (this.nodeDefinitions.has(id)) {
      // Node definition is present, use it
      const nodeWithParents = this.nodeDefinitions.get(id) as NodeDefinition[];

      if (!withEntrypoint) return { nodes: [nodeWithParents], edges: [] };

      if (this.entrypointPathNodes.has(id) && this.entrypointPathEdges.has(id)) {
        // Entrypoint path definition is required and present, use it
        const pathNodes = this.entrypointPathNodes.get(id) as NodeDefinition[][];
        const pathEdges = this.entrypointPathEdges.get(id) as EdgeDefinition[];
        return { nodes: [...pathNodes, nodeWithParents], edges: pathEdges };
      }
    }

    // Node definition or entrypoint path definition is missing, fetch it
    return await this.fetchMethod(id, withEntrypoint);
  };

  fetchMethod = async (id: string, withEntrypoint: boolean = false) => {
    const url = `${PUBLIC_API_URL}/graphs/${this.name}/method/${id}`;
    const resp = await fetch(url);
    const data: BackendResponseData = await resp.json();

    for (const nodeWithParents of data.nodes) {
      const nodeId = nodeWithParents[0].data.id;
      nodeId && this.nodeDefinitions.set(nodeId, nodeWithParents);
    }

    for (const edge of data.edges) {
      const edgeId = edge.data.id;
      edgeId && this.edgeDefinitions.set(edgeId, edge);
    }

    if (withEntrypoint && data.path) {
      // Save elements as the node's path to entrypoint
      this.entrypointPathNodes.set(id, data.path.nodes);
      this.entrypointPathEdges.set(id, data.path.edges);
      // And their definitions as well
      for (const nodeWithParents of data.path.nodes) {
        const nodeId = nodeWithParents[0].data.id;
        nodeId && this.nodeDefinitions.set(nodeId, nodeWithParents);
      }
      for (const edge of data.path.edges) {
        const edgeId = edge.data.id;
        edgeId && this.edgeDefinitions.set(edgeId, edge);
      }

      return {
        nodes: [...data.path.nodes, ...data.nodes],
        edges: [...data.path.edges, ...data.edges],
      };
    }

    return { nodes: data.nodes, edges: data.edges };
  };

  getOrFetchMethodNeighbor = async (
    methodId: string,
    type: "callers" | "callees",
    neighborId: string,
    withEdges: boolean = true,
  ) => {
    if (this.nodeDefinitions.has(methodId)) {
      // Node definition is present, use it
      const nodeWithParents = this.nodeDefinitions.get(methodId) as NodeDefinition[];

      let neighbor: NodeDefinition[] | undefined;

      // Try to get neighbor definitions list from inside node definition
      const neighbors: NodeDefinition[][] | undefined = nodeWithParents[0].data[type];
      if (neighbors) {
        // Neighbor definitions list present inside the node definition
        neighbor = neighbors.filter((neighbor) => neighbor[0].data.id === neighborId)[0];
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
    return { nodes: data.nodes, edges: withEdges ? data.edges : [] };
  };

  getOrFetchAllMethodNeighbors = async (
    methodId: string,
    type: "callers" | "callees",
    withEdges: boolean = true,
  ) => {
    if (this.nodeDefinitions.has(methodId)) {
      // Node definition is present, use it
      const nodeWithParents = this.nodeDefinitions.get(methodId) as NodeDefinition[];

      // Try to get neighbor definitions list from inside node definition
      const neighbors: NodeDefinition[][] | undefined = nodeWithParents[0].data[type];

      if (neighbors) {
        if (!withEdges) return { nodes: neighbors, edges: [] };
        // TODO: get existing edge definitions
      }
    }

    // Neighbor definition or edge definition is missing, fetch it
    const data = await this.fetchMethodNeighbors(methodId, type);
    return { nodes: data.nodes, edges: withEdges ? data.edges : [] };
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

    for (const nodeWithParents of data.nodes) {
      const nodeId = nodeWithParents[0].data.id;
      nodeId && this.nodeDefinitions.set(nodeId, nodeWithParents);
    }

    for (const edge of data.edges) {
      const edgeId = edge.data.id;
      edgeId && this.edgeDefinitions.set(edgeId, edge);
    }

    return { nodes: data.nodes, edges: data.edges };
  };

  calculateDiff = async () => {
    return await fetch(
      `${PUBLIC_API_URL}/graphs/${this.name}/diff/start/${this.diffOtherGraph}?max_iterations=${this.diffMaxIterations}`,
      { method: "POST" },
    );
  };

  cancelDiff = async () => {
    return await fetch(`${PUBLIC_API_URL}/graphs/${this.name}/diff/cancel`, { method: "POST" });
  };

  get diffWebsocket() {
    const ws = new WebSocket(`${PUBLIC_API_URL}/graphs/${this.name}/diff/ws`);
    ws.addEventListener("message", (e) => (this.currentIterations = parseInt(e.data)));
    return ws;
  }

  getOrFetchTopEdges = async (n: number) => {
    if (n <= this.diffDefinitions.length) return this.diffDefinitions.slice(0, n);
    return this.fetchTopEdges(n);
  };

  fetchTopEdges = async (n: number) => {
    const resp = await fetch(`${PUBLIC_API_URL}/graphs/${this.name}/diff/edges?n=${n}`);
    const data: BackendResponseData[] = await resp.json();
    this.diffDefinitions = data;
    return data;
  };

  updateCompoundNodes = () => {
    for (const view of this.views) view.updateCompoundNodes();
  };

  setColors = (darkMode: boolean) => {
    this.darkMode = darkMode;
    for (const view of this.views) {
      view.updateColors();
      view.updateDiffColoring();
    }
  };
}
