# SIGILBOUND — Game Design Document

**Versión:** 0.1  
**Estado:** Concepto inicial  
**Género:** Juego de cartas coleccionables / estrategia por turnos  
**Plataforma objetivo:** Navegador  
**Tecnología prevista:** Astro + React + Phaser 3 + TypeScript  
**Nombre provisional:** SIGILBOUND

---

## 1. Visión general

SIGILBOUND es un juego de cartas estratégico inspirado en los juegos de construcción de mazos y combate por turnos como Hearthstone y Magic: The Gathering.

El jugador construye un mazo, invoca criaturas, utiliza hechizos y desarrolla una estrategia para reducir los puntos de vida del oponente a cero.

El objetivo es capturar la parte más atractiva del género —construcción de mazos, sinergias entre cartas, gestión de recursos y decisiones tácticas— sin reproducir las reglas, cartas, nombres, personajes o identidad visual de otros juegos.

Este documento define una primera dirección de diseño. Las reglas y cifras son provisionales y deberán validarse mediante prototipos.

## 2. Pilares de diseño

1. **Decisiones interesantes en cada turno:** jugar una carta, reservar recursos o preparar una combinación debe tener un coste estratégico.
2. **Mazos con identidad:** cada estilo de juego debe ofrecer una forma distinta de ganar.
3. **Sinergias comprensibles:** las cartas deben funcionar individualmente y adquirir valor adicional al combinarse.
4. **Partidas ágiles:** una partida estándar debería durar aproximadamente entre 5 y 12 minutos.
5. **Profundidad progresiva:** las reglas básicas deben ser fáciles de aprender, pero permitir estrategias avanzadas.
6. **Colección accesible:** el jugador debe poder experimentar con distintos mazos sin depender exclusivamente de compras o de una colección enorme.

## 3. Formato de partida

### 3.1. Jugadores

- Dos jugadores.
- Cada jugador comienza con una cantidad fija de puntos de vida.
- Los jugadores alternan turnos.
- La partida termina cuando un jugador llega a cero puntos de vida o se cumple una condición alternativa de derrota.

El primer prototipo puede ser exclusivamente contra una IA sencilla. El multijugador online se añadirá cuando el motor de reglas sea estable.

### 3.2. Condición de victoria

La condición principal es reducir los puntos de vida del rival a cero.

Posibles condiciones secundarias para futuras expansiones:

- El rival debe robar una carta y no tiene cartas en su mazo.
- Una carta concreta establece una condición de victoria alternativa.
- Modos con objetivos especiales o límite de turnos.

Para el MVP solo se utilizará la condición de vida.

### 3.3. Preparación

Propuesta inicial:

- Cada jugador utiliza un mazo de 30 cartas.
- Cada jugador comienza con 30 puntos de vida.
- Cada jugador roba una mano inicial de 3 cartas.
- Se permite sustituir cualquier número de cartas de la mano inicial una sola vez.
- Se decide aleatoriamente quién empieza.
- El jugador que empieza no roba una carta adicional en su primer turno, para compensar la ventaja de actuar primero.

Estos valores son provisionales y deben probarse.

## 4. Sistema de recursos

El recurso principal se llamará **Éter**.

- Cada carta tiene un coste de Éter.
- El jugador obtiene un punto de Éter máximo adicional al comienzo de cada uno de sus turnos.
- El máximo aumenta hasta un límite de 10.
- El Éter disponible se recupera al comienzo del turno.
- El Éter no utilizado desaparece al terminar el turno, salvo que una carta indique lo contrario.

Ejemplo de progresión:

| Turno propio | Éter máximo |
|---:|---:|
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |
| 4 | 4 |
| 5 | 5 |
| ... | ... |
| 10 en adelante | 10 |

Este sistema proporciona una curva de partida predecible y facilita el equilibrio inicial.

### Alternativas futuras

- Cartas que aumentan temporalmente el Éter.
- Cartas que almacenan Éter para el siguiente turno.
- Efectos que reducen el coste de otras cartas.
- Modos de juego con recursos compartidos o reglas alternativas.

## 5. Tipos de cartas

Para el primer diseño se proponen cuatro categorías.

### 5.1. Criaturas

