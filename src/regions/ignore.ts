import { listed } from '@lapxo/topos/capsule';
import type { Asked } from '@lapxo/topos/capsule';

/** The ignore region. It answers what a repository never holds, one line each. */
export const render = (asked: Asked): readonly string[] => listed(asked, 'ignore');
