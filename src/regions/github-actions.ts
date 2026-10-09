import type { Asked } from '@lapxo/topos/capsule';
import { workflow } from '../helpers/pipeline.ts';
import { render as place } from '../helpers/place.ts';

/** The github-actions region. It answers which workflow the shape names, from the place's pipeline lines. */
export const render = (asked: Asked): readonly string[] => {
  const named = workflow(asked.shape);
  const world = asked.lines.some((line) => line['scope'] === 'capsule/key' || line['scope'] === 'wire/pipeline/world' || line['scope'] === 'audit/wire/pipeline/world');
  const runs = !world || asked.lines.some((line) => (line['scope'] ?? '').startsWith('pipeline/'));
  if (runs) return place(asked, named);
  throw Error(`REFUSE·github-actions ${asked.shape} requires declared pipeline lines`);
};
