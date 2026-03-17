import { jsonOk } from '@/lib/api-utils';
import { getAllPurchaseLinks } from '@/lib/app-settings';

export async function GET() {
  const links = await getAllPurchaseLinks();
  return jsonOk({ links });
}
