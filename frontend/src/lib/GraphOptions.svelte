<script lang="ts">
  import { page } from "$app/state";
  import { PUBLIC_API_URL } from "$env/static/public";
  import { Button, ButtonGroup, Checkbox, Label, Range, Select, Spinner } from "flowbite-svelte";
  import { MinusOutline, PlusOutline } from "flowbite-svelte-icons";
  import type Graph from "$lib/graph.svelte";

  const BOUNDING_BOX_SCALING_FACTOR = 0.02;

  interface Props {
    graphs: Record<string, Graph>;
  }

  let { graphs = $bindable() }: Props = $props();

  let currentGraph = $derived(graphs[page.params.name]);
  let views = $derived(currentGraph.views);
  let currentView = $derived(views[currentGraph.viewIndex]);

  let loading = $state(false);

  const calculateDiff = async () => {
    loading = true;
    await currentGraph.calculateDiff();
    loading = false;
    showTopEdges(10, true);
  };

  const showTopEdges = async (n: number, newView: boolean = false) => {
    const edges = await currentGraph.fetchTopEdges(n);
    if (newView) {
      currentGraph.createView(`${currentGraph.name} − ${currentGraph.diffOtherGraph}`);
    }
    currentView.removeAll(); // TODO: do not remove all
    currentView.add(edges);
    currentView.topEdgesShown = n;
    if (newView) {
      currentView.cy.one("render", () =>
        currentView.resetLayout(true, n * BOUNDING_BOX_SCALING_FACTOR),
      );
    } else {
      currentView.resetLayout(true, n * BOUNDING_BOX_SCALING_FACTOR);
    }
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

  {#if currentGraph.diffOtherGraph}
    {#if currentView}
      <div class="flex items-center justify-between">
        Showing top {currentView.topEdgesShown} edges

        <ButtonGroup size="xs">
          <Button
            size="xs"
            class="py-1"
            onclick={() => showTopEdges(Math.max(currentView.topEdgesShown - 5, 0))}
            disabled={currentView.topEdgesShown === 0}
          >
            <MinusOutline class="h-5 w-5" />
          </Button>

          <Button
            size="xs"
            class="py-1"
            onclick={() => showTopEdges(currentView.topEdgesShown + 5)}
          >
            <PlusOutline class="h-5 w-5" />
          </Button>
        </ButtonGroup>
      </div>
    {:else}
      <Button size="xs" color="alternative" onclick={() => showTopEdges(10, true)}>
        Show top 10 edges
      </Button>
    {/if}
  {/if}
</div>
