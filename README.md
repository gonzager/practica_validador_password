# Validador de contraseñas — Solución práctica parcial

Servicio web en **Node.js + Express** que lee un archivo de usuarios y detecta cuáles tienen una contraseña que **no cumple** con la política de seguridad. También permite dar de alta usuarios nuevos, rechazando los que traen una contraseña inválida.

---

## 1. Enunciado

Tu misión es desarrollar un servicio web con un endpoint de consulta que lea el archivo de usuarios y determine cuáles tienen un password asociado que no cumple con las reglas de la política de seguridad.

Hasta el momento hay definidas estas 5 reglas en la política de seguridad:

1. Dado el password alfanumérico, la longitud mínima de dicho password debe ser de **8 caracteres**.
2. Dado el password alfanumérico, **no puede contener espacios en blanco**.
3. Dado el password alfanumérico, debe contener **al menos uno** de los siguientes caracteres: `! # $ % & =`
4. Dado el password alfanumérico, debe contener **al menos un dígito** numérico.
5. Dado el password alfanumérico, **el último carácter no puede ser** ninguno de los de la regla 3.

### Archivo de usuarios

```json
[
  {
    "id": 1,
    "userName": "gonzager",
    "email": "gerardo.gonzalez@gmail.com",
    "password": "1qaz!QAZ"
  },
  {
    "id": 2,
    "userName": "florcita1975",
    "email": "florcita1975@gmail.com",
    "password": "flor1975"
  }
]
```

### Endpoint y respuesta

El endpoint de consulta debe llamarse `/validador` y la respuesta debe ser la lista de usuarios que **no cumplen con al menos 1 regla** de la política. Se devuelve el usuario con su email, **sin** los atributos `password` e `id`. Por ejemplo:

```json
[
  {
    "userName": "florcita1975",
    "email": "florcita1975@gmail.com"
  }
]
```

### Estructura de directorios pedida

```
└── src
    ├── data
    │   └── usuarios.json   # archivo json de usuarios con los password
    ├── politica
    │   └── reglas.js       # reglas
    └── index.js            # donde está el endpoint /validador y el listen por entorno
└── package.json
```

### Se pide

1. Configurar un servidor Express capaz de recibir y responder mensajes en formato JSON.
2. Implementar en `reglas.js` todas las validaciones de la política de seguridad.
3. Implementar el endpoint `GET /validador`.
4. Implementar el endpoint `POST /usuarios`.
5. Validar la contraseña en el endpoint `POST /usuarios`. Si la contraseña es inválida, responder con código **400 Bad Request**.

### Consideraciones

- No se permite duplicar lógica de validación.
- Todas las reglas deben implementarse mediante funciones reutilizables en `reglas.js`.
- El endpoint `GET /validador` y el endpoint `POST /usuarios` deben utilizar dichas funciones.

### Mejora sobre el enunciado

Además de lo pedido, la respuesta para los usuarios que no validan incluye **qué reglas incumple** cada uno (`errores`). Así quien consume el servicio no sólo sabe *que* la contraseña es inválida, sino *por qué*.

---

## 2. Estructura del proyecto

```
solucion-practica-parcial
├── src
│   ├── data
│   │   └── usuarios.json    # usuarios con sus passwords
│   ├── politica
│   │   └── reglas.js        # reglas de la política + funciones de validación
│   └── index.js             # servidor Express y endpoints
├── package.json
└── README.md
```

---

## 3. Cómo se resuelve (paso a paso)

La idea central de la solución es: **las reglas son datos**. En lugar de escribir un `if` gigante con las 5 condiciones, cada regla se modela como un objeto con un nombre y una función. Después, "validar" es simplemente recorrer esa lista.

### 3.1. Las reglas como una lista de objetos (`src/politica/reglas.js`)

```js
const CARACTERES_OBLITATORIOS = ['!','#','$','%','&','=']
const DIGITOS_OBLIGATORIOS = ['0','1','2','3','4','5','6','7','8','9']
```

Primero se definen dos constantes. La lista de caracteres especiales se usa en **dos** reglas (la 3 y la 5), así que tenerla en un solo lugar evita duplicarla: si mañana se agrega `@` a la política, se cambia una sola línea.

Cada regla es un objeto `{ nombre, fn }`:

- `nombre`: descripción legible, que se usa para informar el error.
- `fn`: una función **predicado** que recibe el password y devuelve `true` si **cumple** la regla.

