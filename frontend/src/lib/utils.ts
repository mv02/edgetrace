/**
 * File: frontend/src/lib/utils.ts
 * Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
 * Description: Utility functions for manipulating element definitions.
 */

import type { ElementDefinition } from "cytoscape";

export const deduplicate = (elements: ElementDefinition[]) => {
  const seen = new Set<string>();

  return elements.filter((ele) => {
    const id = ele.data.id as string;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export const clone = (elements: ElementDefinition[]): ElementDefinition[] => {
  return elements.map((ele) => ({ group: ele.group, data: { ...ele.data } }));
};
