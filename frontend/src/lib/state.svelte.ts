import View from "$lib/view.svelte";

const MAX_VIEWS = 5;

export let views: View[] = $state([]);

export const addView = (view: View) => {
  if (views.length === MAX_VIEWS) {
    views.pop();
  }
  views.unshift(view);
};
