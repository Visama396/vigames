# Diseño de la aplicación --- Plataforma de juegos de navegador

> **Estado:** Borrador inicial\
> **Versión:** 0.1\
> **Última actualización:** 2026-10-23\
> **Propósito:** Documento de referencia para diseñar, implementar y
> ampliar una plataforma web que permita descubrir y jugar a juegos
> directamente en el navegador.

------------------------------------------------------------------------

## 1. Visión del proyecto

Construir una página web adaptable a escritorio y móvil que reúna juegos
de navegador en un catálogo común. Los usuarios podrán descubrir juegos,
jugar sin instalaciones, guardar puntuaciones y, opcionalmente, crear
una cuenta para conservar su progreso y competir en clasificaciones.

La plataforma debe poder incorporar juegos desarrollados con distintos
motores sin que el catálogo, la autenticación o las funciones comunes
dependan de un motor concreto.

### 1.1 Objetivos

-   Publicar juegos que se ejecuten directamente en el navegador.
-   Ofrecer una experiencia rápida, accesible y adaptable a distintas
    pantallas.
-   Mantener separada la plataforma web de la implementación interna de
    cada juego.
-   Utilizar **Phaser** para juegos 2D cuando sea adecuado y
    **PlayCanvas** para juegos 3D.
-   Permitir jugar sin cuenta cuando las características del juego lo
    permitan.
-   Ofrecer autenticación, perfiles, récords y clasificaciones mediante
    Supabase.
-   Facilitar el despliegue continuo y el mantenimiento del proyecto.
-   Poder añadir juegos y funciones de forma progresiva sin rehacer la
    arquitectura.

### 1.2 Fuera del alcance inicial

No forman parte del MVP:

-   Multijugador en tiempo real.
-   Chat entre usuarios o funciones sociales complejas.
-   Tienda, pagos o monetización.
-   Editor de juegos para usuarios.
-   Aplicaciones nativas.
-   Sistema antitrampas avanzado para todos los juegos.
-   Panel de administración completo, salvo que sea necesario para
    publicar contenido.

Estas funciones podrán evaluarse cuando exista una versión funcional y
se conozcan mejor las necesidades reales.

------------------------------------------------------------------------

## 2. Público y experiencia de uso

La plataforma se orienta inicialmente a usuarios que quieren abrir una
página y empezar a jugar sin instalar programas.

### Principios de experiencia

1.  **Jugar rápido:** minimizar el tiempo entre seleccionar un juego y
    poder jugar.
2.  **Navegación clara:** catálogo, categorías, búsqueda y fichas de
    juego fáciles de entender.
3.  **Sin barreras innecesarias:** no exigir una cuenta para probar
    juegos que no la necesitan.
4.  **Diseño adaptable:** interfaz utilizable con ratón, teclado,
    pantalla táctil y distintos tamaños de pantalla.
5.  **Continuidad:** facilitar volver a un juego, consultar récords y
    conservar preferencias.
6.  **Transparencia:** indicar los controles, requisitos y funciones
    disponibles para cada juego.

------------------------------------------------------------------------

## 3. Stack tecnológico

  -----------------------------------------------------------------------
  Área                    Tecnología              Responsabilidad
  ----------------------- ----------------------- -----------------------
  Framework web           Astro                   Páginas, layouts, rutas
                                                  y generación de
                                                  contenido estático

  Componentes             React                   Catálogo interactivo,
  interactivos                                    filtros, menús,
                                                  perfiles y widgets

  Lenguaje                TypeScript              Tipado compartido y
                                                  reducción de errores

  Estilos                 Tailwind CSS            Diseño visual y
                                                  adaptación responsive

  Juegos 2D               Phaser                  Motor para juegos 2D
                                                  compatibles con sus
                                                  capacidades

  Juegos 3D               PlayCanvas              Motor para juegos 3D
                                                  orientados al navegador

  Backend gestionado      Supabase                PostgreSQL,
                                                  autenticación y
                                                  políticas de acceso

  Hosting y despliegue    Netlify                 Publicación del
                                                  frontend y, si se
                                                  necesita, funciones
                                                  serverless

  Control de versiones    Git                     Historial, ramas y
                                                  colaboración futura
  -----------------------------------------------------------------------

