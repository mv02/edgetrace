<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    label: string;
    children?: Snippet;
    element?: string;
  }

  const { label, children, element = "h6" }: Props = $props();
</script>

<div class="flex flex-col gap-1">
  <svelte:element this={element} class="text-wrap text-xs font-bold uppercase text-gray-500">
    {label}
  </svelte:element>

  <p class="break-all text-sm">
    {#if children}
      {@render children()}
    {:else}
      -
    {/if}
  </p>
</div>
