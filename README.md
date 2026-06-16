# Land Opportunity — Guía para editar proyectos y fotos

Esta página es un sitio estático (GitHub Pages). Los proyectos y sus fotos se
manejan en **dos lugares**:

| Quiero... | ¿Dónde? |
|---|---|
| Cambiar/agregar/quitar **fotos** de un proyecto | Carpeta `img/<id-del-proyecto>/` |
| Agregar/cambiar el **video** de un proyecto | Archivo `img/<id-del-proyecto>/video.mp4` |
| Cambiar **nombre, descripción, ubicación, sector, estatus** o **agregar un proyecto nuevo** | Archivo `projects.json` |

> **Importante:** las fotos y videos ya **NO** van dentro de `projects.json` ni de
> `main.js`. Solo se suben como archivos a la carpeta `img/`. El sitio los detecta solo.

---

## 1) Cambiar o agregar fotos de un proyecto existente

Cada proyecto tiene su carpeta dentro de `img/`. El `id` es el de `projects.json`:

```
img/
  san-mateo-elite/                 1.jpg ... 9.jpg   video.mp4
  imperium/                        1.png  2.jpg
  quintas-residencial-campestre/   1.jpg ... 25.jpg  video.mp4
  san-lorenzo/                     1.jpg ... 6.jpg
  san-mateo-los-olivos/            1.jpg ... 6.jpg   video.mp4
```

**Reglas de las fotos:**

1. Nómbralas con números **seguidos, empezando en 1**: `1.jpg`, `2.jpg`, `3.jpg`...
   - El número es el **orden** en que aparecen en la galería.
   - **Sin saltos.** Si subes `1.jpg` y `3.jpg` pero falta `2.jpg`, el sitio
     se detiene en el `1` y no mostrará la `3`.
2. Formatos aceptados: `.jpg`, `.jpeg`, `.png`, `.webp` (en **minúsculas**).
   Lo recomendado es `.jpg`.
3. **Agregar una foto:** sube el siguiente número (ej. si hay hasta `6.jpg`, sube `7.jpg`).
4. **Quitar una foto:** borra el archivo y **renumera** las que queden para que
   no haya huecos (ej. si borras `3.jpg`, renombra `4→3`, `5→4`, etc.).
5. **Reemplazar una foto:** sube una con el mismo nombre que la que quieres cambiar.

No hay que tocar ningún código: con subir/borrar archivos basta.

> **Importante — tamaño/peso:** sube las fotos ya **optimizadas** (ideal ~2000 px
> de lado largo y menos de ~400 KB). Las fotos directas de cámara (8–16 MB) hacen
> el sitio lentísimo y pesan demasiado para GitHub. Puedes optimizar una carpeta
> con el comando de macOS:
> ```bash
> # baja todas las .jpg de una carpeta a máx. 2000 px y calidad 70
> for f in img/MI-PROYECTO/*.jpg; do sips -Z 2000 -s formatOptions 70 "$f" --out "$f"; done
> ```

### Video del proyecto (opcional)

- Sube **un solo** archivo llamado exactamente **`video.mp4`** dentro de la carpeta
  del proyecto: `img/<id>/video.mp4`. Aparecerá un botón **"▶ Video"** sobre la
  galería que abre el video en una ventana.
- Debe ser **MP4 (H.264)** para que funcione en todos los navegadores, y **ligero**
  (idealmente < 10 MB). Para comprimir un video pesado, en macOS:
  ```bash
  avconvert -s "VIDEO-ORIGINAL.mov" -p PresetMediumQuality -o "img/MI-PROYECTO/video.mp4" --replace
  ```
- Para **quitar** el video: borra `video.mp4`.
- ¿Quieres video en alta calidad sin que pese en el repo? Súbelo a YouTube/Vimeo
  y avísame para incrustarlo (es lo ideal para videos largos o en HD).

---

## 2) Agregar un proyecto nuevo

**Paso 1 — Crea su carpeta de fotos.** En `img/` crea una carpeta con un `id`
en minúsculas y con guiones (sin espacios ni acentos), por ejemplo
`img/lomas-del-roble/`, y sube ahí `1.jpg`, `2.jpg`, ... (y opcionalmente
`video.mp4`).

**Paso 2 — Agrega su bloque en `projects.json`.** Copia este modelo dentro de la
lista `"projects"` (separa cada proyecto con una coma):

```json
{
  "id": "lomas-del-roble",
  "nombre": "Lomas del Roble",
  "sector": "campestre",
  "sectorLabel": "Fraccionamiento Campestre",
  "estatus": "active",
  "estatusClase": "s-active",
  "estatusLabel": "Activo · Lotes Disponibles",
  "descripcion": "Descripción del proyecto...",
  "ubicacion": "Santiago, N.L."
}
```

- **`id`** debe ser **idéntico** al nombre de la carpeta en `img/`.
- **`sector`** debe ser uno de estos cuatro (define en qué sección aparece):

  | `sector` | Sección de la página |
  |---|---|
  | `campestre` | Fraccionamientos Campestres |
  | `industrial` | Parques Industriales |
  | `residencial` | Residencial |
  | `habitacional` | Departamentos Habitacionales |

- **`estatusClase` / `estatusLabel`** (la etiqueta de color del estatus):

  | Estado | `estatusClase` | Color | `estatusLabel` (ejemplo) |
  |---|---|---|---|
  | Activo / disponible | `s-active` | dorado | `Activo · Lotes Disponibles` |
  | Preventa | `s-pre` | dorado claro | `Preventa` |
  | Queda poco / +50% vendido | `s-limited` | ámbar | `Últimos Lotes` (lotes) / `Últimas Unidades` (unidades) |
  | Próximamente | `s-coming` | gris | `Próximamente` |
  | Vendido / ocupado | `s-sold` | rojo | `No Disponibles · Ocupados` |

  > El `estatusLabel` es texto libre (puedes escribir lo que quieras); el
  > `estatusClase` define solo el **color** de la etiqueta.

---

## 3) Quitar un proyecto

1. Borra su bloque del array `"projects"` en `projects.json`.
2. (Opcional) Borra su carpeta en `img/`.

---

## Notas técnicas

- `index.html` carga `styles.css` y `main.js`.
- `main.js` lee `projects.json` y, por cada proyecto, busca sus fotos en
  `img/<id>/1.jpg`, `2.jpg`, ... hasta que un número no exista, y busca
  `img/<id>/video.mp4` para el botón de video.
- Para **ver los cambios localmente** necesitas un servidor (el `fetch` de
  `projects.json` no funciona abriendo el archivo con doble clic). Opciones:
  - `python3 -m http.server` dentro de esta carpeta y abre `http://localhost:8000`, o
  - simplemente sube los cambios a GitHub y míralos en el sitio publicado.
- Validar que `projects.json` no tenga errores: pégalo en <https://jsonlint.com>.