### 3.1 Papel de Astro y React

Astro será responsable de la estructura de páginas y de entregar
contenido estático cuando sea posible. React se utilizará en las zonas
que necesiten estado e interacción.

No es necesario convertir toda la web en una aplicación React cliente.
Las páginas de contenido y las fichas pueden ser ligeras; los
componentes interactivos se hidratarán solo cuando sea necesario.

### 3.2 Uso de los motores

Los motores deben cargarse de forma diferida. La página principal y el
catálogo no deben descargar Phaser ni PlayCanvas por defecto.

Cada juego debe ser capaz de inicializar su motor, gestionar su ciclo de
vida y liberar sus recursos al abandonar la partida.

### 3.3 Principio de arquitectura

**La plataforma gestiona navegación, usuarios y servicios comunes; cada
juego gestiona su propia lógica y renderizado.**

No se debe permitir que la lógica específica de un juego contamine los
componentes generales del sitio.

------------------------------------------------------------------------

## 4. Arquitectura de alto nivel

``` text
Navegador
  |
  +-- Astro
  |    +-- Inicio
  |    +-- Catálogo
  |    +-- Ficha de juego
  |    +-- Perfil
  |    +-- Clasificaciones
  |
  +-- Componentes React
  |    +-- Búsqueda y filtros
  |    +-- Interfaz de juego
  |    +-- Controles comunes
  |    +-- Puntuaciones y tablas
  |
  +-- Juegos cargados bajo demanda
  |    +-- Juegos Phaser (2D)
  |    +-- Juegos PlayCanvas (3D)
  |
  +-- Supabase
       +-- Auth
       +-- PostgreSQL
       +-- Row Level Security (RLS)
       +-- Funciones de servidor cuando proceda

Netlify
  +-- Hosting/CDN
  +-- Despliegue continuo
  +-- Funciones serverless opcionales
```

### 4.1 Límites de confianza

Todo código que se ejecuta en el navegador está bajo el control del
usuario. No se debe confiar en una puntuación, duración o resultado
únicamente porque lo haya enviado el cliente.

Las claves públicas de Supabase pueden utilizarse en el frontend si las
políticas de seguridad están correctamente configuradas. La clave
`service_role` y cualquier secreto de servidor nunca deben incluirse en
el bundle del navegador.

RLS protege el acceso a filas, pero no demuestra por sí sola que una
puntuación sea legítima.

------------------------------------------------------------------------

## 5. Estructura inicial del repositorio

La estructura exacta podrá evolucionar, pero conviene separar claramente
la web, los servicios compartidos y los juegos.

``` text
browser-games/
├── public/
│   ├── icons/
│   ├── images/
│   └── games/
│       └── ...                 # Recursos públicos, si procede
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── games/
│   │   ├── leaderboard/
│   │   └── auth/
│   ├── layouts/
│   ├── pages/
│   │   ├── index.astro
│   │   ├── games/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── leaderboard/
│   │   │   └── index.astro
│   │   └── profile/
│   │       └── index.astro
│   ├── lib/
│   │   ├── supabase/
│   │   └── utils/
│   ├── data/
│   │   └── games.ts
│   ├── styles/
│   │   └── global.css
│   └── types/
├── games/
│   ├── shared/
│   │   └── game-contract.ts
│   ├── example-2d/
│   └── example-3d/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── tests/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── tailwind.config.*             # Según la versión/configuración elegida
├── .env.example
├── .gitignore
└── README.md
```

**Nota:** `games/` puede ser un directorio dentro del repositorio o
convertirse en paquetes/proyectos independientes si la colección crece.
No es obligatorio alojar todos los recursos dentro de `public/`; la
ubicación debe elegirse según el proceso de compilación y la estrategia
de caché.

