# PURRGRID — Game Design Document

**Versión:** 0.1  
**Estado:** Concepto / MVP  
**Género:** Puzzle de lógica y colocación  
**Plataforma:** Navegador  
**Tecnología objetivo:** Phaser 3 + TypeScript  
**Modo:** Single-player  
**Orientación:** Adaptable a móvil y escritorio

---

## 1. Visión general

**PURRGRID** es un puzle de lógica en el que el jugador debe colocar gatos sobre una cuadrícula dividida en regiones de distintos colores y formas.

Cada región debe contener exactamente un gato. Además:
- No puede haber dos gatos en la misma fila.
- No puede haber dos gatos en la misma columna.
- Dos gatos no pueden tocarse, ni siquiera en diagonal.

El reto consiste en encontrar una disposición que satisfaga todas las restricciones simultáneamente.

La experiencia debe ser fácil de comprender visualmente, pero ofrecer niveles que exijan deducción, planificación y descarte de posibilidades.

> Nombre provisional: PURRGRID. Se puede cambiar cuando se defina la identidad visual del juego.

## 2. Reglas fundamentales

### 2.1. Tablero

- El tablero es una cuadrícula de `N × N`.
- Está dividido en exactamente `N` regiones.
- Las regiones tienen formas y tamaños variados.
- Cada celda pertenece a una única región.
- Cada región debe contener exactamente un gato.
- En el modo estándar hay `N` gatos.

### 2.2. Restricciones de colocación

Una configuración es válida si cumple todas estas condiciones:

1. **Una por región:** cada región contiene exactamente un gato.
2. **Una por fila:** cada fila contiene exactamente un gato.
3. **Una por columna:** cada columna contiene exactamente un gato.
4. **Sin contacto:** dos gatos no pueden ocupar celdas vecinas, incluyendo diagonales.

La regla de contacto se aplica a las ocho celdas que rodean a una posición:

```text
X X X
X G X
X X X
```

`G` representa un gato y `X` las posiciones en las que no puede colocarse otro gato por proximidad. La regla solo afecta a celdas inmediatamente adyacentes; no prohíbe gatos en cualquier punto de una misma diagonal.

### 2.3. Interacción

- Tocar una celda vacía coloca un gato.
- Tocar una celda que ya contiene un gato lo retira.
- Las posiciones que incumplan una regla pueden marcarse visualmente.
- El jugador puede probar configuraciones sin penalización en el modo clásico.
- El nivel se completa cuando todas las regiones tienen exactamente un gato y no existe ninguna infracción.

Es importante distinguir entre una posición imposible y una posición que simplemente todavía no permite completar el puzle. El juego no debe marcar como incorrecta una colocación válida solo porque no sea la solución final.

## 3. Bucle principal

1. El jugador abre un nivel.
2. Observa la cuadrícula y sus regiones coloreadas.
3. Analiza las restricciones de filas, columnas, regiones y proximidad.
4. Coloca gatos en las celdas que considera correctas.
5. Utiliza las marcas visuales para detectar conflictos.
6. Completa una configuración válida.
7. Recibe una celebración breve y desbloquea el siguiente nivel.

## 4. Diseño de niveles

### 4.1. Tamaños de tablero

Progresión orientativa:

| Etapa | Tamaño | Gatos | Objetivo |
|---|---:|---:|---|
| Tutorial | 4 × 4 | 4 | Aprender las reglas |
| Fácil | 5 × 5 | 5 | Combinar región y fila |
| Normal | 6 × 6 | 6 | Usar todas las restricciones |
| Intermedio | 7 × 7 | 7 | Resolver regiones irregulares |
| Difícil | 8 × 8 | 8 | Deducción y descarte |
| Experto | 9 × 9 | 9 | Puzles más exigentes |

Estos tamaños son propuestas iniciales. La regla de no contacto puede hacer que algunos tamaños o diseños sean mucho más difíciles de resolver que otros.

### 4.2. Diseño de regiones

Las regiones deben:
- Cubrir todo el tablero.
- No solaparse.
- Ser conexas ortogonalmente: todas sus celdas deben poder recorrerse dentro de la región moviéndose arriba, abajo, izquierda o derecha.
- Tener formas variadas y reconocibles.
- Contener exactamente una celda de la solución.