Las criaturas permanecen en el campo de batalla y pueden atacar o utilizar habilidades.

Atributos:

- **Coste:** Éter necesario para jugarla.
- **Ataque:** daño que inflige al atacar.
- **Vida:** daño que puede recibir antes de ser destruida.
- **Habilidad:** efecto especial opcional.
- **Facción:** grupo al que pertenece.

Una criatura recién invocada no puede atacar durante el turno en que entra en juego, salvo que tenga una habilidad que lo permita.

### 5.2. Hechizos

Los hechizos producen un efecto inmediato y después van al descarte.

Ejemplos de efectos:

- Infligir daño.
- Curar puntos de vida.
- Robar cartas.
- Potenciar una criatura.
- Debilitar o eliminar una criatura rival.
- Generar recursos temporales.

### 5.3. Reliquias

Las reliquias son cartas permanentes que permanecen en juego y proporcionan efectos continuos o activables.

Ejemplos:

- Aumentar el ataque de determinadas criaturas.
- Reducir el coste de un tipo de carta.
- Proporcionar una pequeña cantidad de curación al comienzo del turno.
- Activar un efecto al jugar una criatura.

Para evitar que el campo se llene de efectos permanentes, el número de reliquias activas podría estar limitado.

### 5.4. Lugares

Los lugares representan escenarios o territorios que modifican temporalmente las reglas de la partida.

Ejemplos:

- Las criaturas de una facción obtienen una bonificación.
- Los hechizos cuestan un punto menos durante un turno.
- La primera criatura destruida en cada turno produce un efecto.

Los lugares son una categoría opcional. No son necesarios para el MVP.

## 6. Campo de batalla

Propuesta inicial de tablero:

- Cada jugador dispone de una fila de criaturas.
- Cada lado puede controlar un máximo de 7 criaturas.
- Las criaturas se muestran con ataque y vida.
- Las criaturas pueden atacar al héroe rival o a una criatura rival.
- Las criaturas no atacan directamente al resto de cartas de la mano o del mazo.

### Ataques

Cuando una criatura ataca a otra:

1. Se comprueba que la atacante puede atacar.
2. Se calcula el daño de ambas criaturas.
3. Ambas infligen daño simultáneamente.
4. Se actualizan sus puntos de vida.
5. Las criaturas con cero o menos vida son destruidas.

Cuando una criatura ataca al héroe rival, inflige su valor de ataque a los puntos de vida del héroe.

### Invocación

Una criatura se coloca en una posición libre del campo de batalla.

En el MVP no habrá posicionamiento táctico complejo. Las posiciones serán principalmente visuales, aunque se conservará la posibilidad de introducir efectos relacionados con la posición en el futuro.

## 7. Turno del jugador

El turno sigue este orden:

1. **Inicio del turno**
   - Aumentar el Éter máximo si todavía no ha alcanzado el límite.
   - Recuperar todo el Éter.
   - Resolver efectos de comienzo de turno.
   - Robar una carta.

2. **Fase principal**
   - Jugar criaturas.
   - Lanzar hechizos.
   - Jugar reliquias.
   - Activar habilidades.
   - Atacar con criaturas disponibles.

3. **Final del turno**
   - Resolver efectos de final de turno.
   - Descartar o resolver efectos temporales cuando corresponda.
   - Pasar el turno al rival.

El jugador puede terminar su turno en cualquier momento de la fase principal.

## 8. Palabras clave y habilidades

Las palabras clave permiten expresar efectos frecuentes de forma compacta.

Propuesta inicial:

| Palabra clave | Efecto |
|---|---|
| Carga | Puede atacar el turno en que entra en juego |
| Guardia | Los enemigos deben atacar a esta criatura antes de atacar al héroe, si la regla aplica |
| Escudo | Previene la siguiente instancia de daño |
| Eco | Repite una vez un efecto al cumplirse una condición |
| Último aliento | Activa un efecto cuando la criatura es destruida |
| Vínculo | Obtiene un beneficio al jugar otra carta de su facción |
| Drenaje | El daño infligido cura al héroe por la misma cantidad |
| Sigilo | No puede ser seleccionada directamente por ciertos efectos hasta que ataque |