### 5.1 Rutas previstas

  Ruta                        Propósito
  --------------------------- --------------------------------------
  `/`                         Página principal y juegos destacados
  `/games`                    Catálogo completo
  `/games/[slug]`             Ficha y zona de juego
  `/leaderboard`              Clasificaciones globales
  `/leaderboard/[gameSlug]`   Clasificación de un juego
  `/login`                    Inicio de sesión
  `/register`                 Registro
  `/profile`                  Perfil del usuario autenticado
  `/settings`                 Preferencias de usuario

Las rutas de autenticación pueden variar según el proveedor y el flujo
de recuperación elegido.

------------------------------------------------------------------------

## 6. Catálogo y metadatos de juegos

Cada juego necesita una definición que permita mostrarlo en el catálogo
y saber cómo cargarlo.

Ejemplo conceptual en TypeScript:

``` ts
export type GameEngine = "phaser" | "playcanvas";

export interface GameDefinition {
  id: string;
  slug: string;
  title: string;
  description: string;
  engine: GameEngine;
  version: string;
  thumbnail: string;
  categories: string[];
  published: boolean;
  supportsGuestPlay: boolean;
  supportsScores: boolean;
  supportsTouch: boolean;
}
```

Esta interfaz es una propuesta inicial. Los campos definitivos deben
reflejar funciones reales y no prometer características que un juego no
implemente.

### 6.1 Fuente de los metadatos

Para el MVP, el catálogo puede mantenerse en archivos TypeScript o JSON
versionados con el código. Esto permite publicar nuevos juegos sin
construir un panel de administración.

Se puede trasladar a Supabase cuando sea necesario gestionar el catálogo
desde una interfaz, programar publicaciones o modificar metadatos sin
desplegar el frontend.

No conviene duplicar la misma información en archivos locales y en la
base de datos sin definir cuál es la fuente oficial.

------------------------------------------------------------------------

## 7. Contrato de integración de los juegos

La plataforma necesita un contrato común para controlar el ciclo de vida
de los juegos, independientemente del motor utilizado.

Ejemplo conceptual:

``` ts
export interface GameSession {
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export interface GameContext {
  gameId: string;
  sessionId?: string;
  userId?: string;
  onReady(): void;
  onGameOver(result: GameResult): void;
  onError(error: Error): void;
}

export interface GameResult {
  score?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}
```

Este contrato no es una API nativa de Phaser ni de PlayCanvas: habrá que
crear un adaptador para cada motor.

### 7.1 Responsabilidades del adaptador

-   Crear el canvas y la instancia del motor.
-   Inicializar el juego y comunicar cuándo está listo.
-   Gestionar pausa y reanudación.
-   Comunicar el final de una partida.
-   Gestionar errores de carga e inicialización.
-   Eliminar listeners, audio, temporizadores y recursos al destruir el
    juego.
-   Evitar que queden instancias duplicadas al navegar entre juegos.

### 7.2 Interfaz común del jugador

Cuando corresponda, el contenedor de juego puede ofrecer:

-   Iniciar o reanudar.
-   Pausar.
-   Reiniciar.
-   Activar pantalla completa.
-   Silenciar o ajustar el volumen.
-   Consultar controles.
-   Salir y volver a la ficha del juego.

No todos los juegos necesitan todos los controles. La interfaz debe
adaptarse a las capacidades declaradas por cada juego.

### 7.3 Carga y rendimiento

-   Importar cada motor de forma dinámica cuando se necesite.
-   Mostrar una pantalla de carga con progreso cuando sea posible.
-   Cargar recursos bajo demanda.
-   Evitar descargar recursos de juegos que el usuario no ha abierto.
-   Liberar correctamente recursos al salir.
-   Definir tamaños y formatos razonables para texturas, audio y
    modelos.
-   Probar el comportamiento en móvil y en dispositivos modestos.

------------------------------------------------------------------------

## 8. Modelo de datos inicial

El modelo debe ser pequeño y extensible. Supabase Auth mantiene las
identidades de autenticación; los perfiles públicos se guardan en una
tabla propia.

### 8.1 `games`

