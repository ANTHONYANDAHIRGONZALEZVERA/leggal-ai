import { quitarAcentos } from '@/utils/texto';

import type { RespuestaTransporte, Transporte } from './cliente';
import { RUTAS_AUTH, type UsuarioApi } from './contrato';
import { leerCarga, leerVencimiento } from './jwt';

// API simulada (F11): responde dentro de la app como el backend según su
// contrato (B03, docs/api/auth.md), para avanzar sin servidor. Se activa con
// EXPO_PUBLIC_API_MOCK=true o cuando no hay EXPO_PUBLIC_API_URL. Los datos
// viven en memoria y se pierden al recargar.

type UsuarioSimulado = UsuarioApi & { contrasena: string };
type Cuerpo = Record<string, unknown>;

/** Cuenta lista para probar sin registrarse (ya hizo el onboarding). */
export const USUARIO_DEMO = { nombre: 'Usuario Demo', correo: 'demo@leggal.ai', contrasena: 'Leggal2026!' } as const;

/**
 * Cuenta para revisar el onboarding sin registrarse: cada vez que entra, lo
 * tiene pendiente. Se llama como en el diseño ("Andrea Ruiz") para ver el caso
 * de @usuario tomado.
 */
export const USUARIO_NUEVO = { nombre: 'Andrea Ruiz', correo: 'nuevo@leggal.ai', contrasena: 'Leggal2026!' } as const;

// Pausa que imita la red real, para ver los estados de carga. En Jest es 0.
const LATENCIA_MS = process.env.NODE_ENV === 'test' ? 0 : 600;

/** Vida del token de acceso: 15 minutos, como en el contrato. */
export const VIDA_TOKEN_MS = 15 * 60 * 1000;

let usuarios = new Map<string, UsuarioSimulado>();
/** Sesión (sid) → dueño y si ya se cerró. */
let sesiones = new Map<string, { usuarioId: string; revocada: boolean }>();
/** Token de refresco → su sesión y si ya se usó (rota en cada uso). */
let refrescos = new Map<string, { sid: string; usado: boolean }>();
let contador = 0;
/**
 * Marca de esta ejecución del mock. Va dentro de cada token de refresco para
 * reconocer los de una ejecución anterior (ver recordarRefresco).
 */
let arranque = '';
let reinicios = 0;

// @usuarios ya tomados por otras personas (además de los reservados del sistema).
const USUARIOS_TOMADOS = ['admin', 'soporte', 'leggal', 'accons', 'usuario.demo', 'andrea.ruiz'];
let usuariosTomados = new Set<string>();

function cuentaDePrueba(
  id: string,
  { nombre, correo, contrasena }: typeof USUARIO_DEMO | typeof USUARIO_NUEVO,
  onboardingCompleto: boolean,
): UsuarioSimulado {
  return {
    id,
    nombre,
    nombreVisible: onboardingCompleto ? nombre : null,
    nombreUsuario: onboardingCompleto ? 'usuario.demo' : null,
    correo,
    correoVerificado: true,
    onboardingCompleto,
    creadoEn: '2026-11-11T00:00:00.000Z',
    contrasena,
  };
}

