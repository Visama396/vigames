# Visagames

Plataforma de juegos de navegador construida con Astro, React, TypeScript y
Tailwind CSS. El catálogo inicial es estático y está pensado para crecer por
fases hasta integrar Supabase y juegos reales de Phaser y PlayCanvas.

> **Nota:** dont use dev server as I'm using it myself to see the changes in real time.

## Stack

- **Astro** — páginas, layouts, rutas y contenido estático.
- **React** — islas interactivas (búsqueda y filtros del catálogo).
- **Tailwind CSS v4** — estilos y diseño responsive.
- **TypeScript** — contratos y datos compartidos.
- **Netlify** — adaptador de despliegue.

## Comandos

```bash
bun install       # instalar dependencias
bun run build     # compilar el sitio
bun run preview   # previsualizar la compilación
bun run astro …   # CLI de Astro
```

## Estructura

```text
src/
├── components/
│   ├── auth/         # avisos de autenticación (fase futura)
│   ├── games/        # tarjetas y catálogo interactivo
│   └── layout/       # cabecera y pie
├── data/games.ts     # catálogo versionado con el código
├── layouts/          # Layout.astro con el stylesheet de Tailwind
├── pages/
│   ├── index.astro
│   ├── games/        # catálogo y ficha dinámica
│   ├── leaderboard/
│   ├── login.astro
│   └── register.astro
├── styles/global.css # entrada de Tailwind y tokens de tema
└── types/game.ts     # contrato de metadatos de juego
```

## Estado actual

- [x] Astro + React + TypeScript + Tailwind configurados.
- [x] Adaptador de Netlify y `netlify.toml`.
- [x] Layout compartido y navegación responsive.
- [x] Catálogo con datos de ejemplo, búsqueda y filtros.
- [x] Ficha dinámica de juego (`/games/[slug]`).
- [x] Páginas de clasificación y avisos de cuenta.
- [x] Juegos Phaser reales y adaptador de juego.
- [x] Autenticación con usuario/contraseña (Supabase Auth, sin email).
- [x] Guardado de progreso en la nube y clasificaciones por juego.
- [ ] Juego PlayCanvas real.

## Añadir un juego

1. Copia una entrada de `src/data/games.ts` y ajusta sus metadatos.
2. Añade una miniatura en `public/images/games/`.
3. Mantén `published: false` hasta que el juego y su adaptador estén listos.
4. Sigue la plantilla de documentación de juego del diseño del proyecto.

## Variables de entorno

Copia `.env.example` a `.env` y rellena los valores públicos del proyecto de
Supabase compartido con ViPlay. Solo las variables con prefijo `PUBLIC_`
llegan al navegador; los secretos deben configurarse en Netlify.

## Base de datos

Ejecuta `supabase/migrations/0001_visagames.sql` en el editor SQL de Supabase.
El script es idempotente y añade:

- `game_progress`: guardado privado por cuenta y juego.
- `game_scores`: clasificaciones públicas sin exponer `account_id`.
- RPCs `load_game_progress`, `save_game_progress`, `submit_game_score` y
  `get_leaderboards`.
- Las funciones compartidas `ensure_account_link` y `username_taken` usadas
  por el registro y el inicio de sesión con usuario (sin email).

## Despliegue

El adaptador `@astrojs/netlify` está configurado en `astro.config.mjs`. El
comando de compilación es `bun run build` y el directorio publicado es `dist`.
