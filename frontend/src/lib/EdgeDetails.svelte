<script lang="ts">
  import { Badge } from "flowbite-svelte";
  import DataField from "./DataField.svelte";
  import type { EdgeSingular } from "cytoscape";

  interface Props {
    edge: EdgeSingular;
  }

  let { edge }: Props = $props();
</script>

<div class="flex gap-2">
  <Badge>Edge {edge.data("id")}</Badge>
</div>

<DataField label="Source">{edge.source().data("name")}</DataField>
<DataField label="Target">{edge.target().data("name")}</DataField>

{#if edge.data("value") !== null}
  <DataField label="Difference Value">
    {edge.data("value")}
    {#if edge.data("value") > 0 && !edge.data("relevant")}
      <br />(source node not in the other graph)
    {/if}
  </DataField>
{/if}
