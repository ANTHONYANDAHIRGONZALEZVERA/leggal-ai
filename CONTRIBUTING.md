# Guía de contribución — Leggal AI

## 1. Idioma
- Todos los mensajes de commits deben estar redactados en español.
- Los comentarios del código deben estar en español.
- La documentación técnica debe estar en español.
- Los nombres de variables, funciones, clases y archivos seguirán las convenciones técnicas del lenguaje.

## 2. Convención de commits

Utilizamos Conventional Commits.

Formato obligatorio:

tipo(alcance): descripción en español

Tipos permitidos:

- feat: nueva funcionalidad.
- fix: corrección de errores.
- docs: cambios en documentación.
- style: cambios de formato o estilos sin alterar la lógica.
- refactor: mejora interna del código sin cambiar su comportamiento.
- test: agregar o modificar pruebas.
- chore: mantenimiento y configuración del proyecto.
- perf: mejoras de rendimiento.
- build: cambios en dependencias o sistema de construcción.
- ci: cambios en integración continua.

## 3. Reglas para escribir commits

- Escribir la descripción en español.
- Utilizar minúsculas.
- Empezar con un verbo en infinitivo.
- Ser claro y específico.
- No utilizar puntos al final.
- Evitar mensajes genéricos como "cambios", "arreglos" o "actualización".
- Un commit debe representar un cambio lógico y concreto.

## 4. Ejemplos correctos

feat(auth): implementar inicio de sesión

feat(usuarios): agregar registro de usuarios

fix(auth): corregir validación de contraseñas

docs(api): documentar endpoints de usuarios

test(usuarios): agregar pruebas de creación de usuarios

refactor(backend): separar lógica de autenticación

chore(github): configurar flujo de integración continua

## 5. Ejemplos incorrectos

 cambios varios
 arreglé un error
 update login
 modificaciones
 feat: changes

## 6. Pull Requests

- Utilizar títulos claros en español.
- Explicar qué se modificó.
- Indicar cómo probar los cambios.
- No combinar funcionalidades independientes en un mismo PR.
- Solicitar revisión antes de integrar cambios a main.