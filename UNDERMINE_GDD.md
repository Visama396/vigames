# UNDERMINE — Game Design Document (GDD)

**Versión:** 0.2  
**Estado:** Diseño inicial / preproducción  
**Género:** Incremental, minería y automatización  
**Plataforma:** Navegador web, escritorio y móvil adaptable  
**Motor:** Phaser 3  
**Stack de plataforma previsto:** Astro, React, Tailwind CSS y Supabase  
**Modelo de sesión:** La producción solo avanza mientras la partida está activa  
**Documento vivo:** Los valores económicos iniciales son parámetros provisionales que deberán ajustarse mediante pruebas.

---

## 1. Visión general

UNDERMINE es un juego incremental 2D de minería y automatización. El jugador empieza con una herramienta básica y extrae recursos manualmente haciendo clic en las celdas, vendiéndolos para obtener créditos e invertir en mejoras, máquinas y expansión del terreno.

La experiencia central consiste en diseñar cadenas de producción, detectar cuellos de botella, invertir recursos en mejoras y desbloquear nuevas posibilidades industriales.

La meta no es competir con simuladores de fábrica a gran escala, sino ofrecer una experiencia accesible en navegador que capture la satisfacción de optimizar sistemas de producción.

### Pilares de diseño

1. **Minería manual primero:** El jugador empieza sin dinero, minando manualmente con un pico para obtener sus primeros recursos.
2. **Automatización satisfactoria:** una cadena bien diseñada debe producir recursos de forma predecible.
3. **Economía legible:** el jugador debe entender qué consume, qué produce y por qué una máquina se ha detenido.
4. **Decisiones con consecuencias:** invertir en extracción, procesamiento, energía o mejoras debe implicar prioridades.
5. **Progresión incremental:** cada hito desbloquea nuevas opciones, no solo números mayores.
6. **Sesiones activas:** no se genera producción mientras el jugador está desconectado.

## 2. Concepto diferenciador

La fábrica se construye en una cuadrícula y el espacio es un recurso. Las máquinas ocupan casillas y el jugador las conecta mediante enlaces abstractos de recursos.

El transporte no se simula físicamente: las conexiones son un grafo dirigido que transfiere materiales entre inventarios. Esto permite concentrar el desarrollo en las recetas, la economía y la optimización.

## 3. Bucle principal

1. Extraer materias primas manualmente con el pico o automáticamente con máquinas.
2. Transportarlas a máquinas de procesamiento.
3. Transformarlas en productos intermedios y componentes.
4. Vender excedentes o utilizarlos en otras recetas.
5. Reinvertir créditos en máquinas, mejoras, expansión de terreno y mejoras del pico.
6. Cumplir objetivos de producción para desbloquear nuevas tecnologías.
7. Repetir el ciclo con cadenas progresivamente más complejas.

El jugador alterna entre observar el rendimiento de la fábrica e intervenir para resolver cuellos de botella.

## 4. Tablero y construcción

### Configuración inicial

- Tablero inicial de **2 × 2 casillas**.
- Tamaño de casilla de referencia: **64 × 64 píxeles**.
- Tamaño lógico inicial: 128 × 128 píxeles.
- El jugador puede comprar más celdas para expandir el terreno.
- Máquinas tienen huella configurable según tipo.

### Layout inicial

El tablero 2x2 inicial contiene:
- 1 celda con carbón
- 1 celda con mineral de hierro
- 2 celdas vacías

### Reglas de colocación

- Cada máquina tiene coordenadas de casilla `(x, y)`, ancho y alto.
- Todas las casillas ocupadas deben estar dentro del tablero.
- No se permite que dos máquinas compartan casillas.
- Las coordenadas de pantalla se convierten a coordenadas del tablero teniendo en cuenta el desplazamiento y zoom de cámara.
- El estado lógico de una máquina es independiente de su sprite.

### Minería manual

- El jugador posee un pico con nivel/poder de minería inicial de **1**.
- Al hacer clic sobre una celda vacía que contiene un recurso (o sobre una veta), se inflige daño igual al poder de minería del pico.
- Cada clic reduce la "salud" de la celda en una cantidad igual al poder del pico.
- Cuando la salud llega a 0, el recurso se extrae y se añade al inventario.
- Las máquinas perforadoras tienen poder de minería de **5** y minan **5 puntos por segundo** (en lugar de clics).
- No se necesita dinero para empezar a minar.

## 5. Conexiones abstractas

Las conexiones son enlaces dirigidos entre una salida de recurso de una máquina y una entrada compatible de otra.

### Reglas

- Solo se conectan recursos compatibles.
- Una salida puede alimentar varias máquinas.
- La transferencia está limitada por una tasa máxima por segundo.
- Las conexiones no ocupan casillas ni representan cintas físicas.
- No se permiten transferencias que creen recursos.
- Las máquinas y conexiones se procesan con un orden determinista.
- Si varias máquinas solicitan el mismo recurso, el reparto inicial se realiza por orden estable de identificador de máquina.

## 6. Recursos y recetas

### Recursos iniciales

