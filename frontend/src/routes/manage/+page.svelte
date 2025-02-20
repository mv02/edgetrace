<script lang="ts">
  import { invalidate } from "$app/navigation";
  import { PUBLIC_API_URL } from "$env/static/public";
  import { Alert, Button, Fileupload, Helper, Input, Label, Spinner } from "flowbite-svelte";
  import { CheckCircleSolid, ExclamationCircleSolid } from "flowbite-svelte-icons";

  let graphName: string | undefined = $state();
  let files: FileList | undefined = $state();
  let loading = $state(false);
  let ok = $state(false);
  let Icon = $derived(ok ? CheckCircleSolid : ExclamationCircleSolid);
  let message: string | undefined = $state();

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    const formData = new FormData();
    formData.append("graph", graphName ?? "graph-1");
    for (const file of files as FileList) {
      formData.append("files", file, file.name);
      formData.append("timestamps", file.lastModified.toString());
    }
    const resp = await fetch(`${PUBLIC_API_URL}/import`, { method: "POST", body: formData });
    ok = resp.ok;
    const data = await resp.json();
    message = data.message;
    loading = false;
    invalidate(`${PUBLIC_API_URL}/graphs`);
  }
</script>

<main class="container mx-auto flex flex-col items-start gap-4 p-8">
  <h1>Manage Databases</h1>

  <h2>Import Call Graph</h2>

  {#if message}
    <Alert color={ok ? "green" : "red"}>
      <Icon slot="icon" />
      {message}
    </Alert>
  {/if}

  <form onsubmit={submit} class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <Label for="name">Call graph name</Label>
      <Input id="name" placeholder="graph-1" bind:value={graphName} disabled={loading} />
    </div>
    <div class="flex flex-col gap-2">
      <Label for="files">Reports directory</Label>
      <div class="flex gap-2">
        <Fileupload id="files" webkitdirectory required multiple bind:files disabled={loading} />
        <Button type="submit" disabled={loading || !files || files.length < 3}>
          {#if loading}
            <Spinner class="me-3" size="4" color="white" />
          {/if}
          Import
        </Button>
      </div>
      <Helper>At least 3 CSV files (methods, invokes and targets).</Helper>
    </div>
  </form>
</main>

<svelte:head>
  <title>Databases | Diff Tool</title>
</svelte:head>
