# CLAUDE.md

Guía para trabajar en este repositorio. Léela antes de hacer cambios.

## Qué es

Sitio web institucional de **Land Opportunity** (inmobiliaria de desarrollos en
Nuevo León, México). Es un **sitio estático** publicado en **GitHub Pages** con
dominio propio (`landopportunity.com`, ver [CNAME](CNAME)).

- **Idioma del contenido:** español (mexicano). Toda la copy visible va en español.
- **Sin build, sin framework, sin dependencias.** HTML + CSS + JavaScript vanilla.
  No hay `package.json`, ni Node, ni bundler. Los archivos se editan a mano y se
  sirven tal cual.
- El usuario suele subir cambios por la **interfaz web de GitHub** ("Add files via
  upload") y los revisa en el sitio publicado, no en local.

## Stack / lenguajes

| Archivo | Lenguaje | Rol |
|---|---|---|
| [index.html](index.html) | HTML | Estructura. SPA de 2 "páginas" (inicio y proyectos). Carga `styles.css` y `main.js`. |
| [styles.css](styles.css) | CSS | Todos los estilos. Variables de tema en `:root` (paleta `--gold`, `--green`, colores por sector `--sector-*`, fuentes `--serif`/`--sans`/`--mono`). |
| [main.js](main.js) | JavaScript (vanilla, sin módulos) | Toda la lógica. Se carga con `<script src="main.js">` al final del body; el DOM ya está listo. |
| [projects.json](projects.json) | JSON | **Fuente editable** de los proyectos (metadatos, sin imágenes). |
| [img/](img/) | — | Fotos y videos de cada proyecto, en subcarpetas por `id`. |
| [README.md](README.md) | — | Guía para el **cliente** (cómo subir fotos/videos/proyectos). Mantener en sync. |

**Fuentes (Google Fonts):** Cormorant Garamond (serif/títulos), DM Sans (texto),
DM Mono (detalles/monospace).

## Estructura de la página (index.html)

Es una SPA simple con 2 "páginas" que se alternan con `showPage(id)`:

- `#page-main` (clase `page active` por defecto) — secciones:
  `#about` (Nosotros), `#liderazgo` (Liderazgo), `#industries` (sectores),
  `#contact` (contacto).
- `#page-projects` — el portafolio de proyectos, con filtro por sector y los grids.

`showPage('projects')` / `showPage('main')` alternan cuál se muestra. `goTo('#id')`
hace scroll suave a una sección dentro de la página de inicio.

## Sistema de proyectos (LO MÁS IMPORTANTE)

Los proyectos NO están hardcodeados en el HTML ni llevan imágenes embebidas. El
flujo es:

1. `main.js` → `_loadProjects()` hace `fetch('projects.json')`.
2. Por cada proyecto, **descubre sus fotos solo** probando
   `img/<id>/1.jpg`, `2.jpg`, ... hasta que un número no existe
   (`_discoverPhotos`, extensiones probadas: `jpg, jpeg, png, webp`).
3. También busca `img/<id>/video.mp4` (`_discoverVideo`). Si existe, la tarjeta
   muestra un botón **"▶ Video"** que abre un modal (`openVideo`/`closeVideo`,
   markup `#vid-overlay` en index.html).
4. `_buildCard(p, fotos, video)` arma la tarjeta y la mete en el grid del sector.

### projects.json — formato

```json
{
  "projects": [
    {
      "id": "san-mateo-elite",            // = nombre de la carpeta en img/<id>/
      "nombre": "San Mateo Elite",
      "sector": "campestre",              // uno de los 4 sectores (ver abajo)
      "sectorLabel": "Fraccionamiento Campestre",
      "estatus": "active",
      "estatusClase": "s-active",         // color: s-active/s-pre (dorado), s-limited (ámbar), s-coming (gris), s-sold (rojo)
      "estatusLabel": "Activo · Lotes Disponibles",
      "descripcion": "...",
      "ubicacion": "Cadereyta Jiménez, N.L."
    }
  ]
}
```

- Campo opcional `"fotos": [...]` (rutas explícitas) **anula** el autodescubrimiento.
- Campo opcional `"video": "ruta.mp4"` **anula** la búsqueda de `video.mp4`.
- Algunas descripciones/ubicaciones usan entidades HTML (`&#225;`, `&#128205;`).
  Se inyectan con `innerHTML`, así que las entidades se renderizan; es válido.

### Sectores (fijos)

Cada sector tiene su grid `id="grid-<sector>"` en index.html. Un proyecto solo
aparece si su `sector` es uno de estos cuatro:

| `sector` | Sección |
|---|---|
| `campestre` | Fraccionamientos Campestres |
| `industrial` | Parques Industriales |
| `residencial` | Residencial |
| `habitacional` | Departamentos Habitacionales |

Agregar un sector nuevo requiere también un grid nuevo en index.html y agregarlo
a los arrays `['campestre','industrial','residencial','habitacional']` en
`_loadProjects` y `filterProjs` (main.js).

### Carpeta img/ — convenciones

```
img/<id>/1.jpg, 2.jpg, ...   fotos numeradas SIN saltos (el orden = la galería)
img/<id>/video.mp4           video opcional (un solo archivo, exactamente ese nombre)
```

- Numeración **contigua desde 1**: si falta un número, el descubrimiento se
  detiene ahí (un hueco corta las fotos siguientes).
- Estado actual: `san-mateo-elite` (9 fotos + video), `imperium` (2 fotos, sin
  video), `quintas-residencial-campestre` (25 fotos + video), `san-lorenzo`
  (6 fotos, sin video), `san-mateo-los-olivos` (6 fotos + video).

## Optimización de imágenes y video (macOS, sin dependencias)

Las fotos directas de cámara (8–16 MB) y los videos crudos (50–90 MB) son
**demasiado pesados** para un sitio en GitHub Pages. Hay que optimizarlos antes
de publicarlos. Herramientas nativas de macOS (no hay ffmpeg ni ImageMagick):

```bash
# Fotos: resize a máx 2000 px lado largo, calidad 70 (deja ~300–600 KB)
sips -Z 2000 -s format jpeg -s formatOptions 70 ENTRADA.jpg --out SALIDA.jpg

# Video: a MP4 H.264 ligero (~5–8 MB). NO usar HEVC (no carga en Chrome/Firefox).
avconvert -s ENTRADA.mov -p PresetMediumQuality -o img/<id>/video.mp4 --replace
```

- `sips` normaliza la orientación EXIF al re-encodear (las verticales quedan bien).
- `PresetMediumQuality` da 320×568 vertical, suficiente para web/móvil. Presets de
  más resolución (`Preset960x540`, `Preset1280x720`) pesan 26–40 MB → demasiado.
- Para video en HD sin inflar el repo, lo ideal es YouTube/Vimeo e incrustar.

## Otras piezas de main.js

- **Contacto:** `submitForm()` no usa backend; arma un mensaje y abre **WhatsApp**
  (`https://wa.me/528136056513`). El form es `#cForm` en index.html.
- **Galería:** slider horizontal por tarjeta (`slideGallery`, `setSlide`,
  `_galApply`), autoplay cada 5 s (`_startAutoplay`), y lightbox de fotos
  (`openLightbox`/`closeLightbox`/`lightboxNav`, overlay `#glb-overlay`).
- **Filtro de sector:** `filterProjs(sector, btn)` muestra/oculta grids.
- **UI:** cursor custom, scroll progress, reveal on scroll, tilt 3D en tarjetas,
  contador de proyectos (`updateCount`), menú móvil (`toggleMenu`).
- `addProject(...)` es un helper viejo de demo (tarjeta con emoji, sin galería);
  no es el flujo real. El flujo real es `projects.json` + `_loadProjects`.

## Cómo correr / revisar en local

`fetch('projects.json')` **no funciona** abriendo `index.html` con doble clic
(file://). Hay que servir por HTTP:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

(En el sitio publicado en GitHub Pages funciona normal porque es https.)

## Verificación rápida (headless)

Hay Google Chrome instalado pero no Node/puppeteer. Para verificar render sin
clic se puede volcar el DOM ya hidratado:

```bash
python3 -m http.server 8753 &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --disable-gpu --virtual-time-budget=12000 --dump-dom http://localhost:8753/ > /tmp/dom.html
# luego: grep 'pcard-name' /tmp/dom.html  (proyectos), 'gallery-videobtn' (videos)
```

## Gotchas / reglas

- **Mantener `projects.json` válido** (un JSON roto deja la página sin proyectos).
- **No volver a embeber imágenes en base64** ni en `main.js` ni en `projects.json`
  (antes pesaban 5.6 MB cada uno; ahora son externas en `img/`).
- **No subir fotos de cámara sin optimizar** ni videos sin comprimir.
- `.DS_Store` está en [.gitignore](.gitignore); no commitearlos.
- Las 2 imágenes que sí quedan embebidas en base64 en `index.html` son del
  logo/hero (no son fotos de proyecto); dejarlas salvo que se pida externalizarlas.
- Commit/push solo cuando el usuario lo pida.
