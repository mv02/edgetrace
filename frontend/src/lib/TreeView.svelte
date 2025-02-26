<script lang="ts">
  import { PUBLIC_API_URL } from "$env/static/public";
  import { Accordion, AccordionItem } from "flowbite-svelte";
  import { ChevronDownOutline, ChevronUpOutline } from "flowbite-svelte-icons";
  import { addView } from "$lib/view.svelte";
  import View from "$lib/view.svelte";
  import TreeView from "$lib/TreeView.svelte";
  import type { GraphContext } from "$lib/types";

  interface Props {
    tree: Object;
    graphs: Record<string, GraphContext>;
    graphName: string;
    level?: number;
  }

  let { tree, graphs = $bindable(), graphName, level = 0 }: Props = $props();

  const findMethod = async (id: number) => {
    const response = await fetch(`${PUBLIC_API_URL}/graphs/${graphName}/method/${id}`);
    const data = await response.json();
    addView(graphs[graphName], new View(data, data[0].data.Name));
    graphs[graphName].viewIndex = 0;
  };
</script>

<Accordion flush multiple --padding="{level * 8}px" class="flex flex-col">
  {#each Object.entries(tree) as [key, content]}
    {#if Object.keys(content).length === 0}
      <!-- No children, content is method ID -->
      <button
        onclick={() => findMethod(content)}
        class="overflow-hidden text-left text-sm text-gray-500 hover:overflow-visible hover:bg-gray-100 dark:text-gray-400 hover:dark:bg-gray-800"
      >
        {key}
      </button>
    {:else}
      <!-- Children present, traverse to next level -->
      <AccordionItem tag="h4" paddingFlush="">
        <span slot="header" class="overflow-hidden text-nowrap text-sm hover:overflow-visible">
          {key}
        </span>

        <span slot="arrowdown">
          <ChevronDownOutline class="w-6" />
        </span>

        <span slot="arrowup">
          <ChevronUpOutline class="w-6" />
        </span>

        <TreeView tree={content} bind:graphs {graphName} level={level + 1} />
      </AccordionItem>
    {/if}
  {/each}
</Accordion>

<style>
  span[slot="header"],
  button {
    padding-left: var(--padding);
  }
</style>