| # | Regla | Implementación | Idea |
|---|-------|----------------|------|
| 1 | Longitud mínima 8 | `pwd.length >= 8` | Los strings tienen `length`. |
| 2 | Sin espacios | `!pwd.includes(' ')` | `includes` busca un substring; se niega el resultado. |
| 3 | Al menos un especial | `CARACTERES_OBLITATORIOS.some(c => pwd.includes(c))` | `some` devuelve `true` si **alguno** de los especiales aparece. |
| 4 | Al menos un dígito | `DIGITOS_OBLIGATORIOS.some(d => pwd.includes(d))` | Misma técnica que la regla 3. |
| 5 | Último carácter no especial | `!CARACTERES_OBLITATORIOS.some(c => c == pwd[pwd.length - 1])` | Se toma el último carácter y se verifica que **ninguno** de los especiales coincida. |

Observá que las reglas 3 y 4 son el mismo patrón ("¿alguno de estos caracteres está en el password?") aplicado a listas distintas. Ese es el beneficio de pensar con funciones de orden superior como `some`.

### 3.2. Las dos funciones reutilizables

```js
const validarReglas  = ({password}) => rules.every(rule => rule.fn(password))
const reglasNoCumplen = (pwd)       => rules.filter(rule => !rule.fn(pwd))

module.exports = { validarReglas, reglasNoCumplen }
```

- **`validarReglas(usuario)`** → `true` / `false`.
  Usa `every`: el password es válido sólo si **todas** las reglas devuelven `true`. Recibe el usuario completo y, con *destructuring* (`{password}`), toma sólo el campo que le interesa.

- **`reglasNoCumplen(password)`** → lista de reglas incumplidas.
  Usa `filter` para quedarse con las reglas cuya función devuelve `false`. Es la base de la "mejora": permite decir *qué* falló.

Estas dos funciones son **toda** la lógica de validación del sistema. Ningún endpoint vuelve a escribir una regla: ambos las importan. Así se cumple la consigna de "no duplicar lógica".

> **¿Cómo se agrega una regla nueva?** Se agrega un objeto más al array `rules`. Ni `validarReglas`, ni `reglasNoCumplen`, ni los endpoints necesitan cambiar.

### 3.3. El servidor Express (`src/index.js`)

```js
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000
const usuarios = require('./data/usuarios.json')
const { validarReglas, reglasNoCumplen } = require('./politica/reglas')

app.use(express.json())
```

- `process.env.PORT || 3000`: el puerto se toma de una **variable de entorno** y, si no está definida, se usa 3000 ("listen por entorno").
- `require` de un `.json`: Node lo parsea automáticamente y devuelve el array de usuarios.
- `app.use(express.json())`: *middleware* que convierte el cuerpo de las peticiones con `Content-Type: application/json` en un objeto JS disponible en `req.body`. Sin esto, el `POST` no podría leer el usuario enviado.

### 3.4. `GET /validador`

```js
app.get('/validador', (_, res) => {
    const userNoCumplen = usuarios
        .filter(usuario => !validarReglas(usuario))
        .map(({password, id, ...resto}) => {
            return { usuario: resto, errores: reglasNoCumplen(password) }
        })
    return res.status(200).json(userNoCumplen)
})
```

Es una **cadena de transformaciones** sobre el array:

1. **`filter`** se queda con los usuarios cuyo password **no** valida (`!validarReglas(usuario)`).
2. **`map`** transforma cada usuario en la forma de respuesta. El truco está en el *destructuring con rest*:
   `({password, id, ...resto})` saca `password` e `id` en variables propias y junta **todo lo demás** (`userName`, `email`) en `resto`. Así se excluyen los campos sensibles sin tener que nombrar los que sí van.
3. Con el `password` que quedó a mano se calcula `reglasNoCumplen(password)`.

**Detalle interesante:** cada regla es `{ nombre, fn }`, pero en la respuesta sólo aparece `nombre`. Eso pasa porque `res.json` usa `JSON.stringify`, que **descarta las propiedades cuyo valor es una función**. No hace falta mapear a mano.

### 3.5. `POST /usuarios`

```js
app.post('/usuarios', (req, res) => {
    const usuario = req.body
    if (!validarReglas(usuario))
        return res.status(400).json({
            mensaje: `La password ${usuario.password} no cumple con los requisitos`,
            errores: reglasNoCumplen(usuario.password)
        })
    const id = usuarios.reduce((acum, each) => acum > each.id ? acum : each.id, 0) + 1
    const newUsuario = { id, ...usuario }
    usuarios.push(newUsuario)
    res.status(201).json(newUsuario)
})
```

