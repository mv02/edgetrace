<script lang="ts">
  import { invalidate } from "$app/navigation";
  import { PUBLIC_API_URL } from "$env/static/public";
  import {
    Alert,
    Button,
    Card,
    Fileupload,
    Helper,
    Input,
    Label,
    Listgroup,
    Spinner,
  } from "flowbite-svelte";
  import { CheckCircleSolid, ExclamationCircleSolid } from "flowbite-svelte-icons";
  import type { GraphInfo } from "$lib/types";
  import type { LayoutProps } from "../$types";

  let { data }: LayoutProps = $props();

  let selectedGraph: GraphInfo | undefined = $state();
  let deleteLoading: boolean = $state(false);
  let deleteOk: boolean = $state(false);
  let DeleteMessageIcon = $derived(deleteOk ? CheckCircleSolid : ExclamationCircleSolid);
  let deleteMessage: string | undefined = $state();

  let graphName: string | undefined = $state();
  let files: FileList | undefined = $state();
  let importLoading: boolean = $state(false);
  let importOk: boolean = $state(false);
  let ImportMessageIcon = $derived(importOk ? CheckCircleSolid : ExclamationCircleSolid);
  let importMessage: string | undefined = $state();

  const deleteGraph = async () => {
    if (!selectedGraph) return;
    deleteMessage = undefined;
    importMessage = undefined;
    deleteLoading = true;
    try {
      const resp = await fetch(`${PUBLIC_API_URL}/graphs/${selectedGraph.name}`, {
        method: "DELETE",
      });
      deleteOk = resp.ok;
      deleteMessage = (await resp.json()).message;
      invalidate(`${PUBLIC_API_URL}/graphs`);
    } catch {
      deleteOk = false;
      deleteMessage = "Deleting call graph failed";
    }
    deleteLoading = false;
    selectedGraph = undefined;
  };

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    deleteMessage = undefined;
    importMessage = undefined;
    importLoading = true;
    const formData = new FormData();
    formData.append("graph", graphName ?? "graph-1");
    for (const file of files as FileList) {
      formData.append("files", file, file.name);
      formData.append("timestamps", file.lastModified.toString());
    }
    try {
      const resp = await fetch(`${PUBLIC_API_URL}/import`, { method: "POST", body: formData });
      importOk = resp.ok;
      importMessage = (await resp.json()).message;
      invalidate(`${PUBLIC_API_URL}/graphs`);
    } catch {
      importOk = false;
      importMessage = "Importing call graph failed";
    }
    importLoading = false;
  }
</script>

<main class="container mx-auto p-8">
  <h1>Manage Graphs</h1>

  <div class="flex justify-between gap-12">
    <section class="flex-grow">
      <h2>Available Call Graphs ({Object.keys(data.graphs).length})</h2>

      <div class="flex items-start gap-12">
        {#if Object.keys(data.graphs).length > 0}
          <Listgroup
            active
            items={Object.values(data.graphs).map((graph) => ({
              ...graph,
              current: graph.name === selectedGraph?.name,
            }))}
            let:item
            on:click={(e) => (selectedGraph = e.detail)}
            class="w-80"
          >
            {item.name}
          </Listgroup>
        {:else}
          <div class="w-80"></div>
        {/if}

        {#if selectedGraph}
          <Card class="flex flex-col gap-4">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              <i class="nf nf-md-graph_outline"></i>
              {selectedGraph.name}
            </h3>

            <p class="text-gray-500 dark:text-gray-400">
              {selectedGraph.nodeCount} nodes, {selectedGraph.edgeCount} edges
            </p>

            <div class="flex justify-between">
              <Button href="/graphs/{selectedGraph.name}" disabled={deleteLoading}>View</Button>
              <Button color="red" onclick={deleteGraph} disabled={deleteLoading}>
                {#if deleteLoading}
                  <Spinner class="me-3" size="4" color="white" />
                {/if}
                Delete
              </Button>
            </div>
          </Card>
        {:else if deleteMessage}
          <Alert color={deleteOk ? "green" : "red"}>
            <DeleteMessageIcon slot="icon" />
            {deleteMessage}
          </Alert>
        {/if}
      </div>
    </section>

    <form onsubmit={submit}>
      <h2>Import Call Graph</h2>

      <div class="flex flex-col gap-4">
        {#if importMessage}
          <Alert color={importOk ? "green" : "red"}>
            <ImportMessageIcon slot="icon" />
            {importMessage}
          </Alert>
        {/if}

        <div class="flex flex-col gap-2">
          <Label for="name">Call graph name</Label>
          <Input id="name" placeholder="graph-1" bind:value={graphName} disabled={importLoading} />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="files">Reports directory</Label>
          <div class="flex gap-2">
            <Fileupload
              id="files"
              webkitdirectory
              required
              multiple
              bind:files
              disabled={importLoading}
            />
            <Button type="submit" disabled={importLoading || !files || files.length < 3}>
              {#if importLoading}
                <Spinner class="me-3" size="4" color="white" />
              {/if}
              Import
            </Button>
          </div>
          <Helper>At least 3 CSV files (methods, invokes and targets).</Helper>
        </div>
      </div>
    </form>
  </div>
</main>

<svelte:head>
  <title>Graphs | Diff Tool</title>
</svelte:head>
