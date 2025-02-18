<script lang="ts">
  import { contexts } from "$lib/state.svelte";
  import { PUBLIC_API_URL } from "$env/static/public";
  import type { PageProps } from "./$types";
  import DataField from "$lib/DataField.svelte";
  import TreeView from "$lib/TreeView.svelte";
  import { Button, RadioButton, Spinner } from "flowbite-svelte";

  let { data }: PageProps = $props();

  let container: HTMLElement;

  let ctxIndex = $state(0);
  let ctx = $derived(contexts[ctxIndex]);

  $effect(() => {
    for (const context of contexts) {
      context.detach();
    }
    ctx?.attach(container);
  });

  const clear = async () => {
    ctx?.destroy();
    contexts.splice(ctxIndex, 1);
    if (ctxIndex >= contexts.length) {
      ctxIndex = Math.max(contexts.length - 1, 0);
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
      <TreeView tree={result} bind:ctxIndex />
    {/await}
  </aside>

  <div class="flex-grow">
    <section class="h-full w-full overflow-hidden" bind:this={container}></section>
    <footer class="absolute bottom-0 flex gap-2 p-2">
      {#each contexts as context, i}
        <RadioButton value={i} bind:group={ctxIndex} size="sm">{context.title}</RadioButton>
      {/each}
    </footer>
  </div>

  <aside
    class="flex flex-col gap-4 border-l-2 border-l-gray-200 p-4 lg:w-80 dark:border-l-gray-800"
  >
    {#if ctx?.selectedNode}
      <h3>Method Properties</h3>
      {#each ["Type", "Name", "Parameters", "Return", "Id"] as key}
        <DataField label={key}>{ctx.selectedNode.data(key).replaceAll(" ", ", ")}</DataField>
      {/each}
    {/if}
  </aside>
</main>

<svelte:head>
  <title>Diff Tool</title>
</svelte:head>
