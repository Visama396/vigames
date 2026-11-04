export interface Game {
  slug: string;
  title: string;
  description: string;
  category: string[];
  engine: "Phaser" | "React" | "PlayCanvas" | "Vanilla";
  thumbnail?: string;
  featured?: boolean;
  supportsScores?: boolean;
  comingSoon?: boolean;
}

export const games: Game[] = [
  {
    slug: "undermine",
    title: "UNDERMINE",
    description: "Juego incremental de minería y automatización. Construye tu fábrica subterránea y optimiza las cadenas de producción.",
    category: ["Casual", "Puzles"],
    engine: "Phaser",
    thumbnail: "/undermine.png",
    featured: true,
    supportsScores: false,
  },
  {
    slug: "lexicon-quest",
    title: "LEXICON QUEST",
    description: "Combate por palabras en un grimorio corrompido. Forma palabras adyacentes o diagonales, interrumpe ataques y derrota a los guardianes del Lexicon.",
    category: ["Puzles", "Estrategia"],
    engine: "Phaser",
    featured: true,
    supportsScores: false,
  },
  {
    slug: "purrgrid",
    title: "PURRGRID",
    description: "Puzle cozy de lógica: coloca un gato por región, fila y columna sin que se toquen. Diez niveles con dificultad creciente.",
    category: ["Puzles", "Casual"],
    engine: "Phaser",
    thumbnail: "/undermine.png",
    featured: true,
    supportsScores: false,
  },
  {
    slug: "chroma",
    title: "CHROMA",
    description: "Puzle de lógica y colores: vierte líquidos entre botellas hasta que cada recipiente tenga un único color. Doce niveles con dificultad creciente.",
    category: ["Puzles", "Casual"],
    engine: "Phaser",
    featured: true,
    supportsScores: false,
  },
];

export const featuredGames = games.filter((game) => game.featured);
export const publishedGames = games.filter((game) => !game.comingSoon);
export const categories = [...new Set(games.flatMap((game) => game.category))].sort();
