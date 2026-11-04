# CHROMA — Game Design Document

**Versión:** 0.1  
**Género:** Puzzle casual de lógica  
**Plataforma:** Navegador  
**Tecnología:** Phaser 3 + TypeScript, integrado en Astro  
**Modo:** Un jugador  
**Orientación:** Portrait-first, adaptable a escritorio

## 1. Visión general

CHROMA es un juego de puzles en el que hay que ordenar líquidos de distintos colores en botellas. Cada botella tiene una capacidad limitada y el objetivo es conseguir que cada recipiente que contiene líquido termine lleno con un único color.

Pilares:
- Reglas sencillas y fáciles de entender.
- Movimientos satisfactorios, con animaciones claras.
- Dificultad progresiva y niveles justos.
- Reintentos rápidos mediante deshacer y reiniciar.
- Controles cómodos con ratón y pantalla táctil.

## 2. Bucle principal

1. El jugador abre un nivel.
2. Observa las botellas y los segmentos de colores.
3. Selecciona una botella de origen y otra de destino.
4. El juego valida el movimiento.
5. Se vierte el líquido con una animación.
6. Se repite hasta ordenar todos los colores.
7. Se muestra el resultado y se desbloquea el siguiente nivel.

**Victoria:** todas las botellas que contienen líquido están llenas con un único color. Las botellas vacías restantes no impiden completar el nivel.

## 3. Reglas

### Botellas
- Capacidad inicial: 4 unidades.
- Cada segmento representa una unidad de líquido.
- Los segmentos se almacenan desde el fondo hasta la superficie.
- Una botella puede estar vacía, parcialmente llena o llena.

### Movimiento
El jugador selecciona una botella de origen y otra de destino. El movimiento es válido cuando:
- El origen no está vacío.
- El destino no está lleno.
- El destino está vacío o su segmento superior coincide con el segmento superior del origen.
- Origen y destino son botellas distintas.

Se vierte el máximo número de segmentos consecutivos del color superior que quepa en el destino.

Ejemplo: si el origen tiene `[rojo, azul, azul]` (fondo a superficie) y el destino tiene `[azul]`, se pueden transferir los dos segmentos azules si hay espacio.

### Controles
- Clic/toque en una botella: seleccionarla como origen.
- Clic/toque en otra: intentar verter.
- Seleccionar la misma botella: cancelar selección.
- Seleccionar otra botella como origen: cambiar selección.
- Movimiento inválido: feedback visual breve, sin alterar el estado.

### Ayudas
- **Deshacer:** revierte el último movimiento.
- **Reiniciar:** restaura el estado inicial.
- **Pista:** sugerir un movimiento (futuro).
- **Pausa:** detener el temporizador si se añade ese modo.

El MVP incluye deshacer y reiniciar.

## 4. Diseño de niveles

Cada nivel define:
- Número de colores.
- Capacidad de las botellas.
- Número de botellas vacías.
- Distribución inicial de segmentos.
- Identificador y semilla opcional.
- Dificultad estimada.

Progresión orientativa:

| Etapa | Colores | Botellas vacías | Objetivo |
|---|---:|---:|---|
| Tutorial | 2 | 2 | Aprender a verter |
| Inicial | 3 | 2 | Comprender las reglas |
| Fácil | 4 | 2 | Planificar movimientos |
| Intermedio | 5 | 2 | Gestionar espacio |
| Avanzado | 6 | 2 | Anticipar bloqueos |
| Experto | 7–8 | 2 | Resolver secuencias largas |

La dificultad no depende solo del número de colores: también importa cómo están distribuidos.

## 5. Generación y validación de puzles

No se deben generar tableros aleatorios y asumir que tienen solución.

### Generación mediante mezcla inversa
1. Crear un estado resuelto: una botella llena por color.
2. Añadir las botellas vacías.
3. Aplicar movimientos legales de mezcla para generar el estado inicial.
4. Evitar movimientos que deshagan inmediatamente el anterior.
5. Comprobar que el resultado no sea trivial.

Al partir de una solución conocida y aplicar movimientos legales, se conserva una ruta de vuelta a la solución.

