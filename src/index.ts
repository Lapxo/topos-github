import { receiptShell, shell } from '@lapxo/topos/capsule';
export const render = shell(import.meta.url);
export const receipt = receiptShell(import.meta.url);
