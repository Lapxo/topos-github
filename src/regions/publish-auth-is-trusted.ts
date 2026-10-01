import { counted, value, type Asked } from '@lapxo/topos/capsule';
import { said } from '../helpers/pipeline.ts';

/** The publish-auth-is-trusted region. It answers whether a publish still names a secret. */
export const receipt = (asked: Asked) => counted(asked, 'tokens', (value(asked, 'pipeline/publish/auth') ?? said(asked, 'publish/auth')).includes(':') ? 1 : 0, 'count');
