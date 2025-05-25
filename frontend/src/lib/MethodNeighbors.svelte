<!--
  File: frontend/src/lib/MethodNeighbors.svelte
  Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
  Description: The method neighbor list component for showing callers or callees.
-->

<script lang="ts">
  import { Button, Listgroup, ListgroupItem, Modal } from "flowbite-svelte";
  import { EyeOutline, EyeSlashOutline } from "flowbite-svelte-icons";
  import type Graph from "./graph.svelte";
  import type { NodeDefinition } from "cytoscape";

  interface Props {
    graph: Graph;
    type: "callers" | "callees";
  }

  let { graph, type }: Props = $props();

  let node = $derived(graph.currentView.selectedNode);
  let modalOpen: boolean = $state(false);

  let neighbors: NodeDefinition[][] = $state(graph.currentView.selectedNode?.data(type));
  let sortedNeighbors: NodeDefinition[][] = $derived(
    [...neighbors].sort((a: NodeDefinition[], b: NodeDefinition[]) => {
      if (a[0].data.name < b[0].data.name) return -1;
      if (a[0].data.name > b[0].data.name) return 1;
      return 0;
    }),
  );

  $effect(() => (neighbors = graph.currentView.selectedNode?.data(type)));

  const getAllNeighbors = async () => {
    if (!node) return;
    const definitions = await graph.getOrFetchAllMethodNeighbors(node.id(), type);
    node.data(type, definitions.nodes);
    neighbors = definitions.nodes;
  };

  const showNeighbor = (neighborId: string) => {
    if (!node) return;
    graph.currentView.showMethod(neighborId);
  };

  const showAllNeighbors = () => {
    if (!node) return;
    if (neighbors.length > 50) {
      modalOpen = true;
    } else {
      graph.currentView.showAllNodeNeighbors(node, type);
    }
  };

  const hideAllNeighbors = () => {
    if (!node) return;
    graph.currentView.hideAllNodeNeighbors(node, type);
  };
</script>

<div class="flex items-center justify-between">
  <Modal
    title="Warning"
    bind:open={modalOpen}
    autoclose
    outsideclose
    size="xs"
    placement="center-right"
  >
    <p>
      Showing {neighbors?.length} nodes might slow down the application. Consider selecting specific
      neighbors instead.
    </p>
    <div class="flex items-center justify-end gap-3">
      <Button onclick={() => node && graph.currentView.showAllNodeNeighbors(node, type)}>
        Show anyway
      </Button>
      <Button color="alternative">Cancel</Button>
    </div>
  </Modal>

  <span class="text-sm">
    {neighbors?.length ?? "Unknown"}
    {type}
  </span>

  {#if !neighbors}
    <Button size="xs" color="alternative" onclick={getAllNeighbors}>Fetch</Button>
  {:else if neighbors.length > 0}
    <div class="flex gap-1">
      {#if neighbors.some((n) => !graph.currentView.shown(n))}
        <Button size="xs" color="alternative" onclick={showAllNeighbors}>Show all</Button>
      {/if}
      {#if neighbors.some((n) => graph.currentView.shown(n))}
        <Button size="xs" color="alternative" onclick={hideAllNeighbors}>Hide all</Button>
      {/if}
    </div>
  {/if}
</div>

<Listgroup defaultClass="overflow-y-auto">
  {#each sortedNeighbors ?? [] as neighbor}
    <ListgroupItem normalClass="flex gap-2 justify-between items-center">
      <span class="overflow-x-hidden text-ellipsis">{neighbor[0].data.name}</span>

      {#if graph.currentView.nodes.get(neighbor[0].data.id as string)?.inside()}
        <EyeOutline
          class="h-6 w-6 cursor-pointer"
          onclick={() => graph.currentView.hideMethod(neighbor[0].data.id as string)}
        />
      {:else}
        <EyeSlashOutline
          class="h-6 w-6 cursor-pointer"
          onclick={() => showNeighbor(neighbor[0].data.id as string)}
        />
      {/if}
    </ListgroupItem>
  {/each}
</Listgroup>
