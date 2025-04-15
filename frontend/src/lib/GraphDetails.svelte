<script lang="ts">
  import DataField from "./DataField.svelte";
  import type Graph from "./graph.svelte";

  interface Props {
    graph: Graph;
  }

  let { graph }: Props = $props();
</script>

<DataField label="Name">{graph.name}</DataField>

<div class="flex">
  <DataField class="w-1/2" label="Nodes">{graph.nodeCount}</DataField>
  <DataField class="w-1/2" label="Edges">{graph.edgeCount}</DataField>
</div>
