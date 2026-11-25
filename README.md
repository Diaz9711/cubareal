# Cuba Real

**La realidad que no te cuentan.** — www.cubareal.net

Sitio independiente que documenta la crisis en Cuba con fuentes verificadas: presos políticos, 11J, apagones, hambre, exilio y 67 años de dictadura. Español e inglés.

## Diseño

Sistema visual de «documento de misión»:

- **Portada orbital**: un globo 3D real (proyección ortográfica, contornos Natural Earth) con el terminador día/noche y el punto subsolar calculados en tiempo real según la posición del Sol. Encima, la traza de un satélite y las luces de Cuba con apagones (estas dos últimas capas son ilustrativas y así lo indica la página).
- **Reloj de misión T+** desde el 1 de enero de 1959 (hora de Cuba).
- **Telemetría en vivo**: hora de La Habana, tasa USD→CUP (Yadio), fase solar.
- Tipografía extendida aeroespacial (Archivo Expanded + IBM Plex Mono), naranja internacional como color de señal, reglas finas, esquinas rectas y marcas de registro.
- Riel lateral de 11 etapas, cabeceras con código de documento (CR-01…CR-11), figuras numeradas y expedientes.

## Estructura

```
content/es/*.html     ← contenido editable (una página por archivo)
content/en/*.html     ← versión en inglés
scripts/build.mjs     ← genera el sitio (sin dependencias)
assets/site.css       ← sistema visual
assets/site.js        ← interacciones (filtros de presos, dólar en vivo, reloj…)
assets/globe.js       ← globo orbital
assets/geo/           ← contornos del mundo y del Caribe (Natural Earth)
assets/vendor/        ← d3-array y d3-geo (ISC)
photos/               ← fotografías
index.html, pais/, pueblo/, … en/   ← páginas generadas (no editar a mano)
```

Secciones: Hoy · El país · El pueblo · (Singaos) · La Dictadura · Exilio · Metodología · Contexto · Historia de Cuba · Quiénes somos · Unirse · El dólar.

## Cómo editar

1. Edita el archivo de `content/es/` (y su par en `content/en/`). La primera línea `<!--meta {...} -->` define el título, el antetítulo y la entradilla de la página.
2. Regenera el sitio:

   ```sh
   node scripts/build.mjs
   ```

3. Haz commit y push. Las páginas generadas van en el repo, así que no hace falta paso de build en el servidor.

Para verlo en local: `python3 -m http.server` en la raíz y abre http://localhost:8000.

## Publicación en Vercel

El sitio es estático. En Vercel: **Project → Settings → Git** y conecta este repositorio (`diaz9711/cubareal`), rama `main`. Framework preset: **Other**, sin build command, output directory: la raíz. A partir de ahí, cada push a `main` se publica en cubareal.net y cada rama genera una preview.

## Origen del contenido

El contenido se importó de la versión anterior de cubareal.net con `scripts/import/` (Playwright + cheerio; solo hacía falta una vez). Desde ahora la fuente es `content/`.

---

Creado por Brayan Díaz.
