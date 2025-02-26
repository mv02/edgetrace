import { PUBLIC_API_URL } from "$env/static/public";
import type { PageLoad } from "./$types";
import type { Tree } from "$lib/types";

export const load: PageLoad = async ({ fetch, params }) => {
  const tree: Promise<Tree> = fetch(`${PUBLIC_API_URL}/graphs/${params.name}/tree`).then((res) =>
    res.json(),
  );
  return { tree };
};
