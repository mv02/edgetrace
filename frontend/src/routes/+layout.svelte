<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { Navbar, NavBrand, NavLi, NavUl } from "flowbite-svelte";

  let { data, children } = $props();
</script>

<Navbar fluid color="gray">
  <NavBrand href="/">
    <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
      Diff Tool
    </span>
  </NavBrand>
  <NavUl activeUrl={page.url.pathname}>
    {#each Object.values(data.graphs) as graph}
      <NavLi href="/graphs/{graph.name}">{graph.name}</NavLi>
    {/each}
    <NavLi href="/manage">Manage</NavLi>
  </NavUl>
</Navbar>

{@render children()}
