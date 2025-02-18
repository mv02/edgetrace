import { PUBLIC_API_URL } from "$env/static/public";
import type { PageLoad } from "./$types";

type Tree = {
  [key: string]: number | Tree;
};

export const load: PageLoad = async ({ fetch, params }) => {
  const tree: Promise<Tree> = fetch(`${PUBLIC_API_URL}/graphs/${params.name}/tree`).then((res) =>
    res.json(),
  );
  return { tree };
};
