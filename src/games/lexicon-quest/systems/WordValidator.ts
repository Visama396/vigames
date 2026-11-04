import type { Rng } from "./random.ts";
import { pickOne } from "./random.ts";

interface TrieNode {
  children: Map<string, TrieNode>;
  end: boolean;
}

function createNode(): TrieNode {
  return { children: new Map(), end: false };
}

const PLACEHOLDER = "\u0000";

/**
 * Normaliza una palabra para compararla con el diccionario:
 * - pasa a mayúsculas,
 * - elimina espacios y signos,
 * - elimina las tildes,
 * - conserva la ñ como letra independiente.
 *
 * «Año» se normaliza a «AÑO» y «ano» permanece «ANO».
 */
export function normalizeWord(raw: string): string {
  if (!raw) return "";
  const upper = raw.trim().toUpperCase().replace(/\s+/g, "");
  const protectedEne = upper.replace(/Ñ/g, PLACEHOLDER);
  const withoutAccents = protectedEne
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return withoutAccents
    .replace(new RegExp(PLACEHOLDER, "g"), "Ñ")
    .replace(/[^A-ZÑ]/g, "");
}

export class WordValidator {
  private readonly root: TrieNode = createNode();
  private readonly words: string[] = [];
  private readonly wordsByLength = new Map<number, string[]>();

  constructor(words: Iterable<string>) {
    const unique = new Set<string>();
    for (const raw of words) {
      const word = normalizeWord(raw);
      if (word.length < 2) continue;
      unique.add(word);
    }
    this.words = [...unique];
    for (const word of this.words) {
      this.insert(word);
      const bucket = this.wordsByLength.get(word.length) ?? [];
      bucket.push(word);
      this.wordsByLength.set(word.length, bucket);
    }
  }

  private insert(word: string): void {
    let node = this.root;
    for (const letter of word) {
      let child = node.children.get(letter);
      if (!child) {
        child = createNode();
        node.children.set(letter, child);
      }
      node = child;
    }
    node.end = true;
  }

  isWord(raw: string): boolean {
    const word = normalizeWord(raw);
    if (!word) return false;
    let node = this.root;
    for (const letter of word) {
      const child = node.children.get(letter);
      if (!child) return false;
      node = child;
    }
    return node.end;
  }

  hasPrefix(prefix: string): boolean {
    let node = this.root;
    for (const letter of prefix) {
      const child = node.children.get(letter);
      if (!child) return false;
      node = child;
    }
    return true;
  }

  get size(): number {
    return this.words.length;
  }

  getWords(): readonly string[] {
    return this.words;
  }

  getWordsOfLength(min: number, max: number): string[] {
    const result: string[] = [];
    for (let length = min; length <= max; length += 1) {
      const bucket = this.wordsByLength.get(length);
      if (bucket) result.push(...bucket);
    }
    return result;
  }

  /** Palabra semilla para garantizar un tablero jugable. */
  getSeedWord(rng: Rng): string | null {
    const candidates =
      this.wordsByLength.get(4)?.length
        ? this.wordsByLength.get(4)!
        : this.wordsByLength.get(3) ?? [];
    const pool =
      candidates.length > 0
        ? candidates
        : this.getWordsOfLength(2, 8);
    if (pool.length === 0) return null;
    return pickOne(pool, rng);
  }
}
