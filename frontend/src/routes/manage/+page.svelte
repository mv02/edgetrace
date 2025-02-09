<script lang="ts">
  import { PUBLIC_API_URL } from "$env/static/public";
  import { Alert, Button, Fileupload, Helper, Label, Spinner } from "flowbite-svelte";
  import { CheckCircleSolid } from "flowbite-svelte-icons";

  let files: FileList | undefined = $state();
  let loading = $state(false);
  let message: string | undefined = $state();

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    const formData = new FormData();
    for (const file of files as FileList) {
      formData.append("files", file, file.name);
    }
    const resp = await fetch(`${PUBLIC_API_URL}/import`, { method: "POST", body: formData });
    const data = await resp.json();
    message = data.message;
    loading = false;
  }
</script>

<main class="container mx-auto flex flex-col items-start gap-4 p-8">
  <h1>Manage Databases</h1>
  {#if message}
    <Alert color="green">
      <CheckCircleSolid slot="icon" />
      {message}
    </Alert>
  {/if}
  <form onsubmit={submit} class="flex flex-col gap-2">
    <Label for="files">Import call graph</Label>
    <div class="flex gap-2">
      <Fileupload id="files" required multiple bind:files disabled={loading} />
      <Button type="submit" disabled={loading || !files || files.length !== 3}>
        {#if loading}
          <Spinner class="me-3" size="4" color="white" />
        {/if}
        Import
      </Button>
    </div>
    <Helper>3 CSV files with methods, invokes and targets.</Helper>
  </form>
</main>

<svelte:head>
  <title>Databases | Diff Tool</title>
</svelte:head>
