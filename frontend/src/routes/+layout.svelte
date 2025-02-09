<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { Navbar, NavBrand, NavLi, NavUl } from "flowbite-svelte";
  let { children } = $props();
</script>

<Navbar color="gray">
  <NavBrand href="/">
    <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
      Diff Tool
    </span>
  </NavBrand>
  <NavUl activeUrl={page.url.pathname}>
    <NavLi href="/">Call Graph</NavLi>
    <NavLi href="/manage">Manage</NavLi>
  </NavUl>
</Navbar>

{@render children()}
