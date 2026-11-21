import { RUTAS_AUTH, type RespuestaSesionApi } from './contrato';
import { ErrorApi } from './errores';
import { vencePronto } from './jwt';

/** Tokens guardados en el teléfono: acceso (JWT de 15 min) y refresco (rota en cada uso). */
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
  /** Guarda lo que devuelve el refresh: tokens nuevos y el usuario al día. */
  guardarSesion: (sesion: RespuestaSesionApi) => void;
  /** Se llama cuando el servidor ya no acepta la sesión (ni renovándola). */
  alExpirarSesion: () => void;
  limiteMs: number;
};

export type Peticion = {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  cuerpo?: unknown;
  /** Rutas sin sesión (login, registro): no llevan token ni intentan renovarlo. */
  publica?: boolean;
  /**
   * Envía el token tal como está: sin renovarlo antes ni reintentar tras un
   * 401. Para cerrar sesión, donde renovar solo para luego revocar no sirve.
   */
  sinRenovar?: boolean;
};

export const RUTA_REFRESH = RUTAS_AUTH.refresh;

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

  /**
   * true si se obtuvo un token nuevo; false si el servidor rechazó la sesión.
   * Solo un 401 cuenta como rechazo (contrato B03): sin red, 5xx o 429 lanzan
   * el error y la sesión se conserva, porque no dicen nada sobre si sigue válida.
   */
  function renovar(): Promise<boolean> {
    const tokens = o.obtenerTokens();
    if (!tokens) return Promise.resolve(false);
    renovacionEnCurso ??= (async () => {
      try {
        const r = await enviar(RUTA_REFRESH, { metodo: 'POST', cuerpo: { tokenRefresco: tokens.renovacion } });
        if (r.estado === 401) return false;
        if (!r.ok) throw ErrorApi.desdeRespuesta(r.estado, r.datos);
        o.guardarSesion(r.datos as RespuestaSesionApi);
        return true;
      } finally {
        renovacionEnCurso = null;
      }
    })();
    return renovacionEnCurso;
  }

  /** Renueva el token o, si el servidor ya no acepta la sesión, la cierra. */
  async function renovarOExpirar(): Promise<string | undefined> {
    if (!(await renovar())) {
      o.alExpirarSesion();
      throw new ErrorApi('SESION_EXPIRADA', 401);
    }
    return o.obtenerTokens()?.acceso;
  }

  async function peticion<T>(ruta: string, opciones: Peticion = {}): Promise<T> {
    let token = opciones.publica ? undefined : o.obtenerTokens()?.acceso;
    // Si al token le queda menos de un minuto, se renueva antes de usarlo:
    // así la petición no falla a mitad de camino.
    if (token && !opciones.sinRenovar && vencePronto(token)) token = await renovarOExpirar();

    let resultado = await enviar(ruta, opciones, token);

    if (resultado.estado === 401 && token) {
      // La sesión fue cerrada (otro dispositivo, robo): renovar no sirve.
      if (codigoDe(resultado.datos) === 'SESION_REVOCADA') {
        o.alExpirarSesion();
      } else if (!opciones.sinRenovar) {
        // El token venció: se renueva una sola vez y se repite la petición.
        resultado = await enviar(ruta, opciones, await renovarOExpirar());
      }
    }

    if (!resultado.ok) throw ErrorApi.desdeRespuesta(resultado.estado, resultado.datos);
    return resultado.datos as T;
  }

  return { peticion };
}

function codigoDe(datos: unknown) {
  return typeof datos === 'object' && datos !== null && 'codigo' in datos ? datos.codigo : undefined;
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
