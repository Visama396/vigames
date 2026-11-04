# LEXICON QUEST — Game Design Document (GDD)

**Versión:** 0.1  
**Estado:** Concepto inicial / preproducción  
**Género:** Combate por turnos, formación de palabras y aventura  
**Plataforma:** Navegador web  
**Motor propuesto:** Phaser 3  
**Idioma inicial:** Español  
**Modo:** Un jugador  
**Nota:** Los valores numéricos son parámetros provisionales que deben probarse y equilibrarse.

---

## 1. Visión general

**Lexicon Quest** es un juego de aventura por turnos en el que el jugador combate monstruos formando palabras con letras disponibles. La longitud de la palabra determina el daño del ataque: cuanto más larga sea la palabra válida, más potente será el golpe.

El jugador selecciona letras de un tablero, forma una palabra, confirma el ataque y observa cómo responde el enemigo. A medida que avanza, encuentra criaturas con defensas y patrones distintos, desbloquea habilidades y consigue equipo que modifica el valor táctico de ciertas palabras.

La intención es capturar el atractivo de los juegos de combate basados en vocabulario, pero con identidad visual, reglas y progresión propias.

## 2. Pilares de diseño

1. **Las palabras son los ataques.** La formación de palabras es la acción principal del combate.
2. **Longitud con impacto.** Las palabras largas infligen más daño, pero las cortas pueden ofrecer ventajas tácticas.
3. **Decisiones claras.** El jugador debe entender el daño estimado, el estado del enemigo y las consecuencias de su turno.
4. **Vocabulario accesible.** El juego premia conocer palabras, pero no debe depender únicamente de vocabulario extremadamente raro.
5. **Progresión variada.** Los nuevos enemigos y objetos alteran las decisiones, no solo aumentan los puntos de vida.
6. **Combates breves.** Cada encuentro debe tener un ritmo ágil y legible.

## 3. Bucle principal

1. Entrar en un encuentro.
2. Examinar el tablero de letras.
3. Seleccionar letras adyacentes para formar una palabra.
4. Confirmar la palabra válida y ejecutar el ataque.
5. Aplicar daño y efectos.
6. Si el enemigo sigue vivo, resuelve su respuesta.
7. Reponer las letras utilizadas y comenzar el siguiente turno.
8. Al ganar, recibir experiencia, monedas u objetos y avanzar.

La decisión principal es cuándo usar una palabra larga para infligir mucho daño y cuándo aprovechar una palabra más corta para activar un efecto, interrumpir un ataque o conservar flexibilidad.

## 4. Tablero de letras

### Configuración inicial

- Tablero de **5 × 5 casillas**.
- Cada casilla contiene una letra.
- Las letras se seleccionan en secuencia mediante clic o toque.
- Las letras consecutivas deben ser adyacentes.
- Para el prototipo se permite adyacencia horizontal, vertical y diagonal.
- Una casilla no puede usarse más de una vez en la misma palabra.
- El jugador puede deshacer su selección antes de confirmar.
- Tras un ataque válido, las letras utilizadas se retiran y se reponen.

### Validación de palabras

- El juego utiliza un diccionario local de palabras aceptadas.
- Las palabras se normalizan para comparar mayúsculas y minúsculas.
- El tratamiento de tildes debe definirse explícitamente; `n` y `ñ` deben seguir siendo letras distintas.
- Nombres propios, abreviaturas y formas ausentes del diccionario se rechazan en el modo estándar.
- Una palabra inválida no consume el turno ni elimina letras.
- Si el tablero no contiene ninguna palabra válida, se permite barajar o regenerar las letras para evitar bloquear la partida.

Para el prototipo puede utilizarse un diccionario pequeño. Antes de publicar, habrá que elegir una fuente con licencia adecuada y suficiente cobertura del español.

## 5. Daño por longitud de palabra

Tabla inicial de daño base:

| Longitud | Categoría | Daño |
|---:|---|---:|
| 2 letras | Golpe rápido | 4 |
| 3 letras | Golpe ligero | 7 |
| 4 letras | Ataque | 11 |
| 5 letras | Ataque fuerte | 16 |
| 6 letras | Ataque devastador | 22 |
| 7 letras | Golpe heroico | 29 |
| 8 o más | Palabra épica | 37 + 5 por cada letra adicional |

Estos valores son de partida, no definitivos. Se recomienda una tabla configurable para poder ajustar cada longitud sin cambiar código de combate.

**Daño final de referencia:**

`daño final = daño base + bonificaciones de equipo + bonificaciones de habilidad - reducción del enemigo`

El daño de un ataque válido no será inferior a 1 salvo que una regla específica lo indique.

### Evitar que las palabras cortas sean inútiles

- Algunas habilidades pueden mejorar palabras de 2–4 letras.
- Las palabras cortas pueden interrumpir ataques anunciados.
- Ciertos objetos pueden premiar una terminación, vocal o consonante concreta.
- En algunos encuentros, una palabra corta puede ser más fácil de formar con el tablero disponible.

