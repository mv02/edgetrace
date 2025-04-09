<script lang="ts">
  import { Button, Listgroup, ListgroupItem } from "flowbite-svelte";
  import { EyeOutline, EyeSlashOutline } from "flowbite-svelte-icons";
  import type Graph from "./graph.svelte";
  import type { NodeDefinition } from "cytoscape";

  interface Props {
    graph: Graph;
    type: "callers" | "callees";
  }

  let { graph, type }: Props = $props();

  let node = $derived(graph.currentView.selectedNode);

  let neighbors: NodeDefinition[][] | undefined = $state(
    graph.currentView.selectedNode?.data(type),
  );

  $effect(() => (neighbors = graph.currentView.selectedNode?.data(type)));

  const getAllNeighbors = async () => {
    if (!node) return;
    const definitions = await graph.getOrFetchAllMethodNeighbors(node.id(), type, false);
    node.data(type, definitions.nodes);
    neighbors = definitions.nodes;
  };

  const showNeighbor = (neighborId: string) => {
    if (!node) return;
    graph.currentView.showMethodNeighbor(node.id(), type, neighborId);
  };
</script>

<div class="flex items-center justify-between">
  <span class="text-sm">
    {neighbors?.length ?? "Unknown"}
    {type}
  </span>

  {#if !neighbors}
    <Button size="xs" color="alternative" onclick={() => getAllNeighbors()}>Fetch</Button>
  {:else}
    <Button size="xs" color="alternative">Show all</Button>
  {/if}
</div>

<Listgroup defaultClass="overflow-y-auto">
  {#each neighbors ?? [] as neighbor}
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
