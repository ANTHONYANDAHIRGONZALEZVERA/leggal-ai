import { crearClienteApi, RUTA_RENOVAR, type RespuestaTransporte, type Tokens, type Transporte } from '../cliente';
import { ErrorApi } from '../errores';

// Cliente de la API (F09). Se prueba con un transporte falso que registra cada
// petición y responde lo que la prueba indique, sin red de verdad.

const URL_BASE = 'https://api.prueba';

function respuesta(estado: number, cuerpo?: unknown): RespuestaTransporte {
  return {
    ok: estado >= 200 && estado < 300,
    status: estado,
    text: async () => (cuerpo === undefined ? '' : JSON.stringify(cuerpo)),
  };
}

/** Arma un cliente con sesión opcional y un transporte que responde por ruta. */
function armar({ tokens = null as Tokens | null, responder = (_ruta: string): RespuestaTransporte | Promise<RespuestaTransporte> => respuesta(200, {}), limiteMs = 1000 } = {}) {
  let sesion = tokens;
  const transporte = jest.fn<ReturnType<Transporte>, Parameters<Transporte>>(async (url) =>
    responder(url.replace(URL_BASE, '')),
  );
  const alExpirarSesion = jest.fn();
  const cliente = crearClienteApi({
    urlBase: URL_BASE,
    transporte,
    cabeceras: { 'X-Dispositivo': 'android/1.0.0' },
    obtenerTokens: () => sesion,
    guardarTokens: (nuevos) => {
      sesion = nuevos;
    },
    alExpirarSesion,
    limiteMs,
  });
  return { cliente, transporte, alExpirarSesion, sesion: () => sesion };
}

const TOKENS = { acceso: 'acceso-viejo', renovacion: 'renovacion-1' };
const TOKENS_NUEVOS = { acceso: 'acceso-nuevo', renovacion: 'renovacion-2' };