### Validación
Comprobar que:
- El total de unidades de cada color equivale a la capacidad de una botella.
- Ninguna botella supera su capacidad.
- El número de colores y recipientes es coherente.
- Existe una solución.
- El nivel no comienza ya resuelto salvo que sea intencionado.

Para niveles diseñados manualmente, conviene usar un solucionador automático.

## 6. Interfaz y experiencia

### Pantalla de juego
- Número/nombre del nivel.
- Botón de pausa.
- Zona central con las botellas.
- Contador de movimientos.
- Botones de deshacer y reiniciar.
- Botón de pista en una versión posterior.

En móvil, distribuir las botellas en varias filas si no caben cómodamente en una sola.

### Feedback visual
- Botella seleccionada: se eleva ligeramente.
- Movimiento válido: inclinación y transferencia del líquido.
- Movimiento inválido: pequeño desplazamiento o vibración.
- Botella completada: efecto discreto.
- Victoria: animación breve y transición al siguiente nivel.

Las animaciones deben ser cortas y no bloquear innecesariamente la interacción.

### Accesibilidad
- No depender exclusivamente del color: ofrecer patrones o símbolos opcionales.
- Mantener contraste entre segmentos y recipiente.
- Respetar la preferencia de reducir movimiento.
- Usar áreas táctiles amplias.
- No depender del sonido para comunicar información.

### Dirección artística
Interfaz limpia y minimalista, recipientes de vidrio con reflejos y contornos legibles, líquidos vivos y claramente diferenciados. La temática puede ser laboratorio, alquimia o líquidos mágicos sin alterar las reglas.

## 7. Modos de juego

**MVP — Clásico:** niveles progresivos, movimientos ilimitados, deshacer y reiniciar.

Posibles modos futuros:
- **Contrarreloj:** resolver tantos niveles como sea posible en un tiempo.
- **Movimientos limitados:** resolver con un máximo de movimientos.
- **Desafío diario:** el mismo puzle para todos cada día.
- **Sin ayudas:** sin deshacer ni pistas.
- **Infinito:** niveles generados de dificultad creciente.

No implementar varios modos antes de validar el clásico.

## 8. Progresión y puntuación

- Completar un nivel desbloquea el siguiente.
- Se permite volver a niveles anteriores.
- Guardado automático del progreso.
- Mostrar movimientos realizados y mejor marca personal.

Más adelante se pueden conceder hasta tres estrellas según la eficiencia, con umbrales definidos por nivel. En el modo clásico, deshacer no debería penalizar.

## 9. Audio

Efectos sugeridos: selección, inicio del vertido, líquido cayendo, movimiento inválido, botella completada y nivel superado. Música opcional, con controles independientes para música y efectos.

## 10. Arquitectura técnica

### Stack
- Phaser 3: escenas, renderizado, input y animaciones.
- TypeScript: lógica y modelos.
- Astro + React: integración con la plataforma.
- Tailwind CSS: interfaz externa al canvas.
- Supabase: opcional para cuentas, progreso y desafíos diarios.

### Estructura propuesta

```text
src/games/chroma/
├── scenes/
│   ├── BootScene.ts
│   ├── MenuScene.ts
│   └── GameScene.ts
├── systems/
│   ├── PuzzleGenerator.ts
│   ├── PuzzleValidator.ts
│   ├── MoveValidator.ts
│   ├── MoveHistory.ts
│   ├── PuzzleSolver.ts
│   └── ProgressionSystem.ts
├── entities/
│   └── Bottle.ts
├── ui/
│   ├── GameHUD.ts
│   ├── LevelCompletePanel.ts
│   └── PauseMenu.ts
├── data/
│   ├── levels.ts
│   └── colors.ts
├── types/
│   └── puzzle.ts
└── index.ts
```

### Modelo de datos

```ts
type ColorId = string;

interface Bottle {
  capacity: number;
  segments: ColorId[]; // Fondo -> superficie
}

interface PuzzleLevel {
  id: string;
  bottles: Bottle[];
  colorCount: number;
  emptyBottleCount: number;
  seed?: number;
}
```

La lógica del puzle debe ser independiente de Phaser. Validación, movimientos, historial y generación trabajarán con datos TypeScript; Phaser solo representará el estado y reproducirá animaciones. Así se pueden probar las reglas sin iniciar el juego.