No es necesario que las regiones tengan el mismo tamaño. Las diferencias extremas de tamaño deben reservarse para niveles diseñados con cuidado.

### 4.3. Progresión de dificultad

La dificultad debe aumentar principalmente mediante:
- Regiones con formas más irregulares.
- Regiones que atraviesan varias filas y columnas.
- Menos deducciones inmediatas.
- Más celdas que parecen posibles al principio.
- Mayor dependencia de combinar varias restricciones.

No aumentar la dificultad únicamente haciendo el tablero más grande.

## 5. Generación y validación de puzles

La generación debe garantizar que el puzle tiene solución. Idealmente, cada nivel tendrá una única solución.

### 5.1. Representación del tablero

```ts
type CellId = number;
type RegionId = number;

interface Cell {
  row: number;
  col: number;
  regionId: RegionId;
}

interface PuzzleLevel {
  id: string;
  size: number;
  cells: Cell[][];
  solution: CellId[];
  difficulty: "tutorial" | "easy" | "normal" | "hard" | "expert";
  seed?: number;
}
```

La solución no debe enviarse al cliente en niveles competitivos o desafíos diarios si se quiere evitar que sea trivial inspeccionarla. En el MVP local puede estar incluida en los datos de nivel.

### 5.2. Generación recomendada

En lugar de crear regiones aleatorias y esperar que funcionen:

1. Generar una solución válida de `N` gatos.
2. Garantizar que no comparten fila ni columna.
3. Garantizar que no se tocan, ni horizontal, vertical ni diagonalmente.
4. Dividir las celdas del tablero en `N` regiones conexas.
5. Comprobar que cada región contiene exactamente un gato de la solución.
6. Ejecutar un solucionador sobre el puzle.
7. Aceptar el nivel solo si tiene una única solución, cuando el modo lo requiera.
8. Medir su dificultad y descartar diseños triviales o excesivamente difíciles.

La generación debe tener límites de intentos y poder recurrir a niveles creados manualmente si no encuentra un diseño adecuado.

### 5.3. Solucionador

Se recomienda implementar un solucionador por backtracking:
- Elegir una fila o región pendiente.
- Enumerar las celdas candidatas que no incumplan restricciones.
- Colocar provisionalmente un gato.
- Continuar con la siguiente decisión.
- Retroceder cuando no queden candidatos.
- Contar soluciones hasta encontrar dos: cero significa que el nivel no tiene solución; una significa solución única; dos o más significa que no es único.

Para mejorar el rendimiento, elegir primero la fila, región o variable con menos candidatos disponibles (heurística MRV).

### 5.4. Validaciones

El validador debe comprobar:
- Exactamente `N` gatos para un tablero `N × N`.
- Exactamente un gato por fila.
- Exactamente un gato por columna.
- Exactamente un gato por región.
- Ninguna pareja de gatos está en celdas adyacentes, incluyendo diagonales.
- Todas las celdas pertenecen a una región válida.
- Todas las regiones son conexas.
- El nivel tiene una o más soluciones y, preferiblemente, una sola.

## 6. Interfaz y experiencia de usuario

### 6.1. Pantalla de juego

Elementos:
- Número o nombre del nivel.
- Cuadrícula central.
- Bordes o colores de las regiones.
- Gatos colocados.
- Indicador discreto de conflictos.
- Botón de deshacer.
- Botón de reiniciar.
- Botón de pista, en una versión posterior.
- Acceso a pausa y ajustes.

### 6.2. Representación de regiones

Cada región debe tener un color distinguible. Además del color:
- Dibujar un borde más marcado entre regiones.
- Mantener líneas internas de cuadrícula más sutiles.
- Considerar patrones o pequeñas marcas para mejorar la accesibilidad.
- Evitar que el color de una región dificulte ver el gato.

### 6.3. Feedback de reglas

Se propone un sistema de feedback configurable:

**Modo relajado**
- No impide colocar gatos en posiciones conflictivas.
- Resalta las infracciones para que el jugador pueda aprender.
- No revela automáticamente cuál es la solución.

**Modo estricto**
- Impide colocar un gato en una celda que infrinja directamente una regla con los gatos actuales.
- No impide movimientos que sean válidos localmente pero conduzcan a un callejón sin salida.

