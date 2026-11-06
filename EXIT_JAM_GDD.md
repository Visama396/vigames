# EXIT JAM — Game Design Document

**Versión:** 0.1  
**Estado:** Concepto / MVP por definir  
**Género:** Puzzle de deslizamiento espacial  
**Plataforma:** Navegador  
**Tecnología prevista:** Astro + React + Phaser 3 + TypeScript  
**Nombre provisional:** EXIT JAM

---

## 1. Concepto

EXIT JAM es un juego de puzles en el que el jugador debe despejar una cuadrícula moviendo bloques de distintas formas y tamaños hasta sacarlos por puertas de su mismo color.

Cada bloque tiene un color y ocupa varias casillas. Las puertas se sitúan en los bordes del tablero y también tienen colores. Un bloque solo puede salir por una puerta compatible.

El jugador debe desplazar los bloques, crear espacio para maniobrar y organizar el orden de salida. Una pieza puede bloquear el camino de otra, por lo que resolver el nivel requiere planificar movimientos.

La experiencia se inspira en el género de puzles de deslizamiento y clasificación por colores, pero los niveles, la identidad visual y los sistemas propios deben desarrollarse de forma independiente.

## 2. Pilares de diseño

1. **Lectura espacial inmediata:** entender qué bloque corresponde a cada puerta.
2. **Restricciones claras:** los bloques ocupan espacio real y no pueden atravesarse.
3. **Planificación:** a menudo hay que mover primero piezas que todavía no pueden salir.
4. **Satisfacción al despejar:** cada salida libera espacio y acerca al jugador a completar el nivel.
5. **Dificultad progresiva:** introducir formas, obstáculos y objetivos gradualmente.

## 3. Tablero y piezas

### 3.1. Cuadrícula

El tablero está formado por celdas cuadradas.

Tamaños orientativos:

- Tutorial: 5×5.
- Inicial: 6×6.
- Intermedio: 7×7.
- Avanzado: 8×8 o mayor, si la interfaz lo permite.

El tamaño definitivo debe adaptarse a la pantalla. En móvil, las piezas deben poder arrastrarse con precisión.

### 3.2. Bloques

Cada bloque:

- Tiene un color.
- Ocupa una o varias celdas.
- Tiene una forma definida.
- Se mueve como una sola pieza.
- No puede solaparse con otro bloque ni salirse del tablero, salvo durante una salida válida.

Formas iniciales recomendadas:

- Línea de 2 celdas.
- Línea de 3 celdas.
- Línea de 4 celdas.
- Pieza en forma de L.
- Pieza cuadrada de 2×2.

Para el MVP conviene limitar las piezas a formas rectangulares o líneas rectas. Las formas irregulares pueden introducirse después, cuando las reglas de movimiento estén bien asentadas.

### 3.3. Puertas de salida

Las puertas se colocan en los bordes de la cuadrícula.

- Cada puerta tiene un color.
- Un bloque solo puede utilizar una puerta de su mismo color.
- La puerta debe tener espacio suficiente para que la pieza pueda salir.
- Una salida válida elimina el bloque del tablero.
- Una puerta puede admitir uno o varios bloques, según el diseño del nivel.

**Decisión recomendada para el MVP:** cada puerta corresponde a un color y cada bloque debe salir por una puerta de ese color. El nivel se completa cuando todos los bloques requeridos han salido.

## 4. Reglas de movimiento

### 4.1. Movimiento básico

El jugador selecciona un bloque y lo arrastra o utiliza controles direccionales para moverlo.

Para el primer prototipo se recomienda permitir movimiento en las cuatro direcciones:

- Arriba.
- Abajo.
- Izquierda.
- Derecha.

El movimiento se realiza sobre la cuadrícula, una celda cada vez, o mediante arrastre que se ajusta a posiciones válidas.

### 4.2. Colisiones

- Un bloque no puede atravesar otro bloque.
- Un bloque no puede ocupar celdas fuera del tablero.
- Dos bloques no pueden ocupar la misma celda.
- El movimiento se limita al último punto válido si aparece una colisión.

### 4.3. Restricciones por orientación

Hay dos variantes posibles:

**Movimiento libre:** cualquier pieza puede desplazarse en las cuatro direcciones, siempre que exista espacio.

**Movimiento por eje:** cada pieza solo puede desplazarse en una dirección o eje determinado, como en algunos puzles clásicos de tráfico.

El MVP debe escoger una única variante. Este documento asume movimiento libre para que la forma y el espacio ocupado sean los principales elementos del reto.

### 4.4. Salida

Un bloque puede salir cuando:

1. Está junto al borde que contiene una puerta.
2. Su posición y forma permiten atravesar la puerta sin colisionar.
3. El color del bloque coincide con el de la puerta.
4. El jugador completa el gesto de salida.