Estado mínimo:

```ts
interface GameState {
  levelId: string;
  bottles: Bottle[];
  selectedBottle: number | null;
  moveCount: number;
  history: Bottle[][];
  status: "playing" | "won";
}
```

Cada movimiento debe actualizar el estado lógico de forma atómica. La animación representa el movimiento ya validado; hay que impedir que interacciones simultáneas corrompan el estado.

## 11. Persistencia

Para el MVP, guardar localmente:

```ts
interface PlayerProgress {
  unlockedLevel: number;
  completedLevels: string[];
  bestMoveCounts: Record<string, number>;
  settings: {
    soundEnabled: boolean;
    reducedMotion: boolean;
    colorPatternsEnabled: boolean;
  };
}
```

En una futura integración con Supabase se pueden sincronizar perfil, niveles completados, mejores marcas, desafíos diarios y ajustes. El juego debe poder jugarse sin iniciar sesión.

## 12. MVP

### Incluido
- Una escena de juego.
- Botellas de capacidad 4.
- Entre 2 y 4 colores.
- Dos botellas vacías.
- Selección de origen y destino.
- Validación de movimientos.
- Transferencia máxima de segmentos consecutivos del mismo color.
- Detección de victoria.
- Deshacer y reiniciar.
- Contador de movimientos.
- Pequeño conjunto de niveles de prueba.
- Ratón y pantalla táctil.

### Fuera del MVP
- Cuentas y sincronización en la nube.
- Tienda y monedas.
- Pistas.
- Desafíos diarios.
- Contrarreloj.
- Recipientes especiales.
- Clasificaciones online.
- Generación procedural avanzada.

### Criterios de aceptación
1. Se pueden seleccionar dos botellas y realizar un movimiento válido.
2. Los movimientos inválidos no alteran el estado.
3. Nunca se supera la capacidad.
4. El vertido transfiere los segmentos correctos.
5. Deshacer restaura exactamente el estado anterior.
6. Reiniciar restaura el estado inicial.
7. La victoria se detecta correctamente.
8. Funciona con ratón y pantalla táctil.
9. La lógica puede probarse sin Phaser.
10. Los niveles incluidos tienen solución conocida.

## 13. Plan de desarrollo

### Hito 1 — Núcleo lógico
- Definir modelos de botella y nivel.
- Implementar validación y transferencia.
- Implementar detección de victoria.
- Implementar historial.
- Añadir pruebas unitarias.

### Hito 2 — Prototipo visual
- Crear escena de juego.
- Dibujar botellas y segmentos.
- Implementar selección con ratón y táctil.
- Sincronizar la vista con el estado lógico.

### Hito 3 — Experiencia
- Animación de vertido.
- Deshacer y reiniciar.
- Contador de movimientos.
- Pantalla de victoria.
- Ajustes para móvil.

### Hito 4 — Niveles
- Crear niveles iniciales.
- Implementar mezcla inversa.
- Añadir validación automática.
- Ajustar dificultad.

### Hito 5 — Integración
- Integrar en la plataforma.
- Guardar progreso local.
- Preparar persistencia opcional con Supabase.

## 14. Riesgos y decisiones pendientes

| Riesgo | Mitigación |
|---|---|
| Niveles sin solución | Generar desde un estado resuelto y validar |
| Dificultad irregular | Métricas y pruebas |
| Input durante animaciones | Bloqueo temporal o cola de acciones |
| Confusión entre colores | Patrones y símbolos opcionales |
| Repetitividad | Variantes solo tras validar el modo clásico |
| Mala experiencia móvil | Diseño portrait-first y objetivos táctiles amplios |

Decisiones futuras: nombre y temática definitivos, cantidad de niveles manuales, generación procedural, estrellas, mecánicas especiales y necesidad de cuentas online.

## 15. Primer objetivo de implementación

**Crear un puzle funcional de tres colores y dos botellas vacías.**

Antes de añadir menús, progresión o persistencia, comprobar que las reglas son correctas, los movimientos se sienten naturales, el vertido es claro y deshacer/reiniciar funcionan. Resolver el puzle debe resultar satisfactorio.

Este prototipo será la base sobre la que construir CHROMA.