/** Vuelve al estado inicial (solo las cuentas de prueba). Lo usan las pruebas. */
export function reiniciarMock() {
  usuarios = new Map([
    [USUARIO_DEMO.correo, cuentaDePrueba('usr-demo', USUARIO_DEMO, true)],
    [USUARIO_NUEVO.correo, cuentaDePrueba('usr-nuevo', USUARIO_NUEVO, false)],
  ]);
  sesiones = new Map();
  refrescos = new Map();
  contador = 0;
  reinicios += 1;
  arranque = `${Date.now().toString(36)}${reinicios}`;
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

/** Error con el formato estándar del contrato: { codigo, mensaje, campos }. */
function fallar(estado: number, codigo: string, mensaje: string, campos: Record<string, string> | null = null) {
  return responder(estado, { codigo, mensaje, campos });
}

const noAutenticado = () => fallar(401, 'NO_AUTENTICADO', 'Inicia sesión para continuar.');
const sesionRevocada = () =>
  fallar(401, 'SESION_REVOCADA', 'Tu sesión se cerró por seguridad. Vuelve a iniciar sesión.');
const refrescoInvalido = () => fallar(401, 'REFRESCO_INVALIDO', 'Tu sesión expiró. Vuelve a iniciar sesión.');

const texto = (valor: unknown) => (typeof valor === 'string' ? valor : '');

// Token con forma de JWT (cabecera.carga.firma) y la carga del contrato: sub,
// tid, sid, iat y exp. La firma es de mentira.
function tokenDeAcceso(usuarioId: string, sid: string) {
  const base64url = (datos: object) =>
    btoa(JSON.stringify(datos)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const iat = Math.floor(Date.now() / 1000);
  const carga = { sub: usuarioId, tid: null, sid, iat, exp: iat + VIDA_TOKEN_MS / 1000, n: contador };
  return `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url(carga)}.simulada`;
}

/** El usuario como sale del servidor: sin contraseña. */
function publico({ contrasena: _contrasena, ...usuario }: UsuarioSimulado): UsuarioApi {
  return usuario;
}

/** Respuesta de sesión del contrato, con un refresco nuevo para esa sesión. */
function respuestaSesion(usuario: UsuarioSimulado, sid: string) {
  contador += 1;
  const tokenRefresco = `mock-refresco.${arranque}.${usuario.id}.${contador}`;
  refrescos.set(tokenRefresco, { sid, usado: false });
  return {
    tokenAcceso: tokenDeAcceso(usuario.id, sid),
    tokenRefresco,
    venceEn: VIDA_TOKEN_MS / 1000,
    usuario: publico(usuario),
  };
}

function abrirSesion(usuario: UsuarioSimulado) {
  const sid = `ses-${sesiones.size + 1}`;
  sesiones.set(sid, { usuarioId: usuario.id, revocada: false });
  return respuestaSesion(usuario, sid);
}

const usuarioPorId = (id: string) => [...usuarios.values()].find((u) => u.id === id);

/**
 * El mock guarda las sesiones en memoria y las olvida al recargar la app; el
 * backend real las guarda en su base. Para no sacar a la persona en cada
 * recarga, un refresco de una ejecución anterior se acepta si su dueño todavía
 * existe (las cuentas creadas con el registro también se olvidan al recargar).
 */
function recordarRefresco(token: string) {
  const [prefijo, deArranque, usuarioId] = token.split('.');
  const usuario = usuarioPorId(usuarioId ?? '');
  if (prefijo !== 'mock-refresco' || deArranque === arranque || !usuario || refrescos.has(token)) return;
  const sid = `ses-${sesiones.size + 1}`;
  sesiones.set(sid, { usuarioId: usuario.id, revocada: false });
  refrescos.set(token, { sid, usado: false });
}

/** Dueño y sesión del token de acceso, si tiene la forma del contrato y no venció. */
function leerToken(cabeceras: Record<string, string>) {
  const token = cabeceras.Authorization?.replace(/^Bearer /, '') ?? '';
  const carga = leerCarga(token);
  const vence = leerVencimiento(token);
  if (typeof carga?.sub !== 'string' || typeof carga.sid !== 'string' || vence === null || vence < Date.now()) {
    return null;
  }
  return { usuarioId: carga.sub, sid: carga.sid };
}

/**
 * Hasta 3 @usuarios libres, distintos entre sí, armados con el nombre que la
 * persona escribe: "Andrea Ruiz" → aruiz.legal, andrearuiz, ruiz.andrea…
 * Siempre cumplen las reglas del @usuario (empiezan con letra, máximo 30).
 */
function sugerenciasPara(nombre: string) {
  const palabras = quitarAcentos(nombre)
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (palabras.length === 0) return [];
  const n = palabras[0];
  const a = palabras.length > 1 ? palabras[palabras.length - 1] : '';
  const candidatos = a
    ? [`${n}.${a}`, `${n[0]}${a}.legal`, `${n}${a}`, `${a}.${n}`, `${n}.${a[0]}`, `${n}_${a}`, `${n}.${a}.legal`]
    : [n, `${n}.legal`, `${n}.abogado`, `${n}_legal`, `${n}.juridico`];
  // Set: sin repetidos. Tomados: fuera. Así ninguna sugerencia falla al elegirla.
  return [...new Set(candidatos.map((c) => c.slice(0, 30)))]
    .filter((c) => c.length >= 3 && !usuariosTomados.has(c))
    .slice(0, 3);
}

type Manejador = (cuerpo: Cuerpo, cabeceras: Record<string, string>) => RespuestaTransporte;
/** Las rutas privadas reciben además a la persona dueña del token. */
type ManejadorPrivado = (cuerpo: Cuerpo, persona: UsuarioSimulado) => RespuestaTransporte;

const rutasPrivadas: Record<string, ManejadorPrivado> = {
  [`GET ${RUTAS_AUTH.yo}`]: (_cuerpo, persona) =>
    responder(200, { usuario: publico(persona), empresaActivaId: null, empresas: [] }),
  'GET /usuarios/disponible': ({ usuario }) =>
    responder(200, { usuario, disponible: !usuariosTomados.has(texto(usuario)) }),
  'GET /usuarios/sugerencias': ({ nombre }) => responder(200, { sugerencias: sugerenciasPara(texto(nombre)) }),
};

const rutas: Record<string, Manejador> = {
  [`POST ${RUTAS_AUTH.login}`]: ({ correo, contrasena }) => {
    const usuario = usuarios.get(texto(correo));
    // Mismo error si el correo no existe o la contraseña falla: así no se
    // revela qué correos tienen cuenta.
    if (!usuario || usuario.contrasena !== contrasena) {
      return fallar(401, 'CREDENCIALES_INVALIDAS', 'El correo o la contraseña no son correctos.');
    }
    return responder(200, abrirSesion(usuario));
  },

  [`POST ${RUTAS_AUTH.registro}`]: ({ nombre, correo, contrasena, aceptaTerminos }) => {
    if (aceptaTerminos !== true) {
      return fallar(400, 'VALIDACION', 'Revisa los datos marcados.', {
        aceptaTerminos: 'Debes aceptar los Términos y la Política para continuar',
      });
    }
    if (usuarios.has(texto(correo))) {
      return fallar(409, 'CORREO_EN_USO', 'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.');
    }
    // Una cuenta nueva empieza sin verificar ni onboarding: la app la lleva al paso 1/5.
    const usuario: UsuarioSimulado = {
      id: `usr-${usuarios.size + 1}`,
      nombre: texto(nombre),
      nombreVisible: null,
      nombreUsuario: null,
      correo: texto(correo),
      correoVerificado: false,
      onboardingCompleto: false,
      creadoEn: new Date().toISOString(),
      contrasena: texto(contrasena),
    };
    usuarios.set(usuario.correo, usuario);
    return responder(201, abrirSesion(usuario));
  },

  [`POST ${RUTAS_AUTH.refresh}`]: ({ tokenRefresco }) => {
    recordarRefresco(texto(tokenRefresco));
    const refresco = refrescos.get(texto(tokenRefresco));
    const sesion = refresco && sesiones.get(refresco.sid);
    const usuario = sesion && usuarioPorId(sesion.usuarioId);
    if (!refresco || !sesion || !usuario) return refrescoInvalido();
    // Reusar un refresco ya usado es señal de robo: se cierran todas las
    // sesiones de esa persona, como en el backend.
    if (refresco.usado) {
      for (const otra of sesiones.values()) if (otra.usuarioId === sesion.usuarioId) otra.revocada = true;
      return sesionRevocada();
    }
    if (sesion.revocada) return sesionRevocada();
    refresco.usado = true;
    return responder(200, respuestaSesion(usuario, refresco.sid));
  },

  // Revoca solo la sesión del token; las demás siguen abiertas. Es idempotente.
  [`POST ${RUTAS_AUTH.logout}`]: (_cuerpo, cabeceras) => {
    const token = leerToken(cabeceras);
    if (!token) return noAutenticado();
    const sesion = sesiones.get(token.sid);
    if (sesion) sesion.revocada = true;
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
    const token = leerToken(headers);
    if (!token) return noAutenticado();
    if (sesiones.get(token.sid)?.revocada) return sesionRevocada();
    const persona = usuarioPorId(token.usuarioId);
    return persona ? privada(cuerpo, persona) : noAutenticado();
  }

  const manejar = rutas[clave];
  if (!manejar) return fallar(404, 'NO_ENCONTRADO', `La API simulada no tiene ${clave}.`);
  return manejar(cuerpo, headers);
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