Metadatos del catálogo si se decide almacenarlos en Supabase.

  Campo             Tipo orientativo   Descripción
  ----------------- ------------------ -----------------------------------
  `id`              `uuid`             Identificador
  `slug`            `text` único       Identificador legible para la URL
  `title`           `text`             Nombre visible
  `description`     `text`             Descripción
  `engine`          `text`             Motor utilizado
  `version`         `text`             Versión publicada
  `thumbnail_url`   `text`             Imagen de portada
  `published`       `boolean`          Si aparece en el catálogo
  `created_at`      `timestamptz`      Fecha de creación

### 8.2 `profiles`

Datos públicos y preferencias que se desee asociar a un usuario.

  Campo          Tipo orientativo   Descripción
  -------------- ------------------ ------------------------------
  `id`           `uuid`             Coincide con `auth.users.id`
  `username`     `text` único       Nombre público
  `avatar_url`   `text`, opcional   Avatar
  `created_at`   `timestamptz`      Fecha de creación

No almacenar contraseñas en `profiles`; Supabase Auth gestiona las
credenciales.

### 8.3 `game_sessions`

Opcional para el primer prototipo, recomendable cuando se empiece a
validar puntuaciones.

  Campo           Tipo orientativo          Descripción
  --------------- ------------------------- -----------------------------------
  `id`            `uuid`                    Identificador de sesión
  `game_id`       `uuid`                    Juego asociado
  `user_id`       `uuid`, nullable          Usuario, si está autenticado
  `started_at`    `timestamptz`             Inicio registrado por el servidor
  `finished_at`   `timestamptz`, nullable   Final registrado
  `status`        `text`                    Estado de la sesión

Los estados válidos y las transiciones deben definirse mediante
restricciones o lógica de servidor.

### 8.4 `scores`

  Campo                 Tipo orientativo           Descripción
  --------------------- -------------------------- --------------------------------------
  `id`                  `uuid`                     Identificador
  `game_id`             `uuid`                     Juego asociado
  `user_id`             `uuid`, nullable           Usuario, si procede
  `session_id`          `uuid`, nullable           Sesión validada
  `score`               `bigint` o tipo adecuado   Puntuación
  `duration_ms`         `integer`, nullable        Duración declarada/validada
  `created_at`          `timestamptz`              Fecha de registro
  `validation_status`   `text`                     Estado de validación, si se necesita

El diseño final debe decidir cómo se almacenan resultados anónimos, cómo
se asocian a una cuenta y si se conservan todas las partidas o solo
récords.

### 8.5 Relaciones

``` text
auth.users
    |
    +-- 1:1 --> profiles
    |
    +-- 1:N --> game_sessions
    |
    +-- 1:N --> scores

games
    |
    +-- 1:N --> game_sessions
    |
    +-- 1:N --> scores
```

Las relaciones, índices, restricciones y políticas deberán definirse
mediante migraciones SQL versionadas.

------------------------------------------------------------------------

## 9. Autenticación y autorización

### 9.1 Experiencia de usuario

-   Permitir explorar el catálogo sin autenticarse.
-   Permitir jugar como invitado cuando el juego lo admita.
-   Ofrecer registro e inicio de sesión para récords persistentes,
    perfiles y funciones personales.
-   Gestionar correctamente estados de carga, errores, expiración y
    cierre de sesión.
-   No asumir que toda visita dispone de una sesión autenticada.

### 9.2 Seguridad de Supabase

-   Activar RLS en las tablas accesibles desde el cliente.
-   Permitir a cada usuario leer y modificar solo los datos privados que
    le correspondan.
-   Exponer únicamente los campos públicos necesarios en perfiles y
    clasificaciones.
-   Validar entradas en servidor y en base de datos.
-   No confiar en `user_id` enviado libremente por el navegador; obtener
    la identidad autenticada del contexto validado.
-   No exponer claves secretas ni la clave `service_role`.
-   Limitar la frecuencia de envíos cuando sea pertinente.

La política exacta dependerá de si las puntuaciones pueden ser anónimas,
si se permite actualizar récords y qué información es pública.

### 9.3 Puntuaciones y trampas

Una petición del cliente puede manipularse. Por tanto:

-   No permitir inserciones arbitrarias de puntuaciones oficiales si se
    necesita una clasificación fiable.
-   Usar una función de servidor o un procedimiento controlado para
    validar y registrar resultados.
-   Comprobar que la sesión existe, corresponde al juego y no se ha
    usado de forma indebida.
-   Aplicar límites razonables y restricciones de base de datos.
-   Para juegos competitivos, valorar validación específica por juego o
    lógica autoritativa en servidor.

La duración y los eventos enviados por el cliente también pueden
falsificarse. Estas medidas reducen el abuso, pero no constituyen una
garantía antitrampas completa para juegos cuya lógica se ejecuta
íntegramente en el navegador.

------------------------------------------------------------------------

## 10. Diseño de interfaz

### 10.1 Página principal

Elementos posibles:

-   Cabecera y navegación.
-   Buscador de juegos.
-   Juegos destacados o recientes.
-   Categorías.
-   Acceso al perfil o inicio de sesión.
-   Pie de página con información y enlaces.

### 10.2 Catálogo

-   Cuadrícula de tarjetas.
-   Búsqueda por título.
-   Filtros por categoría y tipo de juego.
-   Ordenación por novedades o popularidad cuando existan datos fiables.
-   Estados vacíos claros cuando no haya resultados.

### 10.3 Ficha de juego

-   Título, portada y descripción.
-   Zona de juego.
-   Botón de inicio cuando sea necesario.
-   Controles e instrucciones.
-   Botones de pausa, reinicio y pantalla completa si están soportados.
-   Récord personal y clasificación, si están disponibles.
-   Mensajes de error y opción de reintento.

### 10.4 Diseño responsive y accesibilidad

-   Empezar por una estructura adaptable a móvil y escritorio.
-   No depender exclusivamente del hover.
-   Proporcionar controles táctiles para juegos compatibles.
-   Mantener navegación por teclado en la interfaz de la web.
-   Respetar el foco visible y las etiquetas accesibles.
-   Diferenciar la interfaz de la web de los controles propios del
    juego.
-   Probar pantalla completa, orientación y cambios de tamaño.

------------------------------------------------------------------------

## 11. Requisitos no funcionales

### Rendimiento

-   La portada no debe cargar motores de juego innecesarios.
-   Optimizar imágenes y miniaturas.
-   Aplicar carga diferida a los juegos.
-   Medir tamaño de recursos y tiempo hasta que se puede jugar.
-   Evitar fugas de memoria al cambiar de juego.

### Fiabilidad

-   Mostrar errores comprensibles cuando falle la carga.
-   No dejar la interfaz bloqueada si un motor no se inicializa.
-   Gestionar fallos de red al enviar puntuaciones.
-   Evitar duplicados en el registro de resultados mediante
    restricciones e idempotencia cuando proceda.

### Seguridad

-   RLS en tablas expuestas.
-   Validación de datos.
-   Secretos exclusivamente en servidor.
-   Protección contra abuso de endpoints y envíos repetidos.
-   Política de privacidad y gestión adecuada de datos personales si se
    abre al público.

### Mantenibilidad

-   TypeScript en la plataforma y en el código nuevo de los juegos
    cuando sea compatible.
-   Componentes con responsabilidades claras.
-   Migraciones SQL versionadas.
-   Configuración reproducible.
-   Documentación para añadir juegos.
-   Pruebas de los contratos de integración.

------------------------------------------------------------------------

## 12. Variables de entorno y configuración

Mantener un `.env.example` con los nombres de variables necesarias, sin
credenciales reales.

Ejemplo orientativo:

``` dotenv
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```

Los nombres concretos dependerán de la versión del SDK y de la
configuración del proyecto. Las variables con prefijo público se
incorporan al cliente y no deben contener secretos.

Las credenciales de servidor, si se añaden funciones backend, deben
configurarse en el entorno seguro de Netlify y no en archivos
versionados.

------------------------------------------------------------------------

## 13. Estrategia de pruebas

### Pruebas de interfaz