No es necesario implementar todas las palabras clave al principio. El MVP debería utilizar entre tres y cinco.

## 9. Facciones y estilos de juego

Las facciones dan identidad a los mazos y permiten diseñar sinergias.

Propuesta de cinco facciones originales:

### 9.1. Orden del Alba

**Estilo:** defensa, curación y criaturas resistentes.

- Criaturas con mucha vida.
- Escudos y protección.
- Curación gradual.
- Partidas largas y controladas.

### 9.2. Corte Umbría

**Estilo:** agresión, sacrificio y efectos al morir.

- Criaturas de coste bajo.
- Daño directo.
- Sacrificar criaturas para conseguir ventajas.
- Efectos de Último aliento.

### 9.3. Círculo Silvestre

**Estilo:** crecimiento, invocación y sinergias entre criaturas.

- Criaturas que generan otras criaturas.
- Bonificaciones por controlar varias unidades.
- Aceleración de recursos.
- Presión progresiva sobre el tablero.

### 9.4. Forja Astral

**Estilo:** artefactos, reliquias y eficiencia.

- Reducir costes.
- Mejorar criaturas.
- Activar efectos al jugar cartas.
- Preparar combinaciones a medio plazo.

### 9.5. Archivo del Vacío

**Estilo:** manipulación de cartas y control.

- Robar y descartar.
- Contrarrestar o retrasar acciones.
- Debilitar criaturas rivales.
- Obtener valor a partir del descarte.

Las facciones son una propuesta temática y mecánica, no una lista definitiva. Cada una debería tener fortalezas y debilidades claras.

## 10. Construcción de mazos

Reglas iniciales propuestas:

- 30 cartas por mazo.
- Máximo de 2 copias de una misma carta.
- Las cartas legendarias o únicas podrían limitarse a 1 copia.
- Cada mazo puede combinar una o dos facciones.
- Las cartas neutrales pueden incluirse en cualquier mazo.

La combinación de facciones debe tener un coste o una restricción clara para evitar que todos los mazos terminen utilizando las mejores cartas de todas las facciones.

### Curva de costes

La construcción del mazo debe considerar la distribución de costes.

Ejemplo orientativo:

| Coste | Cantidad aproximada |
|---:|---:|
| 1 | 4–6 |
| 2 | 5–7 |
| 3 | 5–7 |
| 4 | 3–5 |
| 5 | 2–4 |
| 6+ | 2–4 |

No debe tratarse como una regla obligatoria. La curva dependerá de la estrategia del mazo.

## 11. Rareza y colección

Rarezas propuestas:

- Común.
- Poco común.
- Rara.
- Épica.
- Legendaria.

La rareza puede representar complejidad, singularidad o disponibilidad, pero no debe equivaler automáticamente a poder.

### Obtención de cartas

Opciones futuras:

- Recompensas por completar partidas.
- Progresión por facción.
- Desbloqueos por desafíos.
- Sobres de cartas obtenidos jugando.
- Fabricación de cartas mediante recursos.

Para un juego de navegador pequeño, se recomienda comenzar con una colección desbloqueable mediante progreso y evitar monetización aleatoria hasta que el juego tenga una base sólida.

## 12. Modos de juego

### 12.1. Práctica contra IA

Modo principal del MVP.

- Partidas contra una IA básica.
- Dificultad ajustable.
- Permite probar cartas y estrategias.
- No necesita conexión con otros jugadores.

### 12.2. Partida casual

Partidas sin clasificación contra otros jugadores.

### 12.3. Clasificatoria

Sistema de rangos y emparejamiento por nivel.

### 12.4. Desafíos

Escenarios con reglas especiales o mazos prediseñados.

### 12.5. Draft

El jugador selecciona cartas de una serie de opciones y construye un mazo temporal.

Los modos online, clasificatorios y draft quedan fuera del MVP.

## 13. Diseño de cartas

Cada carta debe tener una estructura de datos independiente de su representación visual.

Ejemplo:

```ts
type CardType = "creature" | "spell" | "relic" | "location";

type Faction =
  | "dawn"
  | "umbra"
  | "wild"
  | "astral"
  | "void"
  | "neutral";

interface CardDefinition {
  id: string;
  name: string;
  description: string;
  type: CardType;
  faction: Faction;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  cost: number;
  attack?: number;
  health?: number;
  keywords?: string[];
  effects: CardEffect[];
}
```

