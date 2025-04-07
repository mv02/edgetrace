<script lang="ts">
  import { page } from "$app/state";
  import { PUBLIC_API_URL } from "$env/static/public";
  import { Button, Checkbox, Label, Range, Select, Spinner } from "flowbite-svelte";
  import type Graph from "$lib/graph.svelte";

  interface Props {
    graphs: Record<string, Graph>;
  }

  let { graphs = $bindable() }: Props = $props();

  let currentGraph = $derived(graphs[page.params.name]);

  let loading = $state(false);

  const calculateDiff = async () => {
    loading = true;
    await fetch(
      `${PUBLIC_API_URL}/graphs/${page.params.name}/diff/${currentGraph.diffOtherGraph}?max_iterations=${currentGraph.diffMaxIterations}`,
      { method: "POST" },
    );
    loading = false;
    getTopEdges(10);
  };

  const getTopEdges = async (n: number) => {
    const resp = await fetch(`${PUBLIC_API_URL}/graphs/${currentGraph.name}/diff/edges?n=${n}`);
    const data = await resp.json();
    currentGraph.createView(data, `${currentGraph.name} − ${currentGraph.diffOtherGraph}`);
  };
</script>

<Checkbox
  bind:checked={currentGraph.compoundNodesShown}
  onchange={() => currentGraph.updateCompoundNodes()}
  class="mb-4"
>
  Compound nodes
</Checkbox>

<div class="flex flex-col gap-4">
  <Label>
    Calculate difference
    <Select class="mt-2" bind:value={currentGraph.diffOtherGraph}>
      {#each Object.values(graphs).filter((graph) => graph !== currentGraph) as graph}
        <option value={graph.name}>{currentGraph.name} − {graph.name}</option>
      {/each}
    </Select>
  </Label>

  <div class="flex items-end">
    <Label>
      Maximum iterations
      <Range
        class="mt-2"
        min="200"
        max="10000"
        step="200"
        bind:value={currentGraph.diffMaxIterations}
      />
    </Label>
    <span class="min-w-16 text-center">{currentGraph.diffMaxIterations}</span>
  </div>

  <Button onclick={calculateDiff} disabled={loading || !currentGraph.diffOtherGraph}>
    {#if loading}
      <Spinner class="me-3" size="4" color="white" />
    {/if}
    Diff
  </Button>
</div>