1. Se toma el usuario del body (gracias a `express.json()`).
2. Se valida con **la misma** función `validarReglas`. Si falla → **400 Bad Request** con el detalle de reglas incumplidas (de nuevo, `reglasNoCumplen`).
3. Si es válido, se calcula el próximo `id` con `reduce`: se busca el `id` máximo (arrancando en 0) y se le suma 1.
4. Se arma el nuevo usuario con *spread* (`{ id, ...usuario }`), se agrega al array en memoria y se responde **201 Created**.

> Los usuarios agregados viven **en memoria**: al reiniciar el servidor se vuelve al contenido de `usuarios.json`.

### 3.6. Endpoints extra

Para facilitar las pruebas se agregaron:

- `GET /usuarios` → lista todos los usuarios.
- `GET /usuarios/:id` → devuelve un usuario o **404** si no existe.

---

## 4. Uso

### Requisitos

- Node.js 18 o superior
- npm

### Instalación

```bash
npm install
```

### Ejecución

```bash
npm start      # node src/index.js
npm run dev    # con nodemon: reinicia al guardar cambios
```

Por defecto escucha en el puerto **3000**. Para usar otro puerto:

```bash
# bash / Git Bash
PORT=4000 npm start
```

```powershell
# PowerShell
$env:PORT=4000; npm start
```

### Endpoints

| Método | Ruta | Descripción | Respuestas |
|--------|------|-------------|------------|
| GET  | `/validador`     | Usuarios cuyo password no cumple la política | 200 |
| POST | `/usuarios`      | Alta de usuario (valida el password) | 201 / 400 |
| GET  | `/usuarios`      | Lista todos los usuarios | 200 |
| GET  | `/usuarios/:id`  | Un usuario por id | 200 / 404 |

---

## 5. Ejemplos

### `GET /validador`

```bash
curl http://localhost:3000/validador
```

Con el `src/data/usuarios.json` incluido, `gonzager` tiene password `qazEQ` (corto, sin especial, sin dígito), mientras que `florcita1975` tiene `flor#1975`, que cumple todo:

```json
[
  {
    "usuario": {
      "userName": "gonzager",
      "email": "gerardo.gonzalez@gmail.com"
    },
    "errores": [
      { "nombre": "longitud mínima" },
      { "nombre": "Contiene al menos uno de los siguiente caracteres !#$%&=" },
      { "nombre": "Contiene al menos un dígito número" }
    ]
  }
]
```

### `POST /usuarios` — password inválido (400)

```bash
curl -X POST http://localhost:3000/usuarios \
  -H "Content-Type: application/json" \
  -d '{"userName":"x","email":"x@x.com","password":"abc 1"}'
```

```json
{
  "mensaje": "La password abc 1 no cumple con los requisitos",
  "errores": [
    { "nombre": "longitud mínima" },
    { "nombre": "No puede contener espacios en blanco" },
    { "nombre": "Contiene al menos uno de los siguiente caracteres !#$%&=" }
  ]
}
```

### `POST /usuarios` — password válido (201)

```bash
curl -X POST http://localhost:3000/usuarios \
  -H "Content-Type: application/json" \
  -d '{"userName":"juan","email":"juan@mail.com","password":"Seg#2024a"}'
```

```json
{
  "id": 3,
  "userName": "juan",
  "email": "juan@mail.com",
  "password": "Seg#2024a"
}
```

### Casos para probar cada regla

| Password | Regla(s) que incumple |
|----------|-----------------------|
| `Ab#1`        | 1 (longitud) |
| `Ab# 12345`   | 2 (espacio) |
| `Abcd12345`   | 3 (sin especial) |
| `Abcd#efgh`   | 4 (sin dígito) |
| `Abcd1234#`   | 5 (termina en especial) |
| `Abc#1234`    | ninguna ✅ |

---

## 6. Conceptos de JavaScript que se practican

- **Funciones de orden superior** sobre arrays: `filter`, `map`, `some`, `every`, `reduce`.
- **Destructuring** de objetos, incluido el operador *rest* (`{password, id, ...resto}`).
- **Spread** para construir objetos (`{ id, ...usuario }`).
- **Funciones como datos**: guardar funciones dentro de objetos y recorrerlas.
- **Middleware** en Express (`express.json()`) y códigos de estado HTTP (200, 201, 400, 404).
- **Variables de entorno** (`process.env.PORT`).
