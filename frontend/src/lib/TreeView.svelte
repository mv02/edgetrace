<!--
  File: frontend/src/lib/TreeView.svelte
  Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
  Description: The hierarchical method tree component.
-->

<script lang="ts">
  import { Accordion, AccordionItem } from "flowbite-svelte";
  import { ChevronDownOutline, ChevronUpOutline } from "flowbite-svelte-icons";
  import TreeView from "$lib/TreeView.svelte";
  import type Graph from "$lib/graph.svelte";
  import type { Tree } from "$lib/types";

  /** Maximum number of results to expand the tree. */
  const MAX_EXPAND = 100;

  interface Props {
    tree: Tree;
    graphs: Record<string, Graph>;
    graphName: string;
    level?: number;
    searchQuery?: string;
    expand?: boolean;
  }

  let {
    tree,
    graphs = $bindable(),
    graphName,
    level = 0,
    searchQuery = "",
    expand,
  }: Props = $props();

  let graph = $derived(graphs[graphName]);
  let filtered = $derived.by(() => filterTree(tree));
  let open = $derived(level === 0 ? filtered.count <= MAX_EXPAND : expand);

  const filterTree = (node: Tree): { tree: Tree; count: number } => {
    let result: Tree = {};
    let matchingMethod = false;
    let count = 0;
    for (const [key, content] of Object.entries(node)) {
      if (typeof content === "string") {
        // Method
        if (key.toLowerCase().includes(searchQuery.toLowerCase())) {
          result[key] = content;
          matchingMethod = true;
          count++;
        }
      } else {
        // Type
        const filteredChild = filterTree(content);
        if (filteredChild.count > 0) {
          result[key] = filteredChild.tree;
          matchingMethod = true;
          count += filteredChild.count;
        }
      }
    }
    return matchingMethod ? { tree: result, count } : { tree: {}, count: 0 };
  };

  const findMethod = (id: string, name: string, newView: boolean = true) => {
    if (newView || graphs[graphName].views.length === 0) {
      // Create new view
      graph.createView(name);
      graph.viewIndex = 0;
    }
    graph.currentView.showMethod(id, true).then(() => graph.currentView.resetLayout());
  };
</script>

<Accordion flush multiple --padding="{level * 8}px" class="flex flex-col">
  {#each Object.entries(filtered.tree) as [key, content]}
    {#if typeof content === "string"}
      <!-- No children, content is method ID -->
      <button
        onclick={(e) => findMethod(content, key, !(e.altKey || e.ctrlKey || e.shiftKey))}
        class="overflow-hidden whitespace-nowrap text-left text-sm text-gray-500 hover:overflow-visible hover:bg-gray-100 dark:text-gray-400 hover:dark:bg-gray-800"
      >
        <i class="nf nf-cod-symbol_method text-indigo-500"></i>
        {key}
      </button>
    {:else}
      <!-- Children present, traverse to next level -->
      <AccordionItem tag="h4" paddingFlush="" {open}>
        <span
          slot="header"
          class="overflow-hidden whitespace-nowrap text-nowrap text-sm hover:overflow-visible"
        >
          <i class="nf nf-cod-symbol_class text-orange-500"></i>
          {key}
        </span>

        <span slot="arrowdown">
          <ChevronDownOutline class="w-6" />
        </span>

        <span slot="arrowup">
          <ChevronUpOutline class="w-6" />
        </span>

        <TreeView
          tree={content}
          bind:graphs
          {graphName}
          level={level + 1}
          {searchQuery}
          expand={open}
        />
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
