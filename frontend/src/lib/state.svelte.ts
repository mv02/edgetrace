import Context from "$lib/context.svelte";

const MAX_CONTEXTS = 5;

export let contexts: Context[] = $state([]);

export const addContext = (context: Context) => {
  if (contexts.length === MAX_CONTEXTS) {
    contexts.pop();
  }
  contexts.unshift(context);
};
