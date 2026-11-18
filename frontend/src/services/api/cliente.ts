import { ErrorApi } from './errores';

export type Tokens = { acceso: string; renovacion: string };

/** Lo mínimo que el cliente usa de una respuesta (lo cumplen fetch y el mock). */
export type RespuestaTransporte = { ok: boolean; status: number; text: () => Promise<string> };

/** Función que hace la petición: fetch de Expo en la app, el mock o un doble en pruebas. */
export type Transporte = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal },
) => Promise<RespuestaTransporte>;

type OpcionesCliente = {
  urlBase: string;
  transporte: Transporte;
  /** Cabeceras que van en todas las peticiones (por ejemplo, el dispositivo). */
  cabeceras?: Record<string, string>;
  obtenerTokens: () => Tokens | null;
  guardarTokens: (tokens: Tokens) => void;
  /** Se llama cuando el servidor ya no acepta la sesión (ni renovándola). */
  alExpirarSesion: () => void;
  limiteMs: number;
};

export type Peticion = {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  cuerpo?: unknown;
  /** Rutas sin sesión (login, registro): no llevan token ni intentan renovarlo. */
  publica?: boolean;
};

export const RUTA_RENOVAR = '/auth/renovar';

type Resultado = { ok: boolean; estado: number; datos: unknown };

// Cliente único de la API: todas las peticiones pasan por aquí, así el token,
// los errores y la renovación de la sesión se resuelven en un solo lugar.
export function crearClienteApi(o: OpcionesCliente) {
  // Si varias peticiones encuentran el token vencido a la vez, comparten una
  // sola renovación en vez de pedir varios tokens nuevos.
  let renovacionEnCurso: Promise<boolean> | null = null;

  async function enviar(ruta: string, { metodo = 'GET', cuerpo }: Peticion, token?: string): Promise<Resultado> {
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), o.limiteMs);
    try {
      const respuesta = await o.transporte(o.urlBase + ruta, {
        method: metodo,
        headers: {
          Accept: 'application/json',
          ...(cuerpo !== undefined && { 'Content-Type': 'application/json' }),
          ...o.cabeceras,
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        signal: control.signal,
      });
      return { ok: respuesta.ok, estado: respuesta.status, datos: await leerJson(respuesta) };
    } catch {
      // No hubo respuesta: o se agotó el tiempo, o no hay red.
      throw new ErrorApi(control.signal.aborted ? 'TIEMPO_AGOTADO' : 'SIN_CONEXION', 0);
    } finally {
      clearTimeout(reloj);
    }
  }

  /** true si se obtuvo un token nuevo; false si el servidor rechazó la renovación. */
  function renovar(): Promise<boolean> {
    const tokens = o.obtenerTokens();
    if (!tokens) return Promise.resolve(false);
    renovacionEnCurso ??= (async () => {
      try {
        const r = await enviar(RUTA_RENOVAR, { metodo: 'POST', cuerpo: { renovacion: tokens.renovacion } });
        if (!r.ok) return false;
        o.guardarTokens(r.datos as Tokens);
        return true;
      } finally {
        renovacionEnCurso = null;
      }
    })();
    return renovacionEnCurso;
  }

  async function peticion<T>(ruta: string, opciones: Peticion = {}): Promise<T> {
    const token = opciones.publica ? undefined : o.obtenerTokens()?.acceso;
    let resultado = await enviar(ruta, opciones, token);

    // Token vencido: se renueva una sola vez y se repite la petición.
    if (resultado.estado === 401 && token) {
      if (!(await renovar())) {
        o.alExpirarSesion();
        throw new ErrorApi('SESION_EXPIRADA', 401);
      }
      resultado = await enviar(ruta, opciones, o.obtenerTokens()?.acceso);
    }

    if (!resultado.ok) throw ErrorApi.desdeRespuesta(resultado.estado, resultado.datos);
    return resultado.datos as T;
  }

  return { peticion };
}

// Respuestas vacías (204) o que no son JSON no rompen la petición.
async function leerJson(respuesta: RespuestaTransporte): Promise<unknown> {
  const texto = await respuesta.text();
  if (!texto) return undefined;
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}