El modo relajado debería ser el predeterminado en el MVP. La comprobación de victoria siempre aplica todas las reglas.

### 6.4. Dirección artística

Temática acogedora y simpática:
- Gatos expresivos, con siluetas claras.
- Regiones con colores pastel o tonos suaves.
- Animación breve al colocar o retirar un gato.
- Pequeñas reacciones de los gatos al completar una fila, región o nivel.
- Interfaz limpia que priorice la lectura del tablero.

Los gatos deben mantener contraste suficiente respecto al fondo y no ocultar los límites de las celdas.

## 7. Ayudas

Posibles ayudas:
- **Deshacer:** retirar la última colocación o restaurar el estado anterior.
- **Reiniciar:** vaciar el tablero.
- **Resaltar conflictos:** indicar qué reglas incumple una colocación.
- **Pista:** señalar una celda que necesariamente debe contener un gato, sin revelar toda la solución.
- **Comprobación:** indicar si la configuración parcial todavía puede conducir a una solución.

Para el MVP: deshacer, reiniciar y resaltado de conflictos. Las pistas pueden añadirse cuando exista un solucionador fiable.

## 8. Modos de juego

### MVP — Clásico
- Niveles progresivos.
- Sin límite de tiempo.
- Sin penalización por probar.
- Deshacer y reiniciar.
- Solución válida para completar el nivel.

### Modos futuros
- **Desafío diario:** mismo puzle para todos los jugadores durante el día.
- **Contrarreloj:** resolver antes de que se agote el tiempo.
- **Sin errores:** cada conflicto consume una oportunidad.
- **Reto experto:** puzles de mayor tamaño y sin pistas.
- **Editor de niveles:** crear regiones y validar que el puzle tenga solución única.

## 9. Progresión y puntuación

- Completar un nivel desbloquea el siguiente.
- Se puede volver a niveles anteriores.
- Guardado automático del progreso.
- Registrar tiempo y número de gatos colocados/retirados, si se desea.

La puntuación no debe castigar demasiado la experimentación: la esencia del juego es deducir. En una versión posterior se pueden conceder hasta tres estrellas por tiempo, uso de pistas y errores, pero el criterio debe ser transparente.

## 10. Arquitectura técnica

### Stack
- Phaser 3: escena, cuadrícula, input y animaciones.
- TypeScript: modelos y lógica.
- Astro + React: integración con la plataforma.
- Tailwind CSS: interfaz externa al canvas.
- Supabase: opcional para progreso, cuentas y desafíos diarios.

### Estructura propuesta

```text
src/games/purrgrid/
├── scenes/
│   ├── BootScene.ts
│   ├── MenuScene.ts
│   └── GameScene.ts
├── systems/
│   ├── BoardValidator.ts
│   ├── ConstraintChecker.ts
│   ├── PuzzleSolver.ts
│   ├── PuzzleGenerator.ts
│   ├── MoveHistory.ts
│   └── ProgressionSystem.ts
├── entities/
│   ├── GridCell.ts
│   └── CatToken.ts
├── ui/
│   ├── GameHUD.ts
│   ├── LevelCompletePanel.ts
│   └── PauseMenu.ts
├── data/
│   ├── levels.ts
│   └── regions.ts
├── types/
│   └── puzzle.ts
└── index.ts
```

### Separación de lógica y presentación

Toda la lógica de restricciones debe funcionar sin Phaser:
- El modelo almacena regiones y gatos.
- `ConstraintChecker` comprueba filas, columnas, regiones y adyacencia.
- `PuzzleSolver` busca soluciones.
- `PuzzleGenerator` crea niveles.
- Phaser dibuja la cuadrícula y representa las acciones.

Esto permite probar la lógica con tests unitarios y cambiar la presentación sin rehacer el solucionador.

## 11. Persistencia

Para el MVP, usar almacenamiento local:

```ts
interface PlayerProgress {
  unlockedLevel: number;
  completedLevels: string[];
  bestTimes: Record<string, number>;
  settings: {
    soundEnabled: boolean;
    reducedMotion: boolean;
    conflictHintsEnabled: boolean;
  };
}
```

