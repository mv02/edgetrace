<script lang="ts">
  import { Badge } from "flowbite-svelte";
  import DataField from "./DataField.svelte";
  import type { NodeSingular } from "cytoscape";

  interface Props {
    node: NodeSingular;
  }

  let { node }: Props = $props();
</script>

<div class="flex gap-2">
  {#if node.data("is_entrypoint")}
    <Badge color="green">Entrypoint</Badge>
  {/if}
  <Badge>Method {node.data("id")}</Badge>
</div>

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