Las palabras largas deben ser potentes, pero no siempre la mejor opción táctica.

## 6. Turnos y resolución del combate

1. El jugador forma y confirma una palabra.
2. El juego calcula el daño y aplica el ataque.
3. Se comprueba si el enemigo ha sido derrotado.
4. Si sigue vivo, el enemigo ejecuta el movimiento anunciado o aplica su patrón.
5. Se resuelven los efectos de estado en un orden consistente.
6. Se reponen las letras y comienza el siguiente turno.

Reglas:

- El enemigo no ataca si muere durante el ataque del jugador.
- Los ataques especiales deben anunciarse antes de ejecutarse.
- El jugador no puede confirmar otra palabra mientras se resuelve el turno.
- No se penaliza por tardar en encontrar una palabra en el modo normal.
- Los efectos de daño en el tiempo deben resolverse siempre en el mismo punto del turno.

## 7. Enemigos

Los enemigos deben cambiar cómo se usa el tablero, no limitarse a tener más salud.

| Enemigo | Comportamiento | Decisión que introduce |
|---|---|---|
| Babosa de tinta | Ataque básico y poca salud | Aprender las reglas |
| Escarabajo acorazado | Reduce parte del daño de palabras cortas | Buscar palabras más largas |
| Murciélago eco | Anuncia un ataque fuerte para el siguiente turno | Decidir si atacar o interrumpir |
| Mímico de letras | Cambia una letra al terminar su turno | Adaptarse a un tablero variable |
| Gólem de papel | Recibe daño adicional de palabras de 6+ letras | Preparar palabras largas |

El MVP solo necesita un enemigo básico. Un segundo enemigo con una regla especial puede añadirse una vez que el combate funcione.

### Jefes futuros

- Un jefe puede bloquear algunas letras durante un turno.
- Otro puede exigir una palabra de longitud mínima para romper su defensa.
- Otro puede ser vulnerable a palabras que contengan una letra concreta.

Las reglas deben mostrarse antes de castigar al jugador. Nunca se debe exigir una palabra imposible de formar con el tablero actual.

## 8. Habilidades y equipo

Los sistemas de progresión deben complementar la formación de palabras, no sustituirla.

Ejemplos de habilidades futuras:

- **Golpe preciso:** aumenta el daño de palabras de 3 o 4 letras.
- **Cadena léxica:** las palabras de 5 letras o más pueden aplicar sangrado.
- **Última vocal:** una palabra que termine en vocal recupera un poco de salud.
- **Rompearmaduras:** las palabras largas reducen temporalmente la defensa.
- **Reordenar letras:** permite cambiar algunas letras una vez por combate.
- **Pista de archivista:** muestra una pista para encontrar una palabra posible, con usos limitados.

Ejemplos de equipo:

- **Guante de calígrafo:** bonificación al daño de palabras de 4 letras.
- **Amuleto del eco:** bonificación a la primera palabra de 6+ letras de cada combate.
- **Lupa de archivista:** permite pedir una pista limitada.

Los valores de estas bonificaciones se definirán después de probar la curva de daño base.

## 9. Progresión y recompensas

La campaña se organiza en capítulos cortos, con encuentros y recompensas entre ellos.

Recompensas posibles:
- Experiencia para subir de nivel.
- Monedas para comprar equipo.
- Reliquias con efectos sobre letras y palabras.
- Nuevas habilidades.
- Acceso a regiones y enemigos.

Una sesión inicial debería durar entre 5 y 10 minutos y contener:
1. Un encuentro básico.
2. Un encuentro con una regla especial.
3. Una recompensa o elección de mejora.
4. Un encuentro final que combine lo aprendido.

La primera versión no necesita una campaña completa: basta con un combate funcional y una pantalla de victoria o derrota.

## 10. Dirección artística y audio

### Estilo visual

Aventura ilustrada con fantasía literaria: libros antiguos, tinta animada, letras brillantes y criaturas hechas de papel y tinta. La identidad visual debe ser propia y no copiar personajes, ilustraciones, interfaz ni elementos reconocibles de otros juegos.

### Interfaz de combate

- Zona superior: nombre, retrato, salud y estado del enemigo.
- Zona central: enemigo y efectos de ataque.
- Zona inferior: tablero de letras.
- Panel de palabra: palabra en construcción, longitud y daño estimado.
- Indicador visible del próximo movimiento del enemigo.

### Audio

- Sonido breve al seleccionar letras.
- Sonido ascendente al completar palabras largas.
- Impactos distintos por categoría de ataque.
- Avisos sonoros para estados y ataques anunciados.
- Controles separados para música y efectos.

## 11. MVP — Primera versión jugable

### Incluido

