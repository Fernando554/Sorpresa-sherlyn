# Segunda sorpresa para Sherlyn — GitHub Pages

Versión 2 del sitio, hecha únicamente con archivos estáticos:

- HTML
- CSS
- JavaScript
- Imágenes locales

No requiere backend ni base de datos y funciona con GitHub Pages.

## Publicación

1. Crea un repositorio en GitHub.
2. Sube todo el contenido de esta carpeta conservando `assets/`.
3. Ve a `Settings > Pages`.
4. En `Build and deployment`, usa `Deploy from a branch`.
5. Selecciona `main` y `/ (root)`.
6. Guarda y espera a que GitHub publique la URL.

Todas las rutas son relativas, por lo que funciona en URLs del tipo:

`https://usuario.github.io/nombre-del-repo/`

## Estructura

- `index.html` — experiencia y textos.
- `styles.css` — diseño, flor gigante, ramos y animaciones.
- `app.js` — botón NO, generación de pétalos/ramos y flujo.
- `assets/gold-pass.jpg` — recorte de la captura del Gold Pass.
- `assets/pedido-confirmado.jpg` — confirmación del pedido.

## Flujo

1. Pregunta inicial.
2. El botón NO huye.
3. Al pulsar SÍ aparece una flor amarilla gigante.
4. En el centro de la flor se revela Six Flags + fecha + Festival del Terror.
5. Una montaña rusa se mueve por la parte superior.
6. Aparecen pequeños ramos a los lados.
7. Botón “Ver la prueba”.
8. Se muestran el Gold Pass y la confirmación del pedido juntos.
9. Cierre: Fernando tiene los boletos.


## Cambios de la versión 3

- Se recuperó el efecto procedural de líneas/partículas durante el florecimiento.
- La flor central ahora tiene dos coronas de pétalos irregulares, no una roseta geométrica.
- El centro usa un patrón de semillas en espiral para que se lea claramente como girasol.
- El texto de Six Flags está superpuesto sobre el centro, pero el disco de la flor sigue siendo visible.
- Se mantienen los ramos laterales, montaña rusa y la prueba de compra.


## Cambios de la versión 4

- Partículas mucho más visibles: ~760 partículas durante la entrada.
- Las partículas primero giran hacia el centro y ayudan a “construir” la flor.
- Más de 200 trazos finos dibujan la flor desde el centro hacia afuera.
- Después del florecimiento hay una explosión de partículas doradas.
- Quedan luciérnagas/partículas flotando para que la escena siga viva.
- Se reforzó el resplandor central sin tapar la flor ni el texto.


## V5 optimizada para GitHub Pages / móvil

El ZIP sigue siendo 100% estático y compatible con GitHub Pages.

Optimizaciones principales:
- La flor y los ramos se construyen durante el tiempo ocioso de la pantalla inicial, no al tocar “Sí”.
- Calidad adaptativa: en móvil se dibujan menos partículas, pero se mantiene el mismo efecto visual.
- DPR del canvas limitado para evitar renderizar millones de píxeles innecesarios.
- El efecto pesado de líneas y explosión solo se calcula durante los segundos en que es visible.
- Después del florecimiento quedan solo partículas ambientales ligeras a ~30 FPS.
- Menos nodos DOM para semillas y mini-pétalos.
- Se eliminó `mix-blend-mode` del canvas de pantalla completa.
- Las imágenes de la prueba se decodifican en segundo plano.
- Se precalculan valores trigonométricos de los trazos.


## V6 — secuencia corregida

El flujo ahora se divide en beats claros:

1. Al pulsar Sí, primero florece la flor central sin partículas compitiendo con ella.
2. Aparece el centro/semillas.
3. Entra el texto de Six Flags.
4. Después comienza el efecto procedural de líneas + partículas.
5. La celebración de partículas explota alrededor de la flor ya terminada.
6. Luego entran los ramos laterales y la montaña rusa.
7. Finalmente aparece “Ver la prueba”.

Además de verse más claro, esto reparte el trabajo de renderizado en el tiempo y evita ejecutar flor + partículas + ramos + montaña rusa en el mismo instante.
