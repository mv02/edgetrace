<!--
  File: frontend/src/routes/+page.ts
  Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
  Description: Front page displaying the dashboard.
-->

<script lang="ts">
  import { Card } from "flowbite-svelte";

  let { data } = $props();
</script>

<main class="container mx-auto grid auto-rows-min grid-cols-4 gap-4 p-8">
  {#each Object.values(data.graphs) as graph}
    <Card href="/graphs/{graph.name}">
      <h2 class="mb-4 font-semibold text-gray-900 dark:text-white">
        <i class="nf nf-md-graph_outline"></i>
        {graph.name}
      </h2>
      <p>{graph.nodeCount} nodes, {graph.edgeCount} edges</p>
    </Card>
  {/each}
</main>

<svelte:head>
  <title>EdgeTrace</title>
</svelte:head>