Los efectos deben representarse como datos estructurados siempre que sea posible. Evitar ejecutar código arbitrario almacenado en las definiciones de cartas.

Ejemplo conceptual de un efecto:

```ts
interface CardEffect {
  trigger: "on_play" | "on_death" | "on_attack" | "turn_start";
  action: "damage" | "heal" | "draw" | "buff" | "summon";
  target: "enemy_hero" | "friendly_hero" | "enemy_creature" | "friendly_creature";
  value: number;
}
```

El sistema real deberá contemplar objetivos opcionales, condiciones, selección de objetivos y efectos encadenados.

## 14. Arquitectura técnica

Propuesta para el proyecto:

```text
src/games/sigilbound/
├── scenes/
│   ├── GameScene.ts
│   └── CollectionScene.ts
├── systems/
│   ├── GameState.ts
│   ├── TurnManager.ts
│   ├── ResourceManager.ts
│   ├── DeckManager.ts
│   ├── CardResolver.ts
│   ├── CombatResolver.ts
│   ├── EffectResolver.ts
│   ├── AiController.ts
│   └── GameHistory.ts
├── entities/
│   ├── Card.ts
│   ├── Creature.ts
│   └── Player.ts
├── data/
│   ├── cards/
│   ├── factions/
│   └── starter-decks/
├── ui/
│   ├── CardView.ts
│   ├── HandView.ts
│   ├── BoardView.ts
│   └── PlayerHud.ts
└── types/
    ├── CardTypes.ts
    └── GameTypes.ts
```

### Separación de responsabilidades

- `GameState`: estado completo y autoritativo de la partida.
- `TurnManager`: orden y fases de los turnos.
- `ResourceManager`: gestión del Éter.
- `DeckManager`: mazo, mano, robo y descarte.
- `CardResolver`: validación y ejecución de cartas.
- `CombatResolver`: ataques, daño y destrucción.
- `EffectResolver`: resolución de habilidades y efectos.
- `AiController`: decisiones de la IA.
- `GameHistory`: registro de acciones para depuración y repetición.

La lógica de juego debe estar separada de Phaser. Phaser se encargará de representar el estado y gestionar las interacciones visuales.

### Determinismo y pruebas

Siempre que sea posible, las acciones deben procesarse mediante funciones deterministas:

```ts
interface GameAction {
  type: string;
  playerId: string;
  payload: unknown;
}

function reduceGameState(
  state: GameState,
  action: GameAction
): GameState;
```

En una futura versión multijugador, el servidor deberá validar las acciones y mantener el estado autoritativo. No se debe confiar en el cliente para decidir si una jugada es legal.

## 15. Guardado y persistencia

Para el primer prototipo:

- Guardar colección y mazos localmente.
- Guardar las opciones del jugador.
- No es necesario guardar cada partida en curso.

Para una versión integrada en la plataforma:

- Supabase Auth para cuentas.
- PostgreSQL para colección, mazos y progreso.
- Registro de partidas y resultados.
- Validación de acciones en servidor para partidas online.

Las cartas y reglas base deben versionarse para poder actualizar el juego sin corromper mazos guardados.

## 16. MVP

El primer objetivo no es crear un juego coleccionable completo, sino comprobar que el combate es divertido.

### Contenido del MVP

- Un modo de partida contra IA.
- Dos mazos prediseñados.
- Unas 30–40 cartas únicas.
- Dos facciones iniciales.
- Criaturas y hechizos.
- Sistema de Éter de 1 a 10.
- Campo de batalla con un máximo de 7 criaturas por jugador.
- Turnos alternos.
- Ataques a criaturas y héroes.
- Condición de victoria por puntos de vida.
- Interfaz de mano, tablero, recursos y vida.
- Reinicio y finalización de partida.

### Fuera del MVP

- Colección completa.
- Sobres y fabricación.
- Cinco facciones.
- Reliquias y lugares.
- Clasificatorias.
- Multijugador online.
- Draft.
- Chat.
- Espectadores.
- Torneos.
- Tienda y monetización.

