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

  diffStatus: undefined | "calculating" | "saving" | "cancelling" = $state();
  currentIterations: number = $state(0);
  diffOk: boolean = $state(false);
  diffMessage: string | undefined = $state();

  views: View[] = $state([]);
  viewIndex: number = $state(0);
  currentView: View = $derived(this.views[this.viewIndex]);

  darkMode: boolean = $state(false);
  searchQuery: string = $state("");
  compoundNodesShown: boolean = $state(true);
  graphDetailsTab: "properties" | "edges" = $state("properties");
  selectedOtherGraph: string = $state("");
  selectedMaxIterations: number = $state(1000);

  /** Mapping of node ID to definition of corresponding node and its parents. */
  nodeDefinitions: Map<string, NodeDefinition[]> = new Map();
  /** Mapping of edge ID to corresponding element definition. */
  edgeDefinitions: Map<string, EdgeDefinition> = new Map();
  /** IDs of edges ordered by their difference value. */
  topEdges: string[] = $state([]);

  constructor(info: GraphInfo, darkMode: boolean = false) {
    this.name = info.name;
    this.nodeCount = info.nodeCount;
    this.edgeCount = info.edgeCount;
    this.otherGraph = info.otherGraph;
    this.iterations = info.iterations;
    if (info.otherGraph) {
      this.selectedOtherGraph = info.otherGraph;
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

      // Get definitions of all connected edges
      const edges = this.edgeDefinitions
        .values()
        .filter((edge) => edge.data.source === id || edge.data.target === id);

      if (!withEntrypoint) {
        // Entrypoint path definition is not required
        return { nodes: [nodeWithParents], edges: edges };
      }

      // Entrypoint path definition is required
      const path: string[] = nodeWithParents[0].data.path;
      if (path) {
        // List of entrypoint path node IDs found, try to find all path node and edge definitions
        let allDefinitionsPresent = true;

        const pathNodes: NodeDefinition[][] = [];
        const pathEdges: EdgeDefinition[] = [];

        for (const [i, sourceId] of path.slice(0, path.length - 1).entries()) {
          const targetId = path[i + 1];
          const edgeId = `${sourceId}->${targetId}`;

          if (!this.nodeDefinitions.has(sourceId) || !this.edgeDefinitions.has(edgeId)) {
            // Node definition or edge definition is missing
            allDefinitionsPresent = false;
            break;
          }

          pathNodes.push(this.nodeDefinitions.get(sourceId) as NodeDefinition[]);
          pathEdges.push(this.edgeDefinitions.get(edgeId) as EdgeDefinition);
        }

        if (allDefinitionsPresent)
          return { nodes: [...pathNodes, nodeWithParents], edges: pathEdges };
      }
    }

    // Node definition or entrypoint path definition is missing, fetch it
    return await this.fetchMethod(id, withEntrypoint);
  };

  fetchMethod = async (id: string, withEntrypoint: boolean = false) => {
    let url = `${PUBLIC_API_URL}/graphs/${this.name}/method/${id}`;
    if (withEntrypoint) url += "?with_entrypoint=1";
    const resp = await fetch(url);
    const data: BackendResponseData = await resp.json();
    this.setDefinitions(data);
    return data;
  };

  getOrFetchAllMethodNeighbors = async (methodId: string, type: "callers" | "callees") => {
    if (this.nodeDefinitions.has(methodId)) {
      // Node definition is present, use it
      const nodeWithParents = this.nodeDefinitions.get(methodId) as NodeDefinition[];

      // Try to get list of neighbors from inside node definition
      const neighborList: NodeDefinition[][] | undefined = nodeWithParents[0].data[type];

      if (neighborList) {
        // List of neighbors found, try to find all neighbor and edge definitions
        let allDefinitionsPresent = true;

        const neighbors: NodeDefinition[][] = [];
        const edges: EdgeDefinition[] = [];

        for (const neighborWithParents of neighborList) {
          const neighborId = neighborWithParents[0].data.id as string;
          const edgeId =
            type === "callers" ? `${neighborId}->${methodId}` : `${methodId}->${neighborId}`;

          if (!this.nodeDefinitions.has(neighborId) || !this.edgeDefinitions.has(edgeId)) {
            // Node definition or edge definition is missing
            allDefinitionsPresent = false;
            break;
          }

          neighbors.push(this.nodeDefinitions.get(neighborId) as NodeDefinition[]);
          edges.push(this.edgeDefinitions.get(edgeId) as EdgeDefinition);
        }

        if (allDefinitionsPresent) return { nodes: neighbors, edges: edges };
      }
    }

    // Neighbor definition or edge definition is missing, fetch it
    return await this.fetchAllMethodNeighbors(methodId, type);
  };

  fetchAllMethodNeighbors = async (methodId: string, type: "callers" | "callees") => {
    const resp = await fetch(`${PUBLIC_API_URL}/graphs/${this.name}/method/${methodId}/${type}`);
    const data: BackendResponseData = await resp.json();
    this.setDefinitions(data);
    return data;
  };

  getOrFetchEdge = async (edgeId: string, withNodes: boolean = false) => {
    const [sourceId, targetId] = edgeId.split("->");

    if (this.edgeDefinitions.has(edgeId)) {
      // Edge definition is present, use it
      if (!withNodes) {
        // Connected node definitions are not required
        return { nodes: [], edges: [this.edgeDefinitions.get(edgeId) as EdgeDefinition] };
      }

      if (this.nodeDefinitions.has(sourceId) && this.nodeDefinitions.has(targetId)) {
        // Connected node definitions are required and present, use them
        return {
          nodes: [
            this.nodeDefinitions.get(sourceId) as NodeDefinition[],
            this.nodeDefinitions.get(targetId) as NodeDefinition[],
          ],
          edges: [this.edgeDefinitions.get(edgeId) as EdgeDefinition],
        };
      }
    }

    // Edge definition or connected node definition is missing, fetch it
    return this.fetchEdge(edgeId, withNodes);
  };

  fetchEdge = async (edgeId: string, withNodes: boolean = false) => {
    let url = `${PUBLIC_API_URL}/graphs/${this.name}/edge/${edgeId}`;
    if (withNodes) url += "?with_nodes=1";
    const resp = await fetch(url);
    const data: BackendResponseData = await resp.json();
    this.setDefinitions(data);
    return data;
  };

  setDefinitions = (data: BackendResponseData) => {
    for (const nodeWithParents of data.nodes) {
      const nodeId = nodeWithParents[0].data.id;
      nodeId && this.nodeDefinitions.set(nodeId, nodeWithParents);
    }

    for (const edge of data.edges) {
      const edgeId = edge.data.id;
      edgeId && this.edgeDefinitions.set(edgeId, edge);
    }
  };

  startDiff = () => {
    const ws = new WebSocket(`${PUBLIC_API_URL}/graphs/${this.name}/diff`);

    ws.onopen = () => {
      ws.send(`${this.name},${this.selectedOtherGraph},${this.selectedMaxIterations}`);
      this.diffStatus = "calculating";
    };

    ws.onmessage = (e) => {
      if (e.data === "saving") {
        this.diffStatus = "saving";
        return;
      }

      const data = JSON.parse(e.data);
      if (typeof data === "number") {
        this.currentIterations = data;
      } else {
        this.diffStatus = undefined;
        this.currentIterations = 0;
        this.diffOk = true;
        this.diffMessage = data.message;
        this.iterations = data.iterations;
        this.otherGraph = this.selectedOtherGraph;
      }
    };

    return ws;
  };

  getOrFetchTopEdges = async (n: number) => {
    if (n <= this.topEdges.length) {
      const nodes: NodeDefinition[][] = [];
      const edges: EdgeDefinition[] = [];

      for (const edgeId of this.topEdges.slice(0, n)) {
        const [sourceId, targetId] = edgeId.split("->");
        nodes.push(this.nodeDefinitions.get(sourceId) as NodeDefinition[]);
        nodes.push(this.nodeDefinitions.get(targetId) as NodeDefinition[]);
        edges.push(this.edgeDefinitions.get(edgeId) as EdgeDefinition);
      }

      return { nodes, edges };
    }
    return this.fetchTopEdges(n);
  };

  fetchTopEdges = async (n?: number) => {
    if (n === undefined) {
      n = this.topEdges.length + 10;
    }

    const resp = await fetch(`${PUBLIC_API_URL}/graphs/${this.name}/topedges?n=${n}`);
    const data: BackendResponseData = await resp.json();
    this.setDefinitions(data);
    for (const [i, edge] of (data.topEdges ?? []).entries()) {
      this.edgeDefinitions.set(edge.data.id as string, edge);
      this.topEdges[i] = edge.data.id as string;
    }
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
