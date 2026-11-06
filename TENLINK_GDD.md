# TENLINK — Game Design Document

**Versión:** 0.2  
**Estado:** MVP implementado  
**Género:** Puzzle casual de números sin fin  
**Plataforma:** Navegador  
**Tecnología:** Astro + React + Phaser 3 + TypeScript

---

## 1. Concepto

TENLINK es un puzzle numérico infinito sobre una cuadrícula de 9×9. El jugador
elimina parejas de números conectados cuya suma sea exactamente 10. Cada pareja
despeja casillas, y cuando una fila queda completamente vacía, las filas
inferiores suben para ocupar su lugar.

La partida empieza con 35 números aleatorios, no con el tablero lleno. El jugador
puede pedir hasta 35 números más en cualquier momento para seguir encontrando
parejas. La partida termina cuando el tablero está lleno y ya no existe ninguna
pareja válida.

## 2. Pilares de diseño

1. **Reglas sencillas:** dos números conectados que sumen 10.
2. **Lectura espacial:** la dificultad está en descubrir conexiones válidas.
3. **Planificación:** el orden de las eliminaciones cambia el tablero.
4. **Partida sin fin:** no hay niveles; el objetivo es superar el récord personal.
5. **Feedback claro:** el jugador siempre sabe por qué una pareja es válida o no.

## 3. Reglas principales

### 3.1. Valores

Cada casilla ocupada contiene un número entero del 1 al 9.

| Pareja | Resultado |
|---|---:|
| 1 + 9 | 10 |
| 2 + 8 | 10 |
| 3 + 7 | 10 |
| 4 + 6 | 10 |
| 5 + 5 | 10 |

Se necesitan dos casillas distintas. Un número no puede emparejarse consigo
mismo.

### 3.2. Conexiones válidas

Dos casillas pueden formar pareja si son vecinas en una de estas direcciones:

- Horizontal: izquierda o derecha.
- Vertical: arriba o abajo.
- Diagonal: cualquiera de las cuatro diagonales.
- Continuidad de fila: última casilla de una fila y primera casilla de la
  siguiente.

La continuidad de fila solo conecta esos dos extremos consecutivos del recorrido
de lectura. No existe wrap-around general.

### 3.3. Casillas vacías

- Una casilla vacía no puede seleccionarse.
- Una casilla vacía no permite saltar por encima de otros números.
- Las casillas vacías parciales de una fila permanecen en su columna.

### 3.4. Compactación de filas

Cuando una pareja deja una fila completamente vacía:

1. La fila vacía desaparece.
2. Las filas inferiores suben una posición, conservando su contenido y columnas.
3. Se añade una fila vacía al final del tablero.

Nunca quedan huecos verticales entre filas con números. Esto puede hacer que dos
números que antes estaban separados queden conectados.

### 3.5. Reposición de números

El botón **MÁS NÚMEROS** rellena casillas vacías con valores aleatorios del 1 al 9,
hasta un máximo de 35 números nuevos. Si quedan menos de 35 huecos, se rellenan
todos los disponibles. Cuando hay espacio para al menos dos números, se garantiza
al menos una pareja conectada entre los números nuevos.

## 4. Flujo de partida

1. El jugador empieza una partida nueva.
2. Se genera un tablero de 9×9 con exactamente 35 números.
3. El jugador selecciona dos números.
4. Si suman 10 y están conectados, desaparecen.
5. Si la fila queda vacía, el tablero se compacta hacia arriba.
6. El jugador puede pedir más números cuando le falten parejas.
7. La partida termina si el tablero está lleno y no quedan parejas válidas.
8. El récord personal se actualiza con el mayor número de parejas eliminadas.

No hay niveles, estrellas, deshacer ni resaltado de parejas. El jugador decide
libremente qué pareja formar.

## 5. Interfaz

Elementos principales:

- Cuadrícula de 9×9 centrada.
- Números grandes y legibles, todos con el mismo estilo visual.
- Barra superior con parejas, tiempo y ocupación del tablero.
- Panel lateral con objetivo, récord y ayuda contextual.
- Botones: **MÁS NÚMEROS**, **PISTA**, **REINICIAR**, **PAUSA** y **MENÚ**.
- Mensajes de error para parejas sin suma 10 o sin conexión.
- Panel de fin de partida con estadísticas y opción de nueva partida.

La información no depende del color: no hay grupos cromáticos de valores.

## 6. Accesibilidad

- Compatibilidad con ratón, pantalla táctil y teclado.
- Flechas para mover el cursor, Enter o Espacio para seleccionar.
- `N` para pedir más números, `H` para pista, `R` para reiniciar y `Esc` para pausar.
- Movimiento reducido configurable.
- Sonido configurable.
- Contraste suficiente entre números, casillas y fondo.

## 7. Puntuación y progreso

Se guarda una única mejor partida:

- `bestPairs`: mayor número de parejas eliminadas en una partida.
- `bestTimeMs`: tiempo de esa partida.
- `runs`: número total de partidas jugadas.

La puntuación de la clasificación prioriza las parejas y usa el tiempo como
desempate:

```text
score = bestPairs * 1_000_000_000 - bestTimeMs
```

Una pareja más siempre vale más que cualquier diferencia de tiempo.

## 8. Generación y lógica pura

La lógica del puzzle es independiente de Phaser para poder probarla con tests:

- `BoardGenerator`: crea tableros y rellena casillas vacías.
- `BoardManager`: elimina parejas y compacta filas.
- `PairValidator`: valida suma y geometría de las conexiones.
- `ProgressionSystem`: guarda récords y ajustes.
- `GameScene`: coordina entrada, animaciones y HUD.

## 9. Arquitectura

```text
src/games/tenlink/
├── config.ts
├── entities/
│   └── NumberCell.ts
├── render/
│   ├── backdrop.ts
│   ├── theme.ts
│   └── ui.ts
├── scenes/
│   ├── BootScene.ts
│   ├── GameScene.ts
│   └── MenuScene.ts
├── systems/
│   ├── BoardGenerator.ts
│   ├── BoardManager.ts
│   ├── PairValidator.ts
│   ├── ProgressionSystem.ts
│   └── Sfx.ts
├── tests/
│   └── tenlink.test.mjs
├── types/
│   └── GameTypes.ts
└── ui/
    ├── GameHUD.ts
    ├── PauseMenu.ts
    └── RunEndPanel.ts
```

## 10. Pruebas esenciales

- El tablero inicial tiene 9×9 casillas y exactamente 35 números.
- Las cinco parejas que suman 10 funcionan si están conectadas.
- Dos números que no suman 10 nunca se eliminan.
- Se detectan las ocho direcciones de vecindad.
- La continuidad conecta solo el final de una fila con el inicio de la siguiente.
- No se puede saltar por encima de números intermedios.
- Una casilla vacía no se puede seleccionar ni usar para saltar.
- Las filas vacías desaparecen y las inferiores suben sin dejar huecos.
- Aplicar una pareja compacta las filas cuando corresponde.
- Rellenar números respeta el máximo de 35 y no muta el tablero anterior.
- Se detecta un tablero sin parejas válidas.
- El progreso conserva la mejor partida y desempata por tiempo.
- La puntuación premia más parejas y, a igualdad, menos tiempo.

## 11. Riesgos de diseño

- **Generación aleatoria:** un tablero podría no ofrecer parejas; el generador
  garantiza al menos una pareja conectada al crear o reponer números.
- **Tableros llenos sin salida:** el jugador ve el panel de fin de partida y puede
  empezar de nuevo.
- **Dificultad artificial:** evitar depender de adivinar; la pista y los mensajes
  explican la geometría.
- **Pantallas pequeñas:** el tablero se escala con Phaser Scale FIT.

---

## Resumen

TENLINK es un puzzle infinito de parejas que suman 10. Su identidad está en la
geometría de las conexiones, la compactación de filas y la gestión de un tablero
que se vacía y se rellena hasta que el jugador se queda sin movimientos.
