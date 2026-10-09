import { value, type Asked } from '@lapxo/topos/capsule';
import { fields, steps } from '@lapxo/topos/wire';

/** A key of the place's pipeline: its own line, else the default the wire gives every world. */
export const said = (asked: Asked, key: string): string => value(asked, `pipeline/${key}`) ?? new Map(fields(value(asked, 'wire/pipeline/world') ?? value(asked, 'audit/wire/pipeline/world') ?? '')).get(key) ?? '';

export const workflow = (shape: string): string => {
  const file = steps(shape).at(-1) ?? '';
  const dot = file.lastIndexOf('.');
  return dot > 0 ? file.slice(0, dot) : file;
};
