import { value, type Asked } from '@lapxo/topos/capsule';
import { fields } from '@lapxo/topos/wire';

/** A key of the place's pipeline: its own line, else the default the wire gives every world. */
export const said = (asked: Asked, key: string): string => value(asked, `pipeline/${key}`) ?? new Map(fields(value(asked, 'audit/wire/pipeline/world') ?? '')).get(key) ?? '';
