import type { Asked } from '@lapxo/topos/capsule';
import { said, workflow } from '../helpers/pipeline.ts';
import { render as place } from '../helpers/place.ts';
import { release as worldRelease } from '../helpers/world.ts';

/** The github-actions region. It answers which workflow the shape names, from the place's pipeline lines. */
export const render = (asked: Asked): readonly string[] => {
  const named = workflow(asked.shape);
  const world = asked.lines.some((line) => line['scope'] === 'capsule/key');
  const runs = !world || asked.lines.some((line) => (line['scope'] ?? '').startsWith('pipeline/'));
  if (runs) return place(asked, named);
  if (named === 'release') return worldRelease(said(asked, 'branch'), said(asked, 'runtime'), said(asked, 'version'));
  return [`REFUSE·github-actions: no workflow of the forge is named by ${asked.shape}`];
};