describe('crearClienteApi: petición', () => {
  test('arma la URL, envía el cuerpo en JSON y las cabeceras fijas', async () => {
    const { cliente, transporte } = armar();

    await cliente.peticion('/auth/login', { metodo: 'POST', cuerpo: { correo: 'ana@empresa.com' }, publica: true });

    expect(transporte).toHaveBeenCalledWith(
      'https://api.prueba/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: '{"correo":"ana@empresa.com"}',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Dispositivo': 'android/1.0.0',
        },
      }),
    );
  });

  test('agrega el token a las rutas privadas y no a las públicas', async () => {
    const { cliente, transporte } = armar({ tokens: TOKENS });

    await cliente.peticion('/casos');
    await cliente.peticion('/auth/login', { metodo: 'POST', cuerpo: {}, publica: true });

    expect(transporte.mock.calls[0][1].headers.Authorization).toBe('Bearer acceso-viejo');
    expect(transporte.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  test('un GET no lleva cuerpo ni Content-Type', async () => {
    const { cliente, transporte } = armar();

    await cliente.peticion('/casos');

    const init = transporte.mock.calls[0][1];
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  test('devuelve los datos de una respuesta correcta', async () => {
    const { cliente } = armar({ responder: () => respuesta(200, { id: 'c1', titulo: 'Caso' }) });

    await expect(cliente.peticion('/casos/c1')).resolves.toEqual({ id: 'c1', titulo: 'Caso' });
  });

  test('una respuesta vacía (204) devuelve undefined sin romperse', async () => {
    const { cliente } = armar({ responder: () => respuesta(204) });

    await expect(cliente.peticion('/casos/c1', { metodo: 'DELETE' })).resolves.toBeUndefined();
  });
});

describe('crearClienteApi: errores', () => {
  test('convierte el error del servidor en ErrorApi con código, campos y mensaje en español', async () => {
    const { cliente } = armar({
      responder: () =>
        respuesta(409, { codigo: 'CORREO_EN_USO', mensaje: 'Email taken', campos: { correo: 'Ya existe' } }),
    });

    const peticion = cliente.peticion('/auth/registro', { metodo: 'POST', publica: true });

    await expect(peticion).rejects.toBeInstanceOf(ErrorApi);
    await expect(peticion).rejects.toMatchObject({
      codigo: 'CORREO_EN_USO',
      estado: 409,
      campos: { correo: 'Ya existe' },
      // El texto sale de la app, no del servidor (que podría venir en inglés).
      message: 'Ya existe una cuenta con este correo.',
    });
  });

  test('un código desconocido usa el mensaje del servidor', async () => {
    const { cliente } = armar({ responder: () => respuesta(422, { codigo: 'CASO_CERRADO', mensaje: 'El caso está cerrado.' }) });

    await expect(cliente.peticion('/casos/c1')).rejects.toMatchObject({ message: 'El caso está cerrado.' });
  });

  test('un 500 sin cuerpo se reporta como problema del servidor', async () => {
    const { cliente } = armar({ responder: () => respuesta(500) });

    await expect(cliente.peticion('/casos')).rejects.toMatchObject({
      codigo: 'ERROR_SERVIDOR',
      message: 'El servidor tuvo un problema. Inténtalo en unos minutos.',
    });
  });

  test('sin red se reporta "Sin conexión"', async () => {
    const { cliente } = armar({
      responder: () => {
        throw new TypeError('Network request failed');
      },
    });

    await expect(cliente.peticion('/casos')).rejects.toMatchObject({ codigo: 'SIN_CONEXION', estado: 0 });
  });

  test('si el servidor no responde a tiempo, corta la espera y lo avisa', async () => {
    // El transporte solo termina cuando el cliente cancela la petición.
    const { cliente, transporte } = armar({ limiteMs: 20 });
    transporte.mockImplementation(
      (_url, init) =>
        new Promise((_resolver, rechazar) => init.signal?.addEventListener('abort', () => rechazar(new Error('abortada')))),
    );

    await expect(cliente.peticion('/casos')).rejects.toMatchObject({ codigo: 'TIEMPO_AGOTADO' });
  });
});

describe('crearClienteApi: renovación del token', () => {
  /** Servidor falso: rechaza el token viejo y acepta el nuevo. */
  function servidorConTokenVencido(renovacionAceptada = true) {
    return (ruta: string) => {
      if (ruta === RUTA_RENOVAR) return renovacionAceptada ? respuesta(200, TOKENS_NUEVOS) : respuesta(401, { codigo: 'SESION_EXPIRADA' });
      return respuesta(401, { codigo: 'TOKEN_VENCIDO' });
    };
  }

  test('con el token vencido lo renueva una vez, lo guarda y repite la petición', async () => {
    const { cliente, transporte, sesion } = armar({ tokens: TOKENS });
    transporte.mockImplementation(async (url, init) => {
      const ruta = url.replace(URL_BASE, '');
      if (ruta === RUTA_RENOVAR) return respuesta(200, TOKENS_NUEVOS);
      return init.headers.Authorization === 'Bearer acceso-nuevo' ? respuesta(200, ['caso']) : respuesta(401);
    });

    await expect(cliente.peticion('/casos')).resolves.toEqual(['caso']);

    const rutas = transporte.mock.calls.map(([url]) => url.replace(URL_BASE, ''));
    expect(rutas).toEqual(['/casos', RUTA_RENOVAR, '/casos']);
    // La renovación envía el token de renovación, sin el de acceso vencido.
    expect(JSON.parse(transporte.mock.calls[1][1].body ?? '')).toEqual({ renovacion: 'renovacion-1' });
    expect(transporte.mock.calls[1][1].headers.Authorization).toBeUndefined();
    expect(sesion()).toEqual(TOKENS_NUEVOS);
  });

  test('varias peticiones vencidas a la vez comparten una sola renovación', async () => {
    const { cliente, transporte } = armar({ tokens: TOKENS });
    transporte.mockImplementation(async (url, init) => {
      if (url.endsWith(RUTA_RENOVAR)) return respuesta(200, TOKENS_NUEVOS);
      return init.headers.Authorization === 'Bearer acceso-nuevo' ? respuesta(200, 'ok') : respuesta(401);
    });

    await Promise.all([cliente.peticion('/casos'), cliente.peticion('/agenda'), cliente.peticion('/docs')]);

    const renovaciones = transporte.mock.calls.filter(([url]) => url.endsWith(RUTA_RENOVAR));
    expect(renovaciones).toHaveLength(1);
  });

  test('si el servidor rechaza la renovación, cierra la sesión y avisa que expiró', async () => {
    const { cliente, transporte, alExpirarSesion } = armar({ tokens: TOKENS, responder: servidorConTokenVencido(false) });

    await expect(cliente.peticion('/casos')).rejects.toMatchObject({ codigo: 'SESION_EXPIRADA' });

    expect(alExpirarSesion).toHaveBeenCalledTimes(1);
    // No repite la petición original después de fallar la renovación.
    expect(transporte).toHaveBeenCalledTimes(2);
  });

  test('si la petición repetida vuelve a dar 401, no entra en un bucle', async () => {
    const { cliente, transporte } = armar({
      tokens: TOKENS,
      responder: (ruta) => (ruta === RUTA_RENOVAR ? respuesta(200, TOKENS_NUEVOS) : respuesta(401, { codigo: 'SIN_PERMISO' })),
    });

    await expect(cliente.peticion('/casos')).rejects.toMatchObject({ estado: 401 });

    expect(transporte).toHaveBeenCalledTimes(3);
  });

  test('sin red durante la renovación no cierra la sesión', async () => {
    // Un corte de red no significa que la sesión sea inválida.
    const { cliente, transporte, alExpirarSesion } = armar({ tokens: TOKENS });
    transporte.mockImplementation(async (url) => {
      if (url.endsWith(RUTA_RENOVAR)) throw new TypeError('Network request failed');
      return respuesta(401);
    });

    await expect(cliente.peticion('/casos')).rejects.toMatchObject({ codigo: 'SIN_CONEXION' });
    expect(alExpirarSesion).not.toHaveBeenCalled();
  });

  test('un 401 en una ruta pública (login) no intenta renovar', async () => {
    const { cliente, transporte } = armar({
      tokens: TOKENS,
      responder: () => respuesta(401, { codigo: 'CREDENCIALES_INVALIDAS' }),
    });

    await expect(
      cliente.peticion('/auth/login', { metodo: 'POST', cuerpo: {}, publica: true }),
    ).rejects.toMatchObject({ codigo: 'CREDENCIALES_INVALIDAS', message: 'Correo o contraseña incorrectos.' });
    expect(transporte).toHaveBeenCalledTimes(1);
  });
});

describe('crearClienteApi: renovación antes de vencer (F10)', () => {
  /** JWT de prueba que vence dentro de `ms` milisegundos. */
  function tokenQueVenceEn(ms: number) {
    const parte = (datos: object) => btoa(JSON.stringify(datos)).replace(/=+$/, '');
    return `${parte({ alg: 'HS256' })}.${parte({ exp: Math.floor((Date.now() + ms) / 1000) })}.firma`;
  }

  test('si al token le queda menos de un minuto, lo renueva antes de la petición', async () => {
    const { cliente, transporte } = armar({
      tokens: { acceso: tokenQueVenceEn(30_000), renovacion: 'renovacion-1' },
      responder: (ruta) => (ruta === RUTA_RENOVAR ? respuesta(200, TOKENS_NUEVOS) : respuesta(200, ['caso'])),
    });

    await expect(cliente.peticion('/casos')).resolves.toEqual(['caso']);

    const llamadas = transporte.mock.calls.map(([url, init]) => [url.replace(URL_BASE, ''), init.headers.Authorization]);
    // Primero renueva y luego pide los casos ya con el token nuevo: sin un 401 de por medio.
    expect(llamadas).toEqual([
      [RUTA_RENOVAR, undefined],
      ['/casos', 'Bearer acceso-nuevo'],
    ]);
  });

  test('si al token le queda tiempo de sobra, no renueva', async () => {
    const { cliente, transporte } = armar({
      tokens: { acceso: tokenQueVenceEn(10 * 60_000), renovacion: 'renovacion-1' },
    });

    await cliente.peticion('/casos');

    expect(transporte).toHaveBeenCalledTimes(1);
  });

  test('si la renovación anticipada es rechazada, cierra la sesión sin hacer la petición', async () => {
    const { cliente, transporte, alExpirarSesion } = armar({
      tokens: { acceso: tokenQueVenceEn(-5000), renovacion: 'renovacion-1' },
      responder: () => respuesta(401, { codigo: 'SESION_EXPIRADA' }),
    });

    await expect(cliente.peticion('/casos')).rejects.toMatchObject({ codigo: 'SESION_EXPIRADA' });

    expect(alExpirarSesion).toHaveBeenCalledTimes(1);
    expect(transporte.mock.calls.map(([url]) => url.replace(URL_BASE, ''))).toEqual([RUTA_RENOVAR]);
  });
});
