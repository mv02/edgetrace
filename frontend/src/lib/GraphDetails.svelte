<script lang="ts">
  import { ButtonGroup, Listgroup, ListgroupItem, RadioButton } from "flowbite-svelte";
  import {
    ArrowLeftToBracketOutline,
    ArrowRightToBracketOutline,
    EyeOutline,
    EyeSlashOutline,
  } from "flowbite-svelte-icons";
  import DataField from "./DataField.svelte";
  import type Graph from "./graph.svelte";
  import type { EdgeWithNodesDefinition } from "./types";
  import type { EdgeDefinition, NodeDefinition } from "cytoscape";

  interface Props {
    graph: Graph;
  }

  let { graph }: Props = $props();
  let currentView = $derived(graph.currentView);
  let edgesWithNodes: EdgeWithNodesDefinition[] = $derived(
    graph.topEdges.map((edgeId) => {
      const edge = graph.edgeDefinitions.get(edgeId) as EdgeDefinition;
      const sourceWithParents = graph.nodeDefinitions.get(edge.data.source) as NodeDefinition[];
      const targetWithParents = graph.nodeDefinitions.get(edge.data.target) as NodeDefinition[];
      return { source: sourceWithParents[0], target: targetWithParents[0], edge };
    }),
  );

  const showEdge = (edgeId: string) => {
    if (!currentView) {
      graph.createView(edgeId);
      graph.viewIndex = 0;
    }
    currentView.showEdge(edgeId, true);
  };
</script>

{#if graph.otherGraph}
  <ButtonGroup>
    <RadioButton
      class="flex-grow"
      size="xs"
      color="alternative"
      value="properties"
      bind:group={graph.graphDetailsTab}
    >
      Properties
    </RadioButton>
    <RadioButton
      class="flex-grow"
      size="xs"
      color="alternative"
      value="edges"
      bind:group={graph.graphDetailsTab}
    >
      Edges
    </RadioButton>
  </ButtonGroup>
{/if}

{#if graph.graphDetailsTab === "properties"}
  <!-- Properties -->
  <DataField label="Name">{graph.name}</DataField>

  <div class="flex">
    <DataField class="w-1/2" label="Nodes">{graph.nodeCount}</DataField>
    <DataField class="w-1/2" label="Edges">{graph.edgeCount}</DataField>
  </div>
{:else}
  <!-- Edges -->
  <span class="text-sm">Top {graph.topEdges.length} edges</span>

  <Listgroup defaultClass="overflow-y-auto">
    {#each edgesWithNodes as { source, target, edge }}
      <ListgroupItem normalClass="flex gap-2 justify-between items-center">
        <div class="overflow-x-hidden">
          <p class="font-bold">{edge.data.value.toFixed(4)}</p>
          <p class="overflow-x-hidden text-ellipsis whitespace-nowrap">
            <ArrowRightToBracketOutline class="inline h-4 w-4" />
            {source.data.name}
          </p>
          <p class="overflow-x-hidden text-ellipsis whitespace-nowrap">
            <ArrowLeftToBracketOutline class="inline h-4 w-4" />
            {target.data.name}
          </p>
        </div>

        {#if currentView?.edges.get(edge.data.id as string)?.inside()}
          <EyeOutline
            class="h-6 w-6 cursor-pointer"
            onclick={() => currentView.hideEdge(edge.data.id as string)}
          />
        {:else}
          <EyeSlashOutline
            class="h-6 w-6 cursor-pointer"
            onclick={() => showEdge(edge.data.id as string)}
          />
        {/if}
      </ListgroupItem>
    {/each}
  </Listgroup>
{/if}
