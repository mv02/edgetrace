<script lang="ts">
  import { beforeNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import { Button, RadioButton, Spinner } from "flowbite-svelte";
  import DataField from "$lib/DataField.svelte";
  import TreeView from "$lib/TreeView.svelte";
  import type { GraphContext } from "$lib/types";

  let { data } = $props();

  let container: HTMLElement;

  /** All graphs identified by their name. */
  let graphs: Record<string, GraphContext> = $state({});
  /** The current graph. */
  let graph = $derived(graphs[page.params.name] ?? {});
  /** Views of the current graph. */
  let views = $derived(graph?.views ?? []);
  /** Index of the currently selected view. */
  let viewIndex = $derived(graph?.viewIndex ?? 0);
  /** The currently selected view. */
  let view = $derived(views[viewIndex]);

  $effect(() => {
    // Create new graph entry if it doesn't exist
    if (!graphs[page.params.name]) {
      graphs[page.params.name] = { views: [], viewIndex: 0 };
    }
  });

  $effect(() => {
    for (const view of views) {
      view.detach();
    }
    view?.attach(container);
  });

  beforeNavigate(() => view?.detach());

  const clear = async () => {
    view?.destroy();
    graphs[page.params.name].views.splice(viewIndex, 1);
    if (viewIndex >= views.length) {
      graphs[page.params.name].viewIndex = Math.max(views.length - 1, 0);
    }
  };
</script>

<main class="flex">
  <aside
    class="flex flex-col gap-4 overflow-y-auto border-r-2 border-r-gray-200 p-4 lg:w-80 dark:border-r-gray-800"
  >
    <Button onclick={clear}>Clear</Button>

    <h3>Method Tree</h3>
    {#await data.tree}
      <Spinner class="mx-auto" color="blue" />
    {:then result}
      <TreeView tree={result} graphName={page.params.name} bind:graphs />
    {/await}
  </aside>

  <div class="flex-grow">
    <section class="h-full w-full overflow-hidden" bind:this={container}></section>
    <footer class="absolute bottom-0 flex gap-2 p-2">
      {#each views as view, i}
        <RadioButton value={i} bind:group={graphs[page.params.name].viewIndex} size="sm">
          {view.title}
        </RadioButton>
      {/each}
    </footer>
  </div>

  <aside
    class="flex flex-col gap-4 border-l-2 border-l-gray-200 p-4 lg:w-80 dark:border-l-gray-800"
  >
    {#if view?.selectedNode}
      <h3>Method Properties</h3>
      {#each ["Type", "Name", "Parameters", "Return", "Id"] as key}
        <DataField label={key}>{view.selectedNode.data(key).replaceAll(" ", ", ")}</DataField>
      {/each}
    {/if}
  </aside>
</main>

<svelte:head>
  <title>Diff Tool</title>
</svelte:head>
