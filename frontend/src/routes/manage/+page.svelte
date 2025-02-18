<script lang="ts">
  import { PUBLIC_API_URL } from "$env/static/public";
  import { Alert, Button, Fileupload, Helper, Label, Spinner } from "flowbite-svelte";
  import { CheckCircleSolid, ExclamationCircleSolid } from "flowbite-svelte-icons";

  let files: FileList | undefined = $state();
  let loading = $state(false);
  let ok = $state(false);
  let Icon = $derived(ok ? CheckCircleSolid : ExclamationCircleSolid);
  let message: string | undefined = $state();

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    const formData = new FormData();
    for (const file of files as FileList) {
      formData.append("files", file, file.name);
      formData.append("timestamps", file.lastModified.toString());
    }
    const resp = await fetch(`${PUBLIC_API_URL}/import`, { method: "POST", body: formData });
    ok = resp.ok;
    const data = await resp.json();
    message = data.message;
    loading = false;
  }
</script>

<main class="container mx-auto flex flex-col items-start gap-4 p-8">
  <h1>Manage Databases</h1>
  {#if message}
    <Alert color={ok ? "green" : "red"}>
      <Icon slot="icon" />
      {message}
    </Alert>
  {/if}
  <form onsubmit={submit} class="flex flex-col gap-2">
    <Label for="files">Import call graph</Label>
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
  </form>
</main>

<svelte:head>
  <title>Databases | Diff Tool</title>
</svelte:head>