En una versión con Supabase se podrían sincronizar perfil, niveles completados, mejores tiempos, desafíos diarios y ajustes. El juego debe poder jugarse sin iniciar sesión.

## 12. MVP

### Incluido
- Una escena de juego.
- Tablero 5 × 5.
- Cinco regiones conexas de formas irregulares.
- Cinco gatos por nivel.
- Restricción de una unidad por fila.
- Restricción de una unidad por columna.
- Restricción de una unidad por región.
- Restricción de no contacto en las ocho direcciones.
- Colocar y retirar gatos.
- Feedback de conflictos.
- Deshacer y reiniciar.
- Detección de victoria.
- Varios niveles creados manualmente.
- Soporte para ratón y pantalla táctil.

### Fuera del MVP
- Generación procedural.
- Desafíos diarios.
- Clasificaciones.
- Contrarreloj.
- Editor de niveles.
- Pistas avanzadas.
- Tienda, cosméticos y desbloqueo de razas de gatos.
- Sincronización en la nube.

### Criterios de aceptación
1. El tablero muestra regiones diferenciadas correctamente.
2. Cada celda pertenece a una única región.
3. Se puede colocar y retirar un gato.
4. El juego detecta conflictos de fila, columna, región y adyacencia.
5. La adyacencia incluye diagonales inmediatas.
6. No se considera conflicto estar en la misma diagonal a más de una celda de distancia, salvo que también se incumpla otra regla.
7. La victoria exige exactamente un gato por fila, columna y región, sin contactos.
8. Deshacer y reiniciar restauran el estado esperado.
9. Los niveles de prueba tienen solución conocida.
10. La lógica puede probarse sin iniciar Phaser.

## 13. Plan de desarrollo

### Hito 1 — Reglas y modelo
- Definir el modelo de tablero, celdas, regiones y gatos.
- Implementar comprobación de filas y columnas.
- Implementar comprobación de regiones.
- Implementar adyacencia de ocho direcciones.
- Añadir pruebas unitarias.

### Hito 2 — Prototipo visual
- Dibujar cuadrícula y regiones.
- Renderizar gatos.
- Implementar interacción táctil y ratón.
- Mostrar conflictos.

### Hito 3 — Experiencia
- Deshacer y reiniciar.
- Animaciones de colocación.
- Pantalla de victoria.
- Ajustes responsive y accesibilidad.

### Hito 4 — Contenido
- Diseñar niveles manuales.
- Comprobar que todos tienen solución.
- Ajustar la progresión de dificultad.
- Añadir tiempos y récords.

### Hito 5 — Generación
- Implementar solucionador.
- Implementar generación de soluciones válidas.
- Generar regiones conexas con un gato de la solución en cada una.
- Comprobar unicidad y dificultad.

## 14. Riesgos y decisiones pendientes

| Riesgo | Mitigación |
|---|---|
| Niveles sin solución | Solucionador automático y validación |
| Varias soluciones inesperadas | Contar soluciones y exigir unicidad en niveles estándar |
| Regiones visualmente confusas | Bordes claros y paleta accesible |
| Dificultad irregular | Medir candidatos y validar con pruebas |
| Feedback demasiado revelador | Separar conflictos directos de pistas de solución |
| Generación procedural costosa | Empezar con niveles manuales y generar offline |

### Decisiones futuras
- Nombre y temática definitivos.
- Tamaños máximos del tablero.
- Si todos los niveles deben tener solución única.
- Si el modo estricto estará disponible.
- Sistema de estrellas.
- Desafío diario y clasificación.
- Personalización visual de los gatos.

## 15. Primer objetivo de implementación

**Crear un tablero 5 × 5 con cinco regiones irregulares y colocar cinco gatos respetando todas las reglas.**

Primero implementar y probar el validador, sin interfaz. Después dibujar el tablero y permitir colocar y retirar gatos.

El primer prototipo se considera satisfactorio cuando puede detectar correctamente:
- Dos gatos en una misma fila.
- Dos gatos en una misma columna.
- Dos gatos en una misma región.
- Dos gatos que se tocan horizontalmente, verticalmente o en diagonal.
- Una solución completa válida.

Este núcleo lógico será la base de PURRGRID.
