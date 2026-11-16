import { quitarAcentos } from '@/utils/texto';

import type { RespuestaTransporte, Transporte } from './cliente';
import { leerCarga, leerVencimiento } from './jwt';

// API simulada (F11): responde dentro de la app como lo hará el backend, para
// avanzar sin servidor. Se activa con EXPO_PUBLIC_API_MOCK=true o cuando no hay
// EXPO_PUBLIC_API_URL. Los datos viven en memoria y se pierden al recargar.

type UsuarioSimulado = { id: string; nombre: string; correo: string; contrasena: string; onboardingCompleto: boolean };
type Cuerpo = Record<string, string>;

/** Cuenta lista para probar sin registrarse (ya hizo el onboarding). */
export const USUARIO_DEMO = { nombre: 'Usuario Demo', correo: 'demo@leggal.ai', contrasena: 'Leggal2026!' } as const;

// Pausa que imita la red real, para ver los estados de carga. En Jest es 0.
const LATENCIA_MS = process.env.NODE_ENV === 'test' ? 0 : 600;

/** Vida del token de acceso simulado (el backend real define la suya). */
export const VIDA_TOKEN_MS = 15 * 60 * 1000;

let usuarios = new Map<string, UsuarioSimulado>();
/** Token de renovación vigente → correo de su dueño. */
let renovaciones = new Map<string, string>();
let contador = 0;

// @usuarios ya tomados por otras personas (además de los reservados del sistema).
const USUARIOS_TOMADOS = ['admin', 'soporte', 'leggal', 'accons', 'usuario.demo', 'andrea.ruiz'];
let usuariosTomados = new Set<string>();

/** Vuelve al estado inicial (solo el usuario demo). Lo usan las pruebas. */
export function reiniciarMock() {
  usuarios = new Map([[USUARIO_DEMO.correo, { id: 'usr-demo', ...USUARIO_DEMO, onboardingCompleto: true }]]);
  renovaciones = new Map();
  contador = 0;
  usuariosTomados = new Set(USUARIOS_TOMADOS);
}
reiniciarMock();

function responder(estado: number, cuerpo?: unknown): RespuestaTransporte {
  return {
    ok: estado >= 200 && estado < 300,
    status: estado,
    text: async () => (cuerpo === undefined ? '' : JSON.stringify(cuerpo)),
  };
}

