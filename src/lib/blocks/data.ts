import { blocksClient } from "./client";

export type Page<T> = { items: T[]; totalCount: number };
type Filter = Record<string, unknown>;

type GatewayResponse = {
  data?: Record<string, { items?: unknown[]; totalCount?: number } | { acknowledged?: boolean; itemId?: string; message?: string } | undefined>;
  errors?: { message?: string }[];
};

function assertNoErrors(response: unknown): GatewayResponse {
  const record = (response ?? {}) as GatewayResponse;
  if (Array.isArray(record.errors) && record.errors.length > 0) {
    throw new Error(record.errors.map((error) => error.message ?? "GraphQL error").join("; "));
  }
  return record;
}

export type Collection<T> = {
  list: (options?: { filter?: Filter; pageNo?: number; pageSize?: number }) => Promise<Page<T>>;
  listAll: (filter?: Filter) => Promise<T[]>;
  get: (itemId: string) => Promise<T | undefined>;
  create: (payload: Partial<T>) => Promise<string>;
  update: (itemId: string, payload: Partial<T>) => Promise<void>;
};

export function makeCollection<T extends { ItemId: string }>(schemaName: string, fields: string[]): Collection<T> {
  const collection = blocksClient.data.collection<T>(schemaName, { fields });
  const listField = `get${schemaName}s`;

  async function list(options: { filter?: Filter; pageNo?: number; pageSize?: number } = {}): Promise<Page<T>> {
    const response = assertNoErrors(await collection.list({ filter: options.filter, pageNo: options.pageNo ?? 1, pageSize: options.pageSize ?? 50 }));
    const payload = response.data?.[listField] as { items?: T[]; totalCount?: number } | undefined;
    const items = payload?.items ?? [];
    return { items, totalCount: payload?.totalCount ?? items.length };
  }

  async function listAll(filter?: Filter): Promise<T[]> {
    const pageSize = 200;
    const first = await list({ filter, pageNo: 1, pageSize });
    const items = [...first.items];
    let pageNo = 2;
    while (items.length < first.totalCount && pageNo < 50) {
      const next = await list({ filter, pageNo, pageSize });
      if (next.items.length === 0) break;
      items.push(...next.items);
      pageNo += 1;
    }
    return items;
  }

  async function get(itemId: string): Promise<T | undefined> {
    const response = assertNoErrors(await collection.get(itemId));
    const payload = response.data?.[listField] as { items?: T[] } | undefined;
    return payload?.items?.[0];
  }

  async function create(payload: Partial<T>): Promise<string> {
    const response = assertNoErrors(await collection.create(payload));
    const result = response.data?.[`insert${schemaName}`] as { acknowledged?: boolean; itemId?: string; message?: string } | undefined;
    if (!result?.itemId) throw new Error(result?.message || `Could not create ${schemaName}.`);
    return result.itemId;
  }

  async function update(itemId: string, payload: Partial<T>): Promise<void> {
    const response = assertNoErrors(await collection.update(itemId, payload));
    const result = response.data?.[`update${schemaName}`] as { acknowledged?: boolean; message?: string } | undefined;
    if (result && result.acknowledged === false) throw new Error(result.message || `Could not update ${schemaName}.`);
  }

  return { list, listAll, get, create, update };
}
