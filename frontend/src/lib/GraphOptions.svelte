<script lang="ts">
  import { page } from "$app/state";
  import { Checkbox } from "flowbite-svelte";
  import type { GraphContext } from "./types";

  interface Props {
    graphs: Record<string, GraphContext>;
  }

  let { graphs = $bindable() }: Props = $props();

  let currentGraph = $derived(graphs[page.params.name]);
  let views = $derived(currentGraph.views);
</script>

<Checkbox
  bind:checked={currentGraph.compoundNodesShown}
  onchange={() => views.forEach((v) => v.toggleCompoundNodes())}
>
  Compound nodes
</Checkbox>
