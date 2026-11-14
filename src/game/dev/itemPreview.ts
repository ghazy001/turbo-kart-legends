import { itemDefinitions, type ItemId } from '../config/itemConfig';

/** App calls this only in development. A labeled fixture, never an inventory/pose injection. */
export function previewItemReward(search: string): ItemId | undefined {
  const query = new URLSearchParams(search);
  if (!query.has('race-preview') || !query.has('item-preview')) return undefined;
  return Object.values(itemDefinitions).find(item => item.id === query.get('item-reward'))?.id;
}