## 17. Plan de desarrollo

### Hito 1 — Motor de combate

- Definir el estado de partida.
- Crear dos jugadores.
- Implementar turnos.
- Implementar Éter.
- Robar y jugar cartas.
- Invocar criaturas.
- Atacar y resolver daño.
- Detectar victoria.

### Hito 2 — Cartas y efectos

- Crear un formato de definición de cartas.
- Implementar hechizos.
- Implementar habilidades sencillas.
- Añadir descarte y robo.
- Añadir validaciones y mensajes de error.

### Hito 3 — Interfaz

- Mano de cartas.
- Tablero.
- Visualización de costes y estadísticas.
- Selección de objetivos.
- Animaciones de ataque y daño.
- Feedback de acciones no válidas.

### Hito 4 — IA y contenido

- IA que juegue cartas legales.
- IA que priorice intercambios razonables.
- Crear dos mazos completos.
- Ajustar costes, estadísticas y efectos.
- Probar partidas repetidamente.

### Hito 5 — Integración en la plataforma

- Guardar progreso.
- Añadir pantalla de selección de mazo.
- Añadir estadísticas de partidas.
- Preparar arquitectura para multijugador.

## 18. Equilibrio y pruebas

El equilibrio no debe basarse únicamente en que todas las cartas tengan estadísticas parecidas.

Aspectos que deben probarse:

- Valor de las cartas según su coste.
- Frecuencia de robo de cartas.
- Ventaja de actuar primero.
- Capacidad de recuperación después de perder el tablero.
- Efectividad de los mazos agresivos y de control.
- Sinergias demasiado fuertes.
- Efectos que impiden al rival jugar.
- Duración media de las partidas.

Registrar datos de partidas de prueba permitirá detectar cartas demasiado dominantes o estrategias que no tienen respuesta.

## 19. Riesgos y decisiones pendientes

### Alcance

Un juego de cartas competitivo es un proyecto grande: necesita contenido, equilibrio, IA, interfaz, persistencia y, si se desea, infraestructura multijugador.

**Recomendación:** no comenzar por colección, sobres o matchmaking. Primero validar un combate completo contra IA.

### Originalidad

La inspiración en Hearthstone y Magic debe limitarse a conceptos generales del género. Se deben crear:

- Nombre y mundo propios.
- Facciones originales.
- Diseño visual original.
- Cartas, textos, efectos y personajes propios.
- Reglas y mecánicas distintivas.

No reutilizar nombres, ilustraciones, textos, marcos, iconos ni diseños protegidos de otros juegos.

### Decisiones por cerrar

- ¿El Éter aumenta automáticamente o se juega una carta de recurso?
- ¿Se podrán combinar dos facciones en un mismo mazo?
- ¿Las criaturas tendrán habilidades activables?
- ¿Habrá interacción durante el turno rival?
- ¿Se podrá responder a hechizos antes de que se resuelvan?
- ¿El campo tendrá posiciones con efectos?
- ¿El juego será principalmente PvE, PvP o ambos?

Estas decisiones deben cerrarse antes de ampliar mucho la colección.

## 20. Primer hito recomendado

Construir una partida local contra una IA muy sencilla con:

- 30 puntos de vida por jugador.
- Un mazo pequeño de prueba.
- Éter que aumenta automáticamente.
- Criaturas que pueden atacar.
- Un par de hechizos de daño.
- Turnos alternos.
- Victoria al reducir la vida rival a cero.

El hito se considera completado cuando se puede jugar una partida completa, desde el reparto inicial hasta la victoria o derrota, sin errores en las reglas.

---

## Resumen

SIGILBOUND es un juego de cartas estratégico de construcción de mazos y combate por turnos. El jugador combina criaturas, hechizos y habilidades para crear sinergias y derrotar al rival.

La propuesta inicial utiliza mazos de 30 cartas, 30 puntos de vida, un recurso de Éter que aumenta cada turno y un campo de batalla con hasta siete criaturas por jugador.

**Decisión recomendada:** empezar con un prototipo PvE pequeño y dos mazos prediseñados. La colección, el multijugador y la progresión online deben llegar después de validar que el núcleo de combate funciona.