| Recurso | Función |
|---|---|
| Mineral de hierro (`iron_ore`) | Materia prima extraída manualmente o por la perforadora |
| Lingote de hierro (`iron_ingot`) | Material procesado en la fundición |
| Componente (`component`) | Producto de la ensambladora y objetivo de progresión |
| Carbón (`coal`) | Combustible del generador |

### Máquinas iniciales

Los siguientes valores son **parámetros provisionales de diseño**.

| Máquina | Receta/ciclo | Duración | Potencia demandada |
|---|---:|---:|---:|
| Perforadora (`drill`) | Produce 1 mineral de hierro | 0,5 s | 1 unidad (poder de minería 5/segundo) |
| Fundición (`smelter`) | 2 minerales → 1 lingote | 1 s | 1 unidad |
| Ensambladora (`assembler`) | 2 lingotes → 1 componente | 2 s | 2 unidades |
| Generador (`generator`) | Consume 1 carbón y suministra 4 unidades de potencia | 1 s por ciclo de combustible | No consume potencia |

## 7. Simulación de producción

### Paso de simulación

- Intervalo objetivo: **0,25 segundos**.
- Una única simulación centralizada controla todas las máquinas.
- La producción no depende directamente de los FPS ni de los sprites.
- Se usa acumulación de tiempo para ejecutar pasos fijos.
- Las fracciones de progreso se conservan para evitar pérdidas por redondeo.

### Orden de cada paso

1. Calcular demanda de potencia.
2. Asignar potencia disponible de forma determinista.
3. Actualizar progreso de las recetas activas.
4. Completar ciclos válidos.
5. Calcular transferencias de recursos.
6. Aplicar las transferencias respetando límites y capacidades.
7. Actualizar objetivos, estadísticas y bloqueos.
8. Notificar a la interfaz qué elementos necesitan actualizarse.

### Potencia

La potencia es una capacidad disponible en el momento, no un recurso que se acumula indefinidamente.

- El generador suministra 4 unidades de potencia por segundo mientras funciona.
- La perforadora demanda 1 unidad.
- La fundición demanda 1 unidad.
- La ensambladora demanda 2 unidades.
- Si la demanda supera el suministro, se asigna potencia en orden determinista y se muestran las máquinas sin suministro.

## 8. Economía inicial

Valores iniciales para prototipado; deberán equilibrarse tras probar el juego.

### Recursos iniciales de la partida

- **0 créditos** (empieza sin dinero)
- Tablero inicial de 2 × 2 casillas con 1 célula de carbón, 1 de hierro, 2 vacías
- Pico de nivel 1 con poder de minería 1
- Terminal de venta para convertir recursos en créditos

### Costes de construcción

| Máquina o elemento | Coste inicial |
|---|---:|
| Perforadora | 25 créditos |
| Fundición | 30 créditos |
| Ensambladora | 40 créditos |
| Generador | 35 créditos |
| Expansión de celda/terreno | Variable (a definir) |

### Precios de venta

| Recurso | Precio por unidad |
|---|---:|
| Mineral de hierro | 2 créditos |
| Lingote de hierro | 5 créditos |
| Componente | 14 créditos |
| Carbón | 3 créditos |

El jugador debe vender carbón, hierro y otros recursos minados para obtener créditos y poder progresar.

## 9. Progresión

La primera condición de progreso será fabricar **20 componentes** para desbloquear la perforación profunda.

## 10. Guardado y producción offline

- La partida se guarda localmente en el navegador.
- Cargar una partida restaura exactamente el estado guardado.
- El tiempo transcurrido desde el último guardado no genera recursos.
- No se calcula producción offline.
- Los datos cargados deben validarse antes de usarse para evitar estados inválidos.

## 11. Arquitectura técnica

Ver estructura existente en el código. El modelo debe soportar minería manual de celdas con salud, poder de pico, expansión de tablero, etc.

## 12. Plan de desarrollo

### Fase 1 — Minería manual y tablero inicial
- Implementar tablero 2x2 inicial con layout especificado
- Implementar sistema de salud de celdas y minería manual con clicks
- Implementar poder de pico (nivel 1 = 1 de daño por click)
- Añadir sprites para carbón y mineral de hierro
- Permitir vender recursos para obtener créditos

### Fase 2 — Máquinas y automatización
- Añadir máquinas (perforadora, fundición, ensambladora, generador)
- Implementar simulación de producción
- Añadir conexiones entre máquinas
- Las perforadoras minan con poder 5/segundo

### Fase 3 — Expansión y economía
- Permitir comprar más celdas para expandir el terreno
- Equilibrar economía
- Añadir mejoras del pico

## Decisiones iniciales cerradas

- Motor: Phaser.
- Vista: 2D.
- Construcción: tablero de casillas.
- Transporte: conexiones abstractas.
- Producción offline: desactivada.
- Simulación: paso fijo de 0,25 segundos.
- Tamaño inicial del tablero: 2 × 2.
- Minería manual: clicks con poder de pico 1 inicial.
- Empezar con 0 créditos.
- Layout inicial: 1 carbón, 1 hierro, 2 vacías.

---

**Principio de desarrollo:** primero una simulación correcta y una cadena de producción satisfactoria; después interfaz, progresión y contenido.