// Token con forma de JWT (cabecera.carga.firma) y su "exp", para que la app
// pueda saber cuándo vence, igual que con el backend. La firma es de mentira.
function tokenDeAcceso(correo: string) {
  const base64url = (datos: object) =>
    btoa(JSON.stringify(datos)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const exp = Math.floor((Date.now() + VIDA_TOKEN_MS) / 1000);
  return `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ sub: correo, exp, n: contador })}.simulada`;
}

function emitirTokens(correo: string) {
  contador += 1;
  const tokens = { acceso: tokenDeAcceso(correo), renovacion: `mock-renovacion-${contador}` };
  renovaciones.set(tokens.renovacion, correo);
  return tokens;
}

function sesionDe({ id, nombre, correo, onboardingCompleto }: UsuarioSimulado) {
  return { usuario: { id, nombre, correo, onboardingCompleto }, tokens: emitirTokens(correo) };
}

/** Dueño del token de acceso, o null si falta, no es válido o ya venció. */
function duenoDelToken(cabeceras: Record<string, string>) {
  const token = cabeceras.Authorization?.replace(/^Bearer /, '') ?? '';
  const correo = leerCarga(token)?.sub;
  const vence = leerVencimiento(token);
  if (typeof correo !== 'string' || vence === null || vence < Date.now()) return null;
  return usuarios.get(correo) ?? null;
}

/** Hasta 3 @usuarios libres armados con el nombre: "Andrea Ruiz" → ab.andrearuiz, aruiz.legal… */
function sugerenciasPara(nombre: string) {
  const [n = 'usuario', ...resto] = quitarAcentos(nombre)
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const a = resto[resto.length - 1] ?? 'legal';
  const candidatos = [`${n}.${a}`, `${n[0]}b.${n}${a}`, `${n[0]}${a}.legal`, `${n}${a}`, `${n}.${a}.abogado`, `${n}.${a}1`];
  // No depende de lo que se está escribiendo: la lista queda quieta mientras se elige.
  return candidatos.filter((c) => !usuariosTomados.has(c)).slice(0, 3);
}

type Manejador = (cuerpo: Cuerpo) => RespuestaTransporte;
/** Las rutas privadas reciben además a la persona dueña del token. */
type ManejadorPrivado = (cuerpo: Cuerpo, persona: UsuarioSimulado) => RespuestaTransporte;

const rutasPrivadas: Record<string, ManejadorPrivado> = {
  'GET /usuarios/disponible': ({ usuario }, persona) =>
    responder(200, {
      usuario,
      disponible: !usuariosTomados.has(usuario),
      sugerencias: sugerenciasPara(persona.nombre),
    }),
};

const rutas: Record<string, Manejador> = {
  'POST /auth/login': ({ correo, contrasena }) => {
    const usuario = usuarios.get(correo);
    // Mismo error si el correo no existe o la contraseña falla: así no se
    // revela qué correos tienen cuenta.
    if (!usuario || usuario.contrasena !== contrasena) {
      return responder(401, { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Correo o contraseña incorrectos.' });
    }
    return responder(200, sesionDe(usuario));
  },

  'POST /auth/registro': ({ nombre, correo, contrasena }) => {
    if (usuarios.has(correo)) {
      return responder(409, {
        codigo: 'CORREO_EN_USO',
        mensaje: 'Ya existe una cuenta con este correo.',
        campos: { correo: 'Ya existe una cuenta con este correo' },
      });
    }
    // Una cuenta nueva empieza sin onboarding: la app la lleva al paso 1/5.
    const usuario = { id: `usr-${usuarios.size + 1}`, nombre, correo, contrasena, onboardingCompleto: false };
    usuarios.set(correo, usuario);
    return responder(201, sesionDe(usuario));
  },

  'POST /auth/renovar': ({ renovacion }) => {
    const correo = renovaciones.get(renovacion);
    if (!correo) return responder(401, { codigo: 'SESION_EXPIRADA', mensaje: 'La sesión expiró.' });
    // Cada token de renovación sirve una sola vez (rotación), como en el backend.
    renovaciones.delete(renovacion);
    return responder(200, emitirTokens(correo));
  },

  // Cerrar sesión: el token de renovación deja de servir aunque alguien lo copie.
  'POST /auth/salir': ({ renovacion }) => {
    renovaciones.delete(renovacion);
    return responder(204);
  },
};

export const transporteSimulado: Transporte = async (url, { method, headers, body }) => {
  await new Promise((resolver) => setTimeout(resolver, LATENCIA_MS));
  // Se quita el dominio (si lo hay); la consulta (?a=1) se suma al cuerpo.
  const [ruta, consulta = ''] = url.replace(/^https?:\/\/[^/]+/, '').split('?');
  const cuerpo: Cuerpo = { ...leerConsulta(consulta), ...(body ? (JSON.parse(body) as Cuerpo) : {}) };
  const clave = `${method} ${ruta}`;

  const privada = rutasPrivadas[clave];
  if (privada) {
    const persona = duenoDelToken(headers);
    if (!persona) return responder(401, { codigo: 'TOKEN_INVALIDO', mensaje: 'Inicia sesión de nuevo.' });
    return privada(cuerpo, persona);
  }

  const manejar = rutas[clave];
  if (!manejar) {
    return responder(404, { codigo: 'NO_ENCONTRADO', mensaje: `La API simulada no tiene ${clave}.` });
  }
  return manejar(cuerpo);
};

/** "usuario=ana.ruiz&x=1" → { usuario: 'ana.ruiz', x: '1' }. */
function leerConsulta(consulta: string): Cuerpo {
  return Object.fromEntries(
    consulta
      .split('&')
      .filter(Boolean)
      .map((par) => par.split('=').map((parte) => decodeURIComponent(parte.replace(/\+/g, ' ')))),
  );
}
