# Leggal AI — reglas del proyecto

Monorepo: frontend/ (Expo + React + TypeScript) y backend/ (NestJS + Prisma + PostgreSQL).

## Reglas obligatorias
- Multiempresa: toda tabla lleva tenant_id. El tenant_id sale del JWT, nunca del cuerpo de la petición.
- Cada endpoint nuevo trae una prueba e2e que confirme que otra empresa no ve sus datos.
- Comentarios en español, claros: explican el por qué, no repiten el qué.
- Código limpio: antes de crear un componente o función, buscar si ya existe uno reutilizable. Evitar código repetido.
- Documentar las pruebas en docs/pruebas/.
- Commits obligatoriamente en español siguiendo las reglas de CONTRIBUTING.md.
- Formato: tipo(alcance): descripción en español.
- Utilizar verbos en infinitivo, minúsculas y sin punto final.
- Mantener los tipos de Conventional Commits: feat, fix, docs, style, refactor, test, chore, perf, build y ci.
- Nunca subir secretos al repositorio.

## Tablas sin tenant_id (excepciones a la regla multiempresa)
Una persona usa la misma cuenta en varias empresas (pantallas "Mis empresas" y
"Elige tu espacio"). Por eso sus datos no pueden pertenecer a una sola empresa:
si `usuarios` llevara tenant_id, la misma persona necesitaría una cuenta y una
contraseña por empresa.

| Tabla | Por qué no lleva tenant_id | Cómo se protege |
|---|---|---|
| `empresas` | Es el tenant: su `id` es el tenant_id de las demás | Se consulta por el `tid` del JWT o por las membresías activas de la persona |
| `usuarios` | Una persona, muchas empresas | Cada persona solo lee sus datos (`/auth/me`); los demás miembros se ven a través de `membresias` de la empresa activa |
| `perfiles` | Datos profesionales de la persona, no de la empresa | Siempre filtrado por el `sub` del JWT |
| `aceptaciones_legales` | El registro ocurre antes de tener empresa | Siempre filtrado por el `sub` del JWT |
| `identidades_externas` | Google o Facebook se vinculan a la persona | Siempre filtrado por el `sub` del JWT |
| `sesiones` | Una sesión existe antes de elegir empresa; guarda la empresa activa en `empresa_activa_id` | Siempre filtrado por el `sub` y el `sid` del JWT |
| `codigos_verificacion` | Verificar el correo y recuperar la contraseña ocurren antes de tener empresa | Siempre filtrado por el usuario |
| `modulos` | Catálogo fijo, igual para todas las empresas | Solo lectura desde la API; lo carga el seed |

Llevan tenant_id: `roles`, `rol_permisos`, `membresias`, `invitaciones` y
`auditoria` (nulo en eventos anteriores a elegir empresa, como registro y login).
Reglas para esas tablas:
- Sus índices empiezan por `tenant_id`, con dos excepciones. Las dos son
  búsquedas que ocurren **antes** de saber de qué empresa se trata, así que no
  pueden filtrar por tenant_id:
  - `membresias(usuario_id)`: "Mis empresas" y "Elige tu espacio" listan las
    empresas de una persona. Siempre se filtra por el `sub` del JWT.
  - `invitaciones(hash_codigo)`, único en toda la base: al canjear un código
    se busca primero el código y de ahí sale la empresa. Limitado a 5 intentos
    por hora por usuario.

  Las políticas de seguridad a nivel de fila (B36) tienen que permitir estas
  dos búsquedas sin abrir el resto de la tabla.
- Se referencian entre sí con llaves compuestas `(tenant_id, id)`, para que
  PostgreSQL rechace mezclar datos de dos empresas aunque el código falle.
- La seguridad a nivel de fila (B36) solo se aplica a ellas.

## Dependencias y entorno (obligatorio)
- Toda dependencia o herramienta nueva se registra en docs/procesos/dependencias.md
  (fecha, paquete, versión exacta, dónde, para qué, quién) en el mismo PR.
- Las herramientas globales, plugins y servicios van en docs/procesos/entorno.md.
- Versiones exactas siempre; no usar ^ ni ~. Subir siempre el package-lock.json.
- Node 26.13.0 y npm 11.20.0: no actualizar sin acordarlo con el equipo.
- Imágenes de Docker con etiqueta fija, nunca latest.
- Antes de instalar algo, revisar si ya existe una dependencia que cubra la necesidad.
- Si cambia una variable de entorno, actualizar .env.example.