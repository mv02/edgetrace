<script lang="ts">
  import { Badge, ButtonGroup, RadioButton } from "flowbite-svelte";
  import DataField from "./DataField.svelte";
  import MethodNeighbors from "./MethodNeighbors.svelte";
  import type Graph from "./graph.svelte";

  interface Props {
    graph: Graph;
  }

  let { graph }: Props = $props();
  let currentView = $derived(graph.currentView);
  let node = $derived(currentView.selectedNode);

  let tab: "properties" | "callers" | "callees" = $state("properties");
</script>

{#if node}
  <div class="flex gap-2">
    {#if node.data("is_entrypoint")}
      <Badge color="green">Entrypoint</Badge>
    {/if}
    <Badge>Method {node.data("id")}</Badge>
  </div>

  <ButtonGroup>
    <RadioButton
      class="flex-grow"
      size="xs"
      color="alternative"
      value="properties"
      bind:group={currentView.methodDetailsTab}
    >
      Properties
    </RadioButton>
    <RadioButton
      class="flex-grow"
      size="xs"
      color="alternative"
      value="callers"
      bind:group={currentView.methodDetailsTab}
    >
      Callers
    </RadioButton>
    <RadioButton
      class="flex-grow"
      size="xs"
      color="alternative"
      value="callees"
      bind:group={currentView.methodDetailsTab}
    >
      Callees
    </RadioButton>
  </ButtonGroup>

  {#if currentView.methodDetailsTab === "properties"}
    <!-- Properties -->
    <DataField label="Class">{node.data("parent_class")}</DataField>
    <DataField label="Name">{node.data("name")}</DataField>

    <DataField label="Parameters ({node.data('parameters').length})">
      <div class="flex flex-col gap-1">
        {#each node.data("parameters") as param}
          <p>{param}</p>
        {:else}
          -
        {/each}
      </div>
    </DataField>

    <DataField label="Return Type">{node.data("return_type")}</DataField>
    <DataField label="Flags">{node.data("flags")}</DataField>
  {:else if currentView.methodDetailsTab === "callers"}
    <!-- Callers -->
    <MethodNeighbors {graph} type="callers" />
  {:else}
    <!-- Callees -->
    <MethodNeighbors {graph} type="callees" />
  {/if}
{/if}
