<script lang="ts">
  import { page } from "$app/state";
  import { Button, RadioButton, Spinner } from "flowbite-svelte";
  import { views } from "$lib/state.svelte";
  import DataField from "$lib/DataField.svelte";
  import TreeView from "$lib/TreeView.svelte";

  let { data } = $props();

  let container: HTMLElement;

  let viewIndex = $state(0);
  let view = $derived(views[viewIndex]);

  $effect(() => {
    for (const view of views) {
      view.detach();
    }
    view?.attach(container);
  });

  const clear = async () => {
    view?.destroy();
    views.splice(viewIndex, 1);
    if (viewIndex >= views.length) {
      viewIndex = Math.max(views.length - 1, 0);
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
      <TreeView tree={result} graphName={page.params.name} bind:viewIndex />
    {/await}
  </aside>

  <div class="flex-grow">
    <section class="h-full w-full overflow-hidden" bind:this={container}></section>
    <footer class="absolute bottom-0 flex gap-2 p-2">
      {#each views as view, i}
        <RadioButton value={i} bind:group={viewIndex} size="sm">{view.title}</RadioButton>
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
