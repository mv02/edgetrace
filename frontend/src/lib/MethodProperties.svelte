<script lang="ts">
  import { Badge } from "flowbite-svelte";
  import DataField from "./DataField.svelte";
  import type { NodeSingular } from "cytoscape";

  interface Props {
    node: NodeSingular;
  }

  let { node }: Props = $props();
  let parameters = node.data("Parameters") === "empty" ? [] : node.data("Parameters").split(" ");
</script>

<div class="flex gap-2">
  {#if node.data("IsEntryPoint") === "true"}
    <Badge color="green">Entrypoint</Badge>
  {/if}
  <Badge>Method {node.data("Id")}</Badge>
</div>

<DataField label="Class">{node.data("Type")}</DataField>
<DataField label="Name">{node.data("Name")}</DataField>

<DataField label="Parameters ({parameters.length})">
  <div class="flex flex-col gap-1">
    {#each parameters as param}
      <p>{param}</p>
    {:else}
      -
    {/each}
  </div>
</DataField>

<DataField label="Return Type">{node.data("Return")}</DataField>
<DataField label="Flags">{node.data("Flags")}</DataField>
