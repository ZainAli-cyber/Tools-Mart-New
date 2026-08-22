import type { AccountMeta } from '../lib/accountStore';

export interface ResellerMember {
  id: string;
  customer_code: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  status: string;
  join_date: string;
  tools: string[];
  max_devices?: number;
  meta: AccountMeta;
}
