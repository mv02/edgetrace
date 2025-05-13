<!--
  File: frontend/src/routes/graphs/[name]/+page.svelte
  Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
  Description: Page for viewing the given call graph.
-->

<script lang="ts">
  import { onMount } from "svelte";
  import { beforeNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import { Button, ButtonGroup, Hr, RadioButton, Search, Spinner } from "flowbite-svelte";
  import { CloseOutline } from "flowbite-svelte-icons";
  import EdgeDetails from "$lib/EdgeDetails.svelte";
  import Graph from "$lib/graph.svelte";
  import GraphDetails from "$lib/GraphDetails.svelte";
  import GraphOptions from "$lib/GraphOptions.svelte";
  import MethodDetails from "$lib/MethodDetails.svelte";
  import TreeView from "$lib/TreeView.svelte";

  let { data } = $props();

  let container: HTMLElement;

  /** All graphs identified by their name. */
  let graphs: Record<string, Graph> = $state(
    Object.fromEntries(Object.entries(data.graphs).map(([name, info]) => [name, new Graph(info)])),
  );
  /** The current graph. */
  let currentGraph = $derived(graphs[page.params.name]);
  /** The currently selected view. */
  let currentView = $derived(currentGraph.currentView);

  $effect(() => {
    for (const view of currentGraph.views) {
      view.detach();
    }
    currentView?.attach(container);
  });

  onMount(() => {
    // Set initial graph colors
    const darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    for (const graph of Object.values(graphs)) graph.setColors(darkMode);

    // Automatically set light/dark graph colors
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => currentGraph.setColors(e.matches));
  });

  beforeNavigate(() => currentView?.detach());
</script>

<main class="flex">
  <aside
    class="flex flex-col gap-4 overflow-y-auto border-r-2 border-r-gray-200 p-4 lg:w-80 dark:border-r-gray-800"
  >
    <Button onclick={() => currentView?.resetLayout()}>Reset layout</Button>

    {#if currentGraph}
      <h3>Method Tree</h3>
      <Search clearable bind:value={currentGraph.searchQuery} />
      {#await data.tree}
        <Spinner class="mx-auto" color="blue" />
      {:then result}
        <TreeView
          tree={result}
          graphName={page.params.name}
          bind:graphs
          searchQuery={graphs[page.params.name].searchQuery}
        />
      {/await}
    {/if}
  </aside>

  <div class="relative flex-grow">
    <section class="h-full w-full" bind:this={container}></section>
    <footer class="absolute bottom-0 flex flex-wrap gap-2 p-2">
      {#each currentGraph.views as view, i}
        <ButtonGroup size="sm">
          <RadioButton
            value={i}
            bind:group={currentGraph.viewIndex}
            color="primary"
            class="px-2 py-1"
          >
            {view.title}
          </RadioButton>
          <Button
            onclick={() => currentGraph.closeView(i)}
            color="primary"
            class="cursor-default px-1 py-0"
          >
            <CloseOutline class="h-4 w-4" />
          </Button>
        </ButtonGroup>
      {/each}
    </footer>
  </div>

  <aside class="flex flex-col border-l-2 border-l-gray-200 p-4 lg:w-80 dark:border-l-gray-800">
    {#if currentGraph}
      <div class="flex flex-col gap-4">
        <h3>Graph Options</h3>
        <GraphOptions bind:graphs />
      </div>
    {/if}

    <Hr />

    <div class="flex flex-col gap-4 overflow-y-auto">
      {#if currentView?.selectedNode}
        <h3>Method Details</h3>
        <MethodDetails graph={currentGraph} />
      {:else if currentView?.selectedEdge}
        <h3>Edge Details</h3>
        <EdgeDetails edge={currentView.selectedEdge} />
      {:else}
        <h3>Graph Details</h3>
        <GraphDetails graph={currentGraph} />
      {/if}
    </div>
  </aside>
</main>

<svelte:head>
  <title>{currentGraph.name} – EdgeTrace</title>
</svelte:head>
