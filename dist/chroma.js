const chromaBaseUrl = (process.env.CHROMA_URL || 'http://localhost:8000').replace(/\/+$/, '');
const chromaTenant = process.env.CHROMA_TENANT || 'default_tenant';
const chromaDatabase = process.env.CHROMA_DATABASE || 'default_database';
const collectionName = process.env.CHROMA_COLLECTION || 'rag_demo_console';
const chromaToken = process.env.CHROMA_TOKEN;
function getHeaders() {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (chromaToken) {
        headers['x-chroma-token'] = chromaToken;
    }
    return headers;
}
async function request(pathname, init) {
    const response = await fetch(`${chromaBaseUrl}${pathname}`, {
        ...init,
        headers: {
            ...getHeaders(),
            ...(init?.headers || {}),
        },
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Chroma request failed (${response.status}): ${body}`);
    }
    if (response.status === 204) {
        return undefined;
    }
    return (await response.json());
}
async function findCollectionByName(name) {
    const collections = await request(`/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections`);
    return collections.find((collection) => collection.name === name) ?? null;
}
export async function ensureCollection() {
    const existingCollection = await findCollectionByName(collectionName);
    if (existingCollection) {
        return existingCollection;
    }
    return request(`/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections`, {
        method: 'POST',
        body: JSON.stringify({
            name: collectionName,
            metadata: {
                source: 'src-console',
            },
        }),
    });
}
export async function addRecords(input) {
    const collection = await ensureCollection();
    await request(`/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${collection.id}/add`, {
        method: 'POST',
        body: JSON.stringify({
            ids: input.ids,
            documents: input.documents,
            embeddings: input.embeddings,
            metadatas: input.metadatas,
        }),
    });
}
export async function deleteRecords(ids) {
    if (!ids.length) {
        return 0;
    }
    const collection = await ensureCollection();
    const response = await request(`/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${collection.id}/delete`, {
        method: 'POST',
        body: JSON.stringify({
            ids,
        }),
    });
    return response.deleted;
}
export async function queryRecords(input) {
    const collection = await ensureCollection();
    const response = await request(`/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${collection.id}/query`, {
        method: 'POST',
        body: JSON.stringify({
            query_embeddings: [input.embedding],
            n_results: input.limit,
            include: ['documents', 'metadatas', 'distances'],
        }),
    });
    const documents = response.documents?.[0] ?? [];
    const metadatas = response.metadatas?.[0] ?? [];
    const distances = response.distances?.[0] ?? [];
    const rows = documents.flatMap((document, index) => {
        if (typeof document !== 'string') {
            return [];
        }
        return [
            {
                document,
                metadata: metadatas[index] ?? null,
                distance: distances[index] ?? null,
            },
        ];
    });
    return {
        documents: rows.map((row) => row.document),
        metadatas: rows.map((row) => row.metadata),
        distances: rows.map((row) => row.distance),
    };
}
export async function listRecords(limit = 100) {
    const collection = await ensureCollection();
    return request(`/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${collection.id}/get`, {
        method: 'POST',
        body: JSON.stringify({
            limit,
            include: ['documents', 'metadatas'],
        }),
    });
}
export async function resetCollection() {
    const collection = await ensureCollection();
    const current = await listRecords();
    if (!current.ids.length) {
        return 0;
    }
    return deleteRecords(current.ids);
}
export async function checkChromaConnection() {
    await request('/api/v2/version');
}
//# sourceMappingURL=chroma.js.map