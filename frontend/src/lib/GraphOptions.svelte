<script lang="ts">
  import { beforeNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import {
    Accordion,
    AccordionItem,
    Alert,
    Button,
    ButtonGroup,
    Checkbox,
    Helper,
    Input,
    Label,
    Range,
    Select,
    Spinner,
  } from "flowbite-svelte";
  import {
    CheckCircleSolid,
    CloseOutline,
    ExclamationCircleSolid,
    MinusOutline,
    PlusOutline,
  } from "flowbite-svelte-icons";
  import { deduplicate } from "./utils";
  import type Graph from "$lib/graph.svelte";

  const BOUNDING_BOX_SCALING_FACTOR = 0.02;

  interface Props {
    graphs: Record<string, Graph>;
  }

  let { graphs = $bindable() }: Props = $props();

  let currentGraph = $derived(graphs[page.params.name]);
  let views = $derived(currentGraph.views);
  let currentView = $derived(views[currentGraph.viewIndex]);

  let diffSectionOpen: boolean = $state(false);
  let Icon = $derived(currentGraph.diffOk ? CheckCircleSolid : ExclamationCircleSolid);

  let ws: WebSocket;

  const startDiff = () => {
    ws = currentGraph.startDiff();
    ws.onclose = () => {
      showTopEdges(10, true);
      diffSectionOpen = false;
    };
  };

  const cancelDiff = () => {
    ws.send("cancel");
    currentGraph.diffStatus = "cancelling";
  };

  const showTopEdges = async (n: number, newView: boolean = false) => {
    currentGraph.compoundNodesShown = false;
    currentGraph.updateCompoundNodes();
    if (n === 0) {
      currentGraph.closeView(currentGraph.viewIndex);
      return;
    }
    const definitions = await currentGraph.getOrFetchTopEdges(n);
    if (newView) {
      currentGraph.createView(`${currentGraph.name} − ${currentGraph.selectedOtherGraph}`);
    }
    currentView.removeAll(); // TODO: do not remove all
    currentView.add([...deduplicate(definitions.nodes.flat()), ...deduplicate(definitions.edges)]);
    currentView.topEdgesShown = Math.min(n, currentGraph.topEdges.length);
    if (newView) {
      currentView.cy.one("render", () =>
        currentView.resetLayout(true, n * BOUNDING_BOX_SCALING_FACTOR),
      );
    } else {
      currentView.resetLayout(true, n * BOUNDING_BOX_SCALING_FACTOR);
    }
  };

  beforeNavigate(() => (currentGraph.diffMessage = undefined));
</script>

<Checkbox
  bind:checked={currentGraph.compoundNodesShown}
  onchange={() => currentGraph.updateCompoundNodes()}
  class="mb-4"
>
  Compound nodes
</Checkbox>

<!-- Difference calculated -->
{#if currentGraph.otherGraph}
  <Alert color="blue" class="flex flex-col gap-2">
    <p>
      Compared with <span class="font-bold">{currentGraph.otherGraph}</span>
      ({currentGraph.iterations} iter.)
    </p>

    {#if currentView?.topEdgesShown > 0}
      <!-- Top edges are already shown -->
      <div class="flex items-center justify-between gap-2">
        Showing top {currentView.topEdgesShown} edges

        <!-- Edge count selection -->
        <ButtonGroup size="xs">
          <Button
            size="xs"
            class="py-1"
            onclick={() => showTopEdges(Math.max(currentView.topEdgesShown - 5, 0))}
          >
            <MinusOutline class="h-5 w-5" />
          </Button>

          <Button
            size="xs"
            class="py-1"
            onclick={() => showTopEdges(currentView.topEdgesShown + 5)}
          >
            <PlusOutline class="h-5 w-5" />
          </Button>
        </ButtonGroup>
      </div>
    {:else}
      <!-- Top edges are not yet shown -->
      <Button size="xs" color="alternative" onclick={() => showTopEdges(10, true)}>
        Show top 10 edges
      </Button>
    {/if}
  </Alert>
{/if}

<!-- Diff calculation section -->
<Accordion flush onclick={() => (currentGraph.diffMessage = undefined)}>
  <AccordionItem tag="h4" borderBottomClass="" paddingFlush="" bind:open={diffSectionOpen}>
    <span slot="header">Diff Calculation</span>

    <div class="flex flex-col gap-4 pt-4">
      <!-- Select other graph -->
      <Label>
        Calculate difference

        <Select class="mt-2" bind:value={currentGraph.selectedOtherGraph}>
          {#each Object.values(graphs).filter((graph) => graph !== currentGraph) as graph}
            <option value={graph.name}>{currentGraph.name} − {graph.name}</option>
          {/each}
        </Select>

        {#if currentGraph.otherGraph && currentGraph.otherGraph !== currentGraph.selectedOtherGraph}
          <Helper class="mt-2 flex items-center gap-2" color="red">
            <ExclamationCircleSolid />
            <p>
              This will overwrite the calculated difference between
              <span class="font-bold">{currentGraph.name}</span>
              and <span class="font-bold">{currentGraph.otherGraph}</span>.
            </p>
          </Helper>
        {/if}
      </Label>

      <!-- Max iterations slider -->
      <div class="flex items-end">
        <Label>
          Maximum iterations
          <Range
            class="mt-2"
            min="2000"
            max="100000"
            step="2000"
            bind:value={currentGraph.selectedMaxIterations}
          />
        </Label>
        <span class="min-w-16 text-center">{currentGraph.selectedMaxIterations}</span>
      </div>

      <ButtonGroup>
        <Button
          color="primary"
          class="flex-grow"
          onclick={startDiff}
          disabled={currentGraph.diffStatus !== undefined || !currentGraph.selectedOtherGraph}
        >
          {#if currentGraph.diffStatus}
            <Spinner class="me-3" size="4" color="white" />
            {#if currentGraph.diffStatus === "cancelling"}
              Cancelling
            {:else if currentGraph.diffStatus === "saving"}
              Saving
            {:else}
              {currentGraph.currentIterations} iterations
            {/if}
          {:else}
            {currentGraph.otherGraph === currentGraph.selectedOtherGraph
              ? "Recalculate"
              : "Calculate"}
          {/if}
        </Button>

        {#if currentGraph.diffStatus}
          <Button
            color="red"
            onclick={cancelDiff}
            disabled={currentGraph.diffStatus !== "calculating"}
          >
            <CloseOutline />
          </Button>
        {/if}
      </ButtonGroup>
    </div>
  </AccordionItem>
</Accordion>

{#if currentGraph.diffMessage}
  <Alert color={currentGraph.diffOk ? "green" : "red"}>
    <Icon slot="icon" />
    {currentGraph.diffMessage}
  </Alert>
{/if}
