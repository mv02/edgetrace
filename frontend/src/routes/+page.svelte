<script lang="ts">
  import { cy } from "$lib/state.svelte";
  import { onMount } from "svelte";
  import { PUBLIC_API_URL } from "$env/static/public";
  import type { PageProps } from "./$types";
  import DataField from "$lib/DataField.svelte";
  import TreeView from "$lib/TreeView.svelte";
  import { Button, Spinner } from "flowbite-svelte";

  let { data }: PageProps = $props();
  const { tree }: { tree: Promise<Object> } = data;

  let container: HTMLElement;
  let selectedNode: cytoscape.NodeSingular | undefined = $state();

  onMount(() => {
    cy.mount(container);
    cy.on("tap", "node", (e: cytoscape.EventObject) => {
      selectedNode = e.target;
    });
  });


  const clear = async () => {
    cy.removeAll();
    selectedNode = undefined;
  };
</script>

<main class="flex">
  <aside
    class="flex flex-col gap-4 overflow-y-auto border-r-2 border-r-gray-200 p-4 lg:w-80 dark:border-r-gray-800"
  >
    <Button onclick={clear}>Clear</Button>

    <h3>Method Tree</h3>
    {#await tree}
      <Spinner class="mx-auto" color="blue" />
    {:then result}
      <TreeView tree={result} />
    {/await}
  </aside>

  <section class="flex-grow overflow-hidden" bind:this={container}></section>

  <aside
    class="flex flex-col gap-4 border-l-2 border-l-gray-200 p-4 lg:w-80 dark:border-l-gray-800"
  >
    {#if selectedNode}
      <h3>Method Properties</h3>
      {#each ["Type", "Name", "Parameters", "Return", "Id"] as key}
        <DataField label={key}>{selectedNode.data(key).replaceAll(" ", ", ")}</DataField>
      {/each}
    {/if}
  </aside>
</main>

<svelte:head>
  <title>Diff Tool</title>
</svelte:head>
