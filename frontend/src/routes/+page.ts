import type { PageLoad } from "./$types";
import { PUBLIC_API_URL } from "$env/static/public";

export const load: PageLoad = async ({ fetch }) => {
  const tree: Promise<Object> = fetch(`${PUBLIC_API_URL}/tree`).then((res) => res.json());
  return { tree };
};
