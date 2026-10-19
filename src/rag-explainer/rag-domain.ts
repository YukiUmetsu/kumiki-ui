/** One factual source for the RAG V2 visual story, captions, search and citation.
 * This is a deterministic TEACHING corpus, not a trained embedding model and not
 * a production HNSW index. Show the 2D toy vectors/graph as illustrative only.
 */
export type ChunkId = "C01" | "C02" | "C03" | "C04" | "C05" | "C06";
export type Vector2 = readonly [number, number];
export interface RagChunk {
  id: ChunkId;
  document: string;
  section: string;
  text: string;
  /** Precomputed toy vector for teaching; not a real model inference. */
  embedding: Vector2;
}
export const RAG_QUESTION = "How many unused PTO days can I carry over?";
export const RAG_QUESTION_VECTOR: Vector2 = [0.90, 0.43];
export const RAG_CHUNKS: readonly RagChunk[] = [
  { id: "C01", document: "Example Employee Handbook", section: "§4",
    text: "Up to five unused PTO days may be carried into the next calendar year.",
    embedding: [0.94, 0.34] },
  { id: "C02", document: "Example Employee Handbook", section: "§2",
    text: "Employees become eligible to accrue PTO after 90 days.",
    embedding: [0.74, 0.67] },
  { id: "C03", document: "Example Employee Handbook", section: "§8",
    text: "Business travel meal expenses are reimbursed with receipts.",
    embedding: [-0.82, -0.57] },
  { id: "C04", document: "Example Employee Handbook", section: "§7",
    text: "Payroll deposits follow the biweekly schedule.",
    embedding: [-0.45, 0.89] },
  { id: "C05", document: "Example Employee Handbook", section: "§6",
    text: "Holiday schedules are published every November.",
    embedding: [0.30, 0.95] },
  { id: "C06", document: "Example Employee Handbook", section: "§3",
    text: "Benefits enrollment opens during onboarding.",
    embedding: [-0.10, 0.99] },
];

/** Graph-navigation metaphor: not the structure nor traversal of a real HNSW
 * implementation. Enables faithful display of *candidates actually inspected*.
 */
export const RAG_TOY_NEIGHBORS: Readonly<Record<ChunkId, readonly ChunkId[]>> = {
  C01: ["C02", "C05"],
  C02: ["C01", "C06"],
  C03: ["C04"],
  C04: ["C03", "C05", "C06"],
  C05: ["C04", "C01", "C02"],
  C06: ["C04", "C02"],
};
export interface RankedChunk {
  chunk: RagChunk;
  similarity: number;
}
export interface RetrievalTrace {
  /** Greedy graph hops, in animated order. */
  traversed: readonly ChunkId[];
  /** All scores actually checked during neighbor exploration. */
  candidates: readonly RankedChunk[];
  /** The top-k selected source passages, ordered by cosine similarity. */
  hits: readonly RankedChunk[];
  /** Literal source text delivered to the prompt, never numeric embeddings. */
  prompt: {
    question: string;
    context: readonly { id: ChunkId; source: string; text: string }[];
  };
}
const byId = new Map<ChunkId, RagChunk>(RAG_CHUNKS.map(chunk => [chunk.id, chunk]));
export function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  if (left.length === 0 || left.length !== right.length ||
      [...left, ...right].some(value => !Number.isFinite(value)))
    throw new Error("Cosine similarity requires nonempty, equally sized finite vectors.");
  const denominator = Math.hypot(...left) * Math.hypot(...right);
  if (denominator === 0) throw new Error("Cosine similarity is undefined for zero vectors.");
  return left.reduce((sum, value, index) => sum + value * right[index], 0) / denominator;
}
const getChunk = (id: ChunkId): RagChunk => {
  const chunk = byId.get(id);
  if (!chunk) throw new Error("Unknown source chunk " + id);
  return chunk;
};
const byScore = (a: RankedChunk, b: RankedChunk) =>
  b.similarity - a.similarity || a.chunk.id.localeCompare(b.chunk.id);

/** Deterministic, simplified greedy neighbor walk, then rerank inspected
 * candidates. Illustrates ANN graph navigation; not a real HNSW search API.
 * Source IDs and retrieval data are the SAME across every animated scene.
 */
export function retrieveExample(
  question = RAG_QUESTION,
  queryVector: readonly number[] = RAG_QUESTION_VECTOR,
  topK = 2,
): RetrievalTrace {
  if (!question.trim() || !Number.isSafeInteger(topK) || topK < 1)
    throw new Error("Retrieval needs a question and a positive integer topK.");
  const considered = new Map<ChunkId, RankedChunk>();
  const score = (id: ChunkId) => {
    const existing = considered.get(id);
    if (existing) return existing;
    const chunk = getChunk(id);
    const result = { chunk, similarity: cosineSimilarity(queryVector, chunk.embedding) };
    considered.set(id, result);
    return result;
  };
  let current: ChunkId = "C03"; // intentionally distant graph entry point
  const traversed: ChunkId[] = [];
  for (let steps = 0; steps <= RAG_CHUNKS.length; steps++) {
    traversed.push(current);
    const here = score(current);
    const neighborhood: RankedChunk[] = RAG_TOY_NEIGHBORS[current].map(id => score(id)).sort(byScore);
    const closest: RankedChunk | undefined = neighborhood[0];
    if (!closest || closest.similarity <= here.similarity) break;
    current = closest.chunk.id;
    if (steps === RAG_CHUNKS.length) throw new Error("Toy neighbor graph traversal did not converge.");
  }
  const candidates = [...considered.values()].sort(byScore);
  const hits = candidates.slice(0, topK);
  return {
    traversed,
    candidates,
    hits,
    prompt: {
      question,
      context: hits.map(({ chunk }) => ({
        id: chunk.id,
        source: chunk.document + " " + chunk.section,
        text: chunk.text,
      })),
    },
  };
}
export const RAG_EXAMPLE_TRACE = retrieveExample();