La salida se anima y retira la pieza del tablero. Si la puerta no coincide, la pieza no puede salir.

## 5. Bucle de juego

1. El jugador observa la distribución de bloques y puertas.
2. Identifica qué piezas pueden salir directamente.
3. Mueve bloques para liberar rutas y espacio.
4. Saca uno o varios bloques por sus puertas correspondientes.
5. Repite hasta despejar el tablero.
6. Recibe una valoración y desbloquea el siguiente nivel.

El reto no consiste únicamente en encontrar la puerta de cada bloque, sino en determinar qué piezas deben moverse primero para que las demás puedan llegar a ella.

## 6. Objetivos y puntuación

### Objetivo principal

Sacar todos los bloques del tablero utilizando únicamente puertas de su color.

### Valoración por eficiencia

Se puede conceder entre una y tres estrellas según el número de movimientos:

- Tres estrellas: igual o por debajo del objetivo de movimientos.
- Dos estrellas: supera ligeramente el objetivo.
- Una estrella: completa el nivel con más movimientos.

Los umbrales deben definirse por nivel y ajustarse mediante pruebas.

### Contadores

- Movimientos realizados.
- Bloques restantes.
- Progreso de salidas.
- Mejor resultado del jugador.

No es necesario introducir un temporizador en el modo principal. Un modo contrarreloj podría añadirse como variante.

## 7. Dificultad y progresión

La dificultad debe crecer introduciendo una variable cada vez.

| Etapa | Elementos | Objetivo |
|---|---|---|
| Tutorial | Pocas piezas, un color | Aprender a mover y sacar bloques |
| Inicial | Varios colores y puertas | Relacionar bloques con salidas |
| Intermedia | Piezas de tamaños distintos | Aprender a crear espacio |
| Avanzada | Formas irregulares y zonas estrechas | Planificar varios movimientos |
| Experta | Más piezas, obstáculos y rutas cruzadas | Resolver secuencias complejas |

### Mecánicas futuras

- Obstáculos fijos que no se pueden mover.
- Puertas que solo se abren después de sacar otro bloque.
- Bloques grandes que requieren más espacio.
- Puertas compartidas por varios bloques del mismo color.
- Celdas especiales que permiten teletransportar o cambiar de dirección.
- Bloques bloqueados que necesitan una llave.
- Movimientos limitados en determinados niveles.

Estas mecánicas deben introducirse gradualmente. No conviene añadir varias reglas nuevas en un mismo nivel tutorial.

## 8. Diseño de niveles

Los niveles deben diseñarse con una solución conocida y comprobarse mediante un solucionador.

Ejemplo de estructura:

```ts
type Direction = "up" | "down" | "left" | "right";

interface Cell {
  x: number;
  y: number;
}

interface BlockDefinition {
  id: string;
  color: string;
  cells: Cell[];
}

interface DoorDefinition {
  id: string;
  color: string;
  side: Direction;
  start: number;
  length: number;
}

interface LevelDefinition {
  id: string;
  width: number;
  height: number;
  blocks: BlockDefinition[];
  doors: DoorDefinition[];
  targetMoves?: number;
}
```

Las coordenadas de `cells` representan la forma de una pieza respecto a su origen. Esto permite describir piezas rectangulares y formas irregulares.

### Validación de niveles

Un nivel válido debe cumplir:

- Ningún bloque se solapa inicialmente con otro.
- Todos los bloques están dentro del tablero.
- Las puertas están correctamente colocadas en el borde.
- Cada bloque tiene una puerta compatible.
- Existe al menos una secuencia de movimientos que completa el nivel.
- El nivel no requiere atravesar piezas ni realizar movimientos imposibles.

### Generación

Para el MVP, crear niveles manualmente.

En una fase posterior se puede desarrollar un generador que:

1. Parta de una configuración final despejada.
2. Añada bloques y puertas.
3. Aplique movimientos inversos válidos para crear una posición inicial.
4. Compruebe la solvencia con búsqueda de estados.
5. Mida la dificultad según la longitud y ramificación de la solución.

La generación procedural no debe priorizarse hasta tener un conjunto de niveles manuales que demuestre que el juego resulta divertido.

## 9. Interfaz y experiencia de usuario

Elementos principales:

- Cuadrícula con límites claramente visibles.
- Bloques con colores diferenciados.
- Puertas visibles en los bordes.
- Animación de movimiento con ajuste a la cuadrícula.
- Animación de salida.
- Contador de movimientos.
- Indicador de bloques restantes.
- Botón de reinicio.
- Botón de deshacer.
- Botón de pausa y ajustes.

### Identificación de colores

El color no debe ser la única forma de identificar una pieza y su puerta. Se recomienda acompañarlo de:

- Símbolos o patrones.
- Bordes diferenciados.
- Una pequeña marca compartida entre bloque y puerta.
- Opciones de paleta aptas para daltonismo.

## 10. Ayudas y accesibilidad

- **Deshacer:** revierte el último movimiento.
- **Reiniciar:** recupera la disposición inicial.
- **Pista:** resalta un bloque que conviene mover o una ruta útil.
- **Vista de destino:** permite identificar la puerta correspondiente a una pieza.
- Compatibilidad con ratón y pantalla táctil.
- Controles alternativos por teclado.
- Ajuste de animaciones y reducción de movimiento.

Las pistas deben ayudar a entender el siguiente paso sin resolver automáticamente todo el nivel.

## 11. Arquitectura técnica

Propuesta para Phaser 3 + TypeScript:

```text
src/games/exit-jam/
├── scenes/
│   ├── GameScene.ts
│   └── MenuScene.ts
├── systems/
│   ├── BoardManager.ts
│   ├── BlockManager.ts
│   ├── MovementValidator.ts
│   ├── ExitValidator.ts
│   ├── LevelManager.ts
│   ├── MoveHistory.ts
│   └── PuzzleSolver.ts
├── objects/
│   ├── Block.ts
│   └── ExitDoor.ts
├── data/
│   └── levels/
│       ├── tutorial.ts
│       └── level-001.ts
└── types/
    └── GameTypes.ts
```

### Responsabilidades

- `BoardManager`: representa las celdas ocupadas y libres.
- `BlockManager`: crea y actualiza las piezas.
- `MovementValidator`: comprueba colisiones y límites.
- `ExitValidator`: comprueba color, posición y geometría de la salida.
- `LevelManager`: carga niveles y detecta la victoria.
- `MoveHistory`: permite deshacer movimientos.
- `PuzzleSolver`: verifica que los niveles tengan solución.

La lógica de movimiento y resolución debe funcionar sin depender de Phaser para facilitar los tests unitarios.

## 12. MVP

El primer prototipo debe incluir:

1. Una cuadrícula fija de 6×6.
2. Entre cuatro y seis bloques.
3. Dos o tres colores.
4. Piezas rectangulares o lineales.
5. Puertas colocadas en los bordes.
6. Movimiento mediante arrastre.
7. Detección de colisiones.
8. Salida por puerta del color correspondiente.
9. Detección de victoria.
10. Reinicio y deshacer.

### Fuera del MVP

- Obstáculos especiales.
- Llaves y puertas bloqueadas.
- Teletransportadores.
- Generación procedural.
- Clasificaciones online.
- Monedas y tienda.
- Desafíos diarios.
- Campaña narrativa.

## 13. Pruebas esenciales

- Un bloque no puede atravesar otro.
- Un bloque no puede salirse del tablero durante un movimiento normal.
- Los bloques no pueden solaparse.
- Las piezas pueden desplazarse en todas las direcciones permitidas.
- Una pieza solo puede salir por una puerta de su color.
- Una puerta no puede aceptar una pieza cuya geometría no encaje.
- Al salir, el bloque deja libres todas sus celdas.
- Deshacer restaura la posición anterior.
- Reiniciar restaura exactamente el estado inicial.
- Los niveles marcados como válidos deben tener solución.

## 14. Riesgos de diseño

- **Movimiento ambiguo:** decidir si el movimiento es libre o restringido por eje.
- **Salidas mal definidas:** concretar cuánto espacio necesita cada forma para atravesar una puerta.
- **Niveles demasiado abiertos:** si todas las piezas pueden moverse libremente, algunos puzles podrían resolverse sin planificación.
- **Controles táctiles imprecisos:** ajustar el arrastre y el encaje a la cuadrícula.
- **Dificultad artificial:** evitar niveles que dependan de probar movimientos al azar.
- **Color como única señal:** ofrecer símbolos y patrones alternativos.

## 15. Primer hito

Construir una escena de 6×6 con varios bloques de dos colores y puertas en los bordes. El jugador debe poder mover las piezas, comprobar colisiones y sacar cada bloque por una puerta del color correspondiente.

El hito se completa cuando un nivel pequeño puede resolverse de principio a fin y todas las restricciones de movimiento y salida pasan sus pruebas.

---

## Resumen

EXIT JAM es un juego de puzles espaciales en el que el jugador desplaza bloques de distintas formas por una cuadrícula para sacarlos por puertas de su mismo color.

Su reto principal consiste en gestionar el espacio: mover las piezas en el orden adecuado, despejar rutas y evitar bloquear las salidas de otros bloques.

**Decisión recomendada para el primer prototipo:** tablero 6×6, movimiento libre en cuatro direcciones, bloques rectangulares, dos o tres colores y puertas en los bordes.
