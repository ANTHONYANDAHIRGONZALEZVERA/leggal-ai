import type { RespuestaTransporte, Transporte } from './cliente';

// API simulada (F11): responde dentro de la app como lo hará el backend, para
// avanzar sin servidor. Se activa con EXPO_PUBLIC_API_MOCK=true o cuando no hay
// EXPO_PUBLIC_API_URL. Los datos viven en memoria y se pierden al recargar.

type UsuarioSimulado = { id: string; nombre: string; correo: string; contrasena: string };
type Cuerpo = Record<string, string>;

/** Cuenta lista para probar sin registrarse. */
export const USUARIO_DEMO = { nombre: 'Usuario Demo', correo: 'demo@leggal.ai', contrasena: 'Leggal2026!' } as const;

// Pausa que imita la red real, para ver los estados de carga. En Jest es 0.
const LATENCIA_MS = process.env.NODE_ENV === 'test' ? 0 : 600;

let usuarios = new Map<string, UsuarioSimulado>();
/** Token de renovación vigente → correo de su dueño. */
let renovaciones = new Map<string, string>();
let contador = 0;

/** Vuelve al estado inicial (solo el usuario demo). Lo usan las pruebas. */
export function reiniciarMock() {
  usuarios = new Map([[USUARIO_DEMO.correo, { id: 'usr-demo', ...USUARIO_DEMO }]]);
  renovaciones = new Map();
  contador = 0;
}
reiniciarMock();

function responder(estado: number, cuerpo?: unknown): RespuestaTransporte {
  return {
    ok: estado >= 200 && estado < 300,
    status: estado,
    text: async () => (cuerpo === undefined ? '' : JSON.stringify(cuerpo)),
  };
}

function emitirTokens(correo: string) {
  contador += 1;
  const tokens = { acceso: `mock-acceso-${contador}`, renovacion: `mock-renovacion-${contador}` };
  renovaciones.set(tokens.renovacion, correo);
  return tokens;
}

function sesionDe({ id, nombre, correo }: UsuarioSimulado) {
  return { usuario: { id, nombre, correo }, tokens: emitirTokens(correo) };
}

const rutas: Record<string, (cuerpo: Cuerpo) => RespuestaTransporte> = {
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
    const usuario = { id: `usr-${usuarios.size + 1}`, nombre, correo, contrasena };
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
};

export const transporteSimulado: Transporte = async (url, { method, body }) => {
  await new Promise((resolver) => setTimeout(resolver, LATENCIA_MS));
  // Solo importa la ruta: se quita el dominio (si lo hay) y la consulta.
  const ruta = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  const manejar = rutas[`${method} ${ruta}`];
  if (!manejar) {
    return responder(404, { codigo: 'NO_ENCONTRADO', mensaje: `La API simulada no tiene ${method} ${ruta}.` });
  }
  return manejar(body ? (JSON.parse(body) as Cuerpo) : {});
};
