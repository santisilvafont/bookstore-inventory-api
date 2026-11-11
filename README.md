<div align="center">

# Bookstore Inventory API

*Inventario de una cadena de librerías, con el precio de venta calculado a partir de la tasa de cambio del día.*

[![CI](https://github.com/santisilvafont/bookstore-inventory-api/actions/workflows/ci.yml/badge.svg)](https://github.com/santisilvafont/bookstore-inventory-api/actions/workflows/ci.yml)
![Django](https://img.shields.io/badge/Django-5.2_LTS-092E20?logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker_Compose-ready-2496ED?logo=docker&logoColor=white)

</div>

API REST en Django con una SPA en React. Gestiona el catálogo de libros y calcula el **precio de venta sugerido**: convierte el costo en dólares a la moneda del país del proveedor con la tasa del día ([exchangerate-api.com](https://www.exchangerate-api.com/)) y aplica un margen del 40 %. Si la API de tasas falla, usa una tasa por defecto.

| Capa | Tecnologías |
|------|-------------|
| Backend | Python 3.14, Django 5.2 LTS, Django REST Framework, PostgreSQL 17 |
| Frontend | React 19, TypeScript, Vite, TanStack Query, React Router, React Hook Form + zod, Radix UI, Tailwind CSS |
| Infraestructura | Docker Compose, nginx, GitHub Actions |

## Requisitos previos

- [Docker](https://docs.docker.com/get-docker/) con Docker Compose v2.24 o superior.
- Git.
- Puertos libres: `8080` (web) y `8000` (API).

No hace falta instalar Python, Node.js ni PostgreSQL: todo corre en contenedores.

## Instalación y ejecución

```bash
git clone https://github.com/santisilvafont/bookstore-inventory-api.git
cd bookstore-inventory-api
docker compose up --build
```

El primer arranque tarda unos minutos. Las migraciones se aplican solas y se carga un **catálogo de ejemplo** de 25 libros reales, con varias monedas y algunos con stock bajo.

| Servicio | URL |
|----------|-----|
| **Interfaz web** | http://localhost:8080 |
| API | http://localhost:8000/books |
| Documentación interactiva (Swagger) | http://localhost:8000/api/docs |

No hace falta ningún archivo `.env`. Para detener todo: `docker compose down` (con `-v` también se borra la base de datos).

<details>
<summary><strong>Configuración (variables de entorno)</strong></summary>

Todas tienen un valor por defecto para desarrollo. Para cambiarlas, copia `.env.example` a `.env`.

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `DJANGO_SECRET_KEY` | valor de desarrollo | Clave secreta de Django (obligatoria fuera de compose) |
| `DJANGO_DEBUG` | `true` | Modo de depuración |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:8080,http://localhost:5173` | Orígenes que pueden llamar a la API |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `bookstore` | Base de datos |
| `SEED_SAMPLE_DATA` | `true` | Carga el catálogo de ejemplo si no hay libros |
| `EXCHANGE_RATE_API_URL` | `https://api.exchangerate-api.com/v4/latest/USD` | API de tasas |
| `EXCHANGE_RATE_API_TIMEOUT` | `5` | Segundos de espera a la API de tasas |
| `EXCHANGE_RATE_CACHE_SECONDS` | `3600` | Caché de las tasas |
| `VITE_API_URL` | `http://localhost:8000` | URL de la API vista desde el navegador. Se aplica al compilar: `docker compose up --build` |

</details>

<details>
<summary><strong>Desarrollo sin Docker</strong></summary>

**Frontend con recarga en caliente** (Node.js 24), con el backend en Docker (`docker compose up -d db backend`):

```bash
cd frontend && npm install && npm run dev   # http://localhost:5173
```

**Backend** (Python 3.14 y un PostgreSQL accesible):

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
export DJANGO_SECRET_KEY=dev DJANGO_DEBUG=true POSTGRES_HOST=localhost \
       POSTGRES_DB=bookstore POSTGRES_USER=bookstore POSTGRES_PASSWORD=bookstore
python manage.py migrate && python manage.py seed_books && python manage.py runserver
```

</details>

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/books` | Crear un libro |
| `GET` | `/books?page=1&page_size=10` | Listar libros (paginado) |
| `GET` | `/books/{id}` | Obtener un libro |
| `PUT` | `/books/{id}` | Actualizar un libro |
| `DELETE` | `/books/{id}` | Eliminar un libro |
| `GET` | `/books/search?category={categoría}` | Buscar por categoría (paginado) |
| `GET` | `/books/low-stock?threshold=10` | Libros con stock igual o menor que el umbral (paginado) |
| `POST` | `/books/{id}/calculate-price` | Calcular y guardar el precio de venta |

### Ejemplos

**Crear un libro.** El ISBN se acepta con o sin guiones, como ISBN-10 o ISBN-13:

```bash
curl -X POST http://localhost:8000/books -H "Content-Type: application/json" -d '{
  "title": "El túnel", "author": "Ernesto Sabato", "isbn": "0-306-40615-2",
  "cost_usd": 11.5, "stock_quantity": 6, "category": "Novela", "supplier_country": "AR"
}'
```

Respuesta `201 Created`. El ISBN se guarda como ISBN-13 y la moneda sale del país del proveedor:

```json
{
  "id": 26, "title": "El túnel", "author": "Ernesto Sabato", "isbn": "9780306406157",
  "cost_usd": 11.5, "selling_price_local": null, "currency": "ARS", "stock_quantity": 6,
  "category": "Novela", "supplier_country": "AR",
  "created_at": "2026-11-11T22:09:11.020431Z", "updated_at": "2026-11-11T22:09:11.020451Z"
}
```

**Listar, buscar y consultar:**

```bash
curl "http://localhost:8000/books?page=2&page_size=5"
curl "http://localhost:8000/books/search?category=novela"
curl "http://localhost:8000/books/low-stock?threshold=10"
curl http://localhost:8000/books/26
```

Los listados devuelven `count`, `total_pages`, `page`, `page_size`, `next`, `previous` y `results`.

**Calcular el precio de venta** de *Don Quijote de la Mancha* (proveedor español):

```bash
curl -X POST http://localhost:8000/books/1/calculate-price
```

```json
{
  "book_id": 1, "cost_usd": 15.99, "exchange_rate": 0.894, "cost_local": 14.3,
  "margin_percentage": 40, "selling_price_local": 20.02, "currency": "EUR",
  "rate_source": "live", "calculation_timestamp": "2026-11-11T03:29:48.485177Z"
}
```

`rate_source` vale `"live"` si la tasa vino de la API externa y `"default"` si se usó la tasa por defecto.

**Eliminar:** `curl -X DELETE http://localhost:8000/books/26` responde `204 No Content`.

### Errores

Todos los errores comparten el mismo formato. En los `400`, `errors` trae los mensajes de cada campo:

```json
{
  "status": 400,
  "code": "invalid",
  "detail": "Los datos enviados no son válidos.",
  "errors": {
    "isbn": ["El dígito de control del ISBN no es válido."],
    "cost_usd": ["El costo debe ser mayor a 0."]
  }
}
```

| Código | Cuándo |
|--------|--------|
| `400` | Datos inválidos, ISBN duplicado o parámetros incorrectos |
| `404` | El libro no existe |
| `500` | Error inesperado (el detalle queda en los logs, no en la respuesta) |
| `503` | La API de tasas falla y no hay tasa por defecto para la moneda |

## Decisiones de diseño

- **Moneda local:** el enunciado no la define. Su ejemplo (`supplier_country: "ES"` → `EUR`) indica que es la **moneda del país del proveedor**. Hay 18 países soportados, definidos en [`countries.py`](backend/books/countries.py); un país fuera de la lista se rechaza con un `400`.
- **ISBN:** además de los 10 o 13 dígitos, se comprueba el **dígito de control** y el prefijo 978/979. Se guarda siempre como ISBN-13 sin guiones, así un mismo libro no se puede registrar dos veces escribiéndolo de otra forma (`0-306-40615-2` y `978-0-306-40615-7` son el mismo).
- **Cálculo:** `cost_local = cost_usd × tasa` y `selling_price_local = cost_local × 1,40`, con `Decimal` y redondeo comercial a 2 decimales en cada paso. Reproduce el ejemplo del enunciado (`15,99 × 0,85 = 13,59 → 19,03`); hay un test que lo comprueba.
- **Tasa por defecto:** las tasas se guardan en caché una hora. Si la API falla (error de red, timeout de 5 s o respuesta inválida), se usa la tasa por defecto de esa moneda y no se vuelve a consultar en 60 s. Como todas las monedas soportadas tienen tasa por defecto, el `503` queda como última línea de defensa.
- **Reglas en dos capas:** validaciones de Django con mensajes en español y restricciones en PostgreSQL (costo > 0, stock ≥ 0, ISBN único) como red de seguridad.
- **Consistencia:** si cambia el costo o el país de un libro, su precio de venta vuelve a `null`. El cálculo bloquea la fila del libro para no guardar un precio calculado con un costo que cambió mientras tanto.

## Interfaz web

En **http://localhost:8080**:

- **Catálogo** en tabla con paginación del backend, pestañas *Todos · Stock bajo · Agotados* (con el umbral ajustable) y búsqueda por categoría.
- **Crear y editar** en formularios que validan el ISBN (incluido el dígito de control), el costo y el stock antes de enviar. Los errores del servidor aparecen bajo cada campo.
- **Eliminar** con un diálogo de confirmación, desde la ficha o desde el menú `⋯` de cada fila.
- **Calcular precio de venta** desde la ficha o desde la tabla, con el desglose: costo, tasa aplicada, costo local, margen y precio final.
- **Indicadores de carga** y **notificaciones** de éxito y error (400, 404, 500, 503 y sin conexión).
- Modo oscuro, navegación por teclado y diseño adaptado al móvil.

## Colección de Postman

[`postman/bookstore-inventory-api.postman_collection.json`](postman/bookstore-inventory-api.postman_collection.json) contiene peticiones a todos los endpoints, incluidos los casos de error.

1. En Postman: **Import** → elige el archivo.
2. Haz clic derecho en la colección → **Run collection** → **Run**. Las peticiones se ejecutan en orden: crean un libro, lo consultan, lo actualizan, calculan su precio, prueban los errores y lo eliminan. Cada una comprueba su respuesta automáticamente.

La URL de la API está en la variable `baseUrl` de la colección (`http://localhost:8000` por defecto).

## Tests

```bash
docker compose exec backend python manage.py test   # 90 tests del backend
cd frontend && npm test                             # 136 tests del frontend
```

La API de tasas se simula en los tests, así que no dependen de la red. En cada push, [GitHub Actions](.github/workflows/ci.yml) ejecuta el lint, los tests de las dos partes y la construcción de las imágenes Docker.

## Estructura

```
backend/
  config/            settings, urls y formato de errores
  books/             modelo, serializers, vistas, cálculo de precio, tasas, ISBN y tests
frontend/src/
  api/               cliente HTTP, tipos y errores
  features/books/    catálogo, ficha, formularios y borrado
  components/ui/     componentes reutilizables
postman/             colección de Postman
compose.yaml
```