- Una escena de combate.
- Tablero de 5 × 5 letras.
- Selección de letras adyacentes.
- Validación con diccionario local.
- Daño determinado por la longitud de palabra.
- Un héroe con salud.
- Un enemigo básico con salud y un ataque.
- Reposición de letras tras un ataque válido.
- Condiciones de victoria y derrota.
- HUD con palabra, longitud y daño estimado.
- Pruebas automatizadas de rutas, palabras y daño.

### Fuera del MVP

- Inventario y equipo.
- Árbol de habilidades.
- Jefes y capítulos.
- Guardado en la nube.
- Clasificaciones.
- Multijugador.
- Varios idiomas simultáneos.
- Diccionarios editables por usuarios.

### Criterios de aceptación

1. Solo se seleccionan rutas de casillas adyacentes.
2. Una casilla no se puede utilizar dos veces en la misma palabra.
3. Una palabra válida aplica el daño esperado.
4. Una palabra inválida no consume el turno ni elimina letras.
5. Las palabras más largas causan más daño según la tabla.
6. El enemigo no ataca después de ser derrotado.
7. El juego puede recuperarse si el tablero no contiene palabras válidas.
8. La lógica de combate no depende de los FPS.

## 12. Arquitectura técnica

### Estructura propuesta

```text
src/
├── pages/
│   └── games/
│       └── lexicon-quest.astro
├── components/
│   └── games/
│       └── LexiconQuestGame.tsx
└── games/
    └── lexicon-quest/
        ├── config.ts
        ├── Game.ts
        ├── scenes/
        │   ├── BootScene.ts
        │   └── BattleScene.ts
        ├── systems/
        │   ├── WordValidator.ts
        │   ├── LetterBoard.ts
        │   ├── CombatSystem.ts
        │   ├── EnemyAI.ts
        │   └── ProgressionSystem.ts
        ├── data/
        │   ├── enemies.ts
        │   ├── abilities.ts
        │   └── damageTable.ts
        └── assets/
            ├── sprites/
            ├── audio/
            └── fonts/
```

### Responsabilidades

- **Phaser:** escena, tablero, interacción, animaciones y efectos.
- **WordValidator:** normalización y validación contra el diccionario.
- **LetterBoard:** generación de letras, selección de rutas y reposición.
- **CombatSystem:** daño, salud, estados y resolución de turnos.
- **EnemyAI:** patrones y ataques enemigos.
- **ProgressionSystem:** experiencia, recompensas y desbloqueos futuros.
- **Astro/React:** integración con la plataforma y elementos externos al lienzo.

La validación de palabras y la lógica de combate deben poder probarse sin iniciar Phaser.

## 13. Primer hito técnico

### Hito 1: formar una palabra y atacar

**Objetivo:** un prototipo en el que el jugador selecciona letras, forma una palabra válida y hace daño a un enemigo.

Orden de trabajo:

1. Crear el proyecto Phaser y `BattleScene`.
2. Dibujar la cuadrícula de 5 × 5 con letras temporales.
3. Implementar selección por clic o toque.
4. Validar adyacencia y evitar reutilizar casillas.
5. Añadir un diccionario local pequeño.
6. Implementar la tabla de daño.
7. Mostrar palabra, longitud y daño estimado.
8. Aplicar daño al confirmar.
9. Añadir respuesta enemiga y victoria/derrota.
10. Crear pruebas automatizadas.

### Pruebas mínimas

- Una palabra de 3 letras causa 7 de daño.
- Una palabra de 5 letras causa 16 de daño.
- Una palabra de 8 letras causa 37 de daño.
- Una ruta no adyacente se rechaza.
- Una casilla repetida se rechaza.
- Una palabra inválida no consume el turno.
- El enemigo no ataca después de morir.
- Un tablero sin palabras válidas no bloquea la partida.

## 14. Riesgos y decisiones pendientes

1. **Diccionario y licencias:** elegir una fuente legal y suficientemente amplia.
2. **Tildes y `ñ`:** definir normalización y presentación sin ambigüedad.
3. **Palabras excesivamente largas:** ajustar la curva para que sean potentes sin eliminar las decisiones tácticas.
4. **Tableros sin movimientos:** comprobar la generación de letras y permitir barajar si hace falta.
5. **Diferencias de vocabulario:** ofrecer pistas opcionales y no depender exclusivamente de palabras raras.
6. **Ritmo:** mantener animaciones breves y turnos ágiles.
7. **Originalidad:** desarrollar nombres, arte, historia, interfaz y progresión propios.

## 15. Decisiones iniciales

- Género: combate por turnos basado en palabras.
- Motor: Phaser 3.
- Idioma inicial: español.
- Tablero: 5 × 5.
- Selección: letras adyacentes, sin reutilizar casillas en una misma palabra.
- Daño: escala según longitud de palabra.
- Modo: un jugador.
- Primer objetivo: completar un combate funcional con validación de palabras y daño.

---

**Principio de desarrollo:** primero validar que seleccionar letras, formar palabras y atacar resulta satisfactorio; después añadir enemigos variados, equipo, habilidades y aventura.