-   Navegación entre páginas.
-   Búsqueda y filtros.
-   Estados de sesión autenticada y anónima.
-   Diseño responsive.
-   Estados de carga y error.

### Pruebas del contrato de juego

-   Inicio correcto.
-   Pausa y reanudación.
-   Finalización y envío de resultado.
-   Destrucción completa de la instancia.
-   Navegación repetida sin crear instancias duplicadas.
-   Gestión de errores de inicialización.

### Pruebas de seguridad

-   Un usuario no puede modificar el perfil de otro.
-   No se pueden leer datos privados sin autorización.
-   Las puntuaciones no pueden enviarse saltándose las reglas del
    servidor.
-   Los valores fuera de rango se rechazan.
-   No hay claves secretas en los archivos generados para el navegador.

### Pruebas de compatibilidad

-   Navegadores de escritorio principales.
-   Móvil y pantalla táctil.
-   Dispositivos de rendimiento limitado.
-   Navegadores sin soporte para funciones gráficas opcionales.

------------------------------------------------------------------------

## 14. Plan de implementación por fases

### Fase 0 --- Preparación

-   Crear repositorio Git.
-   Inicializar Astro, React, TypeScript y Tailwind.
-   Configurar linting y formato.
-   Configurar Netlify y el despliegue desde el repositorio.
-   Añadir README y `.env.example`.

**Criterio de salida:** la aplicación mínima se despliega
automáticamente y puede ejecutarse localmente siguiendo el README.

### Fase 1 --- Estructura visual

-   Crear layout y navegación.
-   Crear página principal.
-   Crear catálogo con datos de ejemplo.
-   Crear ruta dinámica de ficha de juego.
-   Diseñar tarjetas y estados responsive.

**Criterio de salida:** se puede navegar por un catálogo ficticio y
abrir fichas de juegos sin backend.

### Fase 2 --- Primer juego Phaser

-   Crear un juego 2D pequeño.
-   Implementar el adaptador de juego.
-   Añadir inicio, pausa, reinicio y destrucción.
-   Comprobar carga diferida.
-   Verificar el comportamiento al navegar fuera de la ficha.

**Criterio de salida:** el juego funciona dentro de la plataforma y no
deja recursos activos al abandonarlo.

### Fase 3 --- Supabase Auth y perfiles

-   Crear proyecto Supabase.
-   Configurar autenticación.
-   Crear migraciones iniciales para perfiles.
-   Aplicar RLS.
-   Implementar registro, inicio y cierre de sesión.
-   Añadir estados de error y carga.

**Criterio de salida:** un usuario puede autenticarse y gestionar su
perfil sin acceder a los datos privados de otros.

### Fase 4 --- Puntuaciones y clasificación

-   Definir el modelo de partidas.
-   Implementar el registro de resultados.
-   Añadir validación de servidor apropiada.
-   Crear consulta de clasificación.
-   Mostrar récord personal y tabla de puntuaciones.

**Criterio de salida:** las puntuaciones válidas se guardan y las
operaciones no autorizadas son rechazadas.

### Fase 5 --- Primer juego PlayCanvas

-   Crear un juego 3D pequeño.
-   Implementar su adaptador.
-   Comprobar carga, pausa, reinicio y destrucción.
-   Comparar rendimiento y tamaño de recursos.
-   Confirmar que la plataforma no depende de un motor concreto.

**Criterio de salida:** el juego 3D utiliza el mismo contrato de
plataforma que el juego 2D.

### Fase 6 --- Consolidación

-   Mejorar accesibilidad.
-   Añadir pruebas automatizadas.
-   Revisar rendimiento móvil.
-   Mejorar SEO y metadatos.
-   Documentar el proceso para incorporar nuevos juegos.
-   Evaluar favoritos, historial y ajustes.

Las fases son una secuencia propuesta, no una obligación rígida.
Conviene mantener cada fase pequeña y desplegable.

------------------------------------------------------------------------

## 15. Definición del MVP

La primera versión pública puede considerarse lista cuando:

-   [ ] La web está desplegada en Netlify.
-   [ ] El diseño funciona en escritorio y móvil.
-   [ ] Existe un catálogo navegable.
-   [ ] Hay al menos un juego funcional.
-   [ ] El juego se carga bajo demanda.
-   [ ] La navegación fuera del juego limpia sus recursos.
-   [ ] La autenticación funciona si se incluye en el primer
    lanzamiento.
-   [ ] Las puntuaciones tienen un flujo de guardado seguro definido
    antes de mostrarse como oficiales.
-   [ ] Las tablas de Supabase tienen políticas de acceso verificadas.
-   [ ] Los errores de carga y red no bloquean toda la web.
-   [ ] Existe documentación para ejecutar y desplegar el proyecto.

No es necesario completar todas las funciones futuras antes de publicar
una primera versión útil.

------------------------------------------------------------------------

## 16. Riesgos y decisiones pendientes

### Riesgos principales

  -----------------------------------------------------------------------
  Riesgo                              Mitigación
  ----------------------------------- -----------------------------------
  Juegos demasiado pesados            Carga diferida, optimización de
                                      recursos y medición

  Fugas de memoria entre partidas     Contrato `destroy()` y pruebas de
                                      navegación

  Puntuaciones manipuladas            Validación de servidor,
                                      restricciones y límites

  Dependencia excesiva de un motor    Contrato común y adaptadores

  Catálogo difícil de mantener        Fuente única de metadatos y
                                      convenciones claras

  Complejidad prematura               Desarrollar solo lo necesario para
                                      la siguiente fase

  Costes o límites de servicios       Revisar cuotas, límites y
                                      condiciones vigentes antes del
                                      lanzamiento
  -----------------------------------------------------------------------

### Decisiones que deben confirmarse durante el desarrollo

-   Si el catálogo será estático o editable desde Supabase.
-   Si se permitirán puntuaciones anónimas.
-   Qué juegos necesitan clasificaciones globales.
-   Qué nivel de validación necesita cada juego.
-   Si los recursos se alojarán en Netlify o en almacenamiento/CDN
    separado.
-   Si se utilizará un único repositorio o un monorepo con paquetes.
-   Qué navegadores y dispositivos serán objetivo prioritario.
-   Si habrá cuentas públicas, avatares o funciones sociales.

Estas decisiones no necesitan bloquear el inicio del proyecto; deben
resolverse cuando una fase las requiera.

------------------------------------------------------------------------

## 17. Convenciones de desarrollo

-   Mantener los cambios pequeños y comprobables.
-   No añadir dependencias sin una razón clara.
-   Usar TypeScript para contratos y datos compartidos.
-   No introducir lógica específica de un juego en componentes
    generales.
-   Versionar migraciones SQL.
-   No guardar secretos en Git.
-   Documentar cómo añadir un juego nuevo.
-   Probar tanto el camino correcto como los errores de carga y red.
-   Actualizar este documento cuando una decisión arquitectónica cambie.

### Plantilla para documentar cada juego

``` md
# Nombre del juego

- **Slug:**
- **Motor:** Phaser / PlayCanvas
- **Versión:**
- **Estado:** prototipo / desarrollo / publicado
- **Controles:**
- **Compatible con táctil:** sí / no
- **Puntuaciones:** sí / no
- **Guardado:** ninguno / local / cuenta / servidor

## Descripción

## Mecánicas

## Recursos

## Integración con la plataforma

## Pruebas

## Problemas conocidos
```

------------------------------------------------------------------------

## 18. Próximo paso recomendado

Empezar por la **Fase 0 y la Fase 1**: crear el repositorio, configurar
Astro + React + TypeScript + Tailwind, desplegar una página sencilla en
Netlify y construir el catálogo con datos ficticios.

Después, integrar un único juego Phaser antes de diseñar todo el sistema
de cuentas y puntuaciones. Esta prueba validará la arquitectura
principal y permitirá tomar decisiones con código real en lugar de
anticipar problemas que quizá no aparezcan.

El documento debe evolucionar junto con el proyecto: es una referencia
de diseño inicial, no una especificación inmutable.
