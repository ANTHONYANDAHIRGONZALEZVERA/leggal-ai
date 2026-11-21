import { leerCarga } from '../jwt';
import { reiniciarMock, transporteSimulado, USUARIO_NUEVO } from '../mock';
import { CODIGOS_DE_PRUEBA, decidirSolicitud, INTENTOS_POR_HORA, RUC_TOMADO } from '../mock-empresas';

// API simulada de empresas, códigos y solicitudes (B35 y B39), según la
// propuesta de docs/api/empresas-borrador-frontend.md.

type Respuesta = { estado: number; datos: any };

async function pedir(metodo: string, ruta: string, cuerpo?: object, token?: string): Promise<Respuesta> {
  const r = await transporteSimulado(`https://cualquier.dominio${ruta}`, {
    method: metodo,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  return { estado: r.status, datos: texto ? JSON.parse(texto) : undefined };
}

let token: string;
beforeEach(async () => {
  reiniciarMock();
  const { datos } = await pedir('POST', '/auth/login', { correo: USUARIO_NUEVO.correo, contrasena: USUARIO_NUEVO.contrasena });
  token = datos.tokenAcceso;
});

const vistaPrevia = (codigo: string) => pedir('POST', '/invitations/preview', { codigo }, token);
const canjear = (codigo: string) => pedir('POST', '/invitations/redeem', { codigo }, token);
const EMPRESA = { tipo: 'empresa', razonSocial: 'Mi Estudio', ruc: '1790099999001', tamanoEquipo: '1-5' };

describe('API simulada: vista previa del código', () => {
  test('devuelve empresa, rol y si requiere aprobación, sin canjearlo', async () => {
    const r = await vistaPrevia(CODIGOS_DE_PRUEBA.accons);

    expect(r).toEqual({
      estado: 200,
      datos: {
        empresa: { id: 'emp-accons', nombre: 'ACCONS S.A.S.', verificada: true },
        rol: { codigo: 'abogado', nombre: 'Abogado/a' },
        requiereAprobacion: true,
      },
    });
    expect((await pedir('GET', '/join-requests/me', undefined, token)).datos.solicitudes).toEqual([]);
  });

  test('acepta el código en minúsculas o sin guion', async () => {
    expect((await vistaPrevia('acc7k2')).estado).toBe(200);
  });

  test('un código que no existe responde 404 CODIGO_INVALIDO', async () => {
    expect(await vistaPrevia('ZZZ-999')).toMatchObject({ estado: 404, datos: { codigo: 'CODIGO_INVALIDO' } });
  });

  test('un código vencido responde 410 CODIGO_VENCIDO', async () => {
    expect(await vistaPrevia(CODIGOS_DE_PRUEBA.vencido)).toMatchObject({ estado: 410, datos: { codigo: 'CODIGO_VENCIDO' } });
  });

  test(`después de ${INTENTOS_POR_HORA} intentos en la hora responde 429 DEMASIADOS_INTENTOS`, async () => {
    for (let i = 0; i < INTENTOS_POR_HORA; i++) await vistaPrevia('ZZZ-999');

    expect(await vistaPrevia(CODIGOS_DE_PRUEBA.accons)).toMatchObject({ estado: 429, datos: { codigo: 'DEMASIADOS_INTENTOS' } });
  });

  test('sin sesión responde 401', async () => {
    expect((await pedir('POST', '/invitations/preview', { codigo: CODIGOS_DE_PRUEBA.accons })).estado).toBe(401);
  });
});

describe('API simulada: solicitudes de acceso', () => {
  test('canjear crea una solicitud en espera con el código con guion', async () => {
    const r = await canjear('acc7k2');

    expect(r.estado).toBe(201);
    expect(r.datos.solicitud).toMatchObject({
      estado: 'en_espera',
      empresa: { nombre: 'ACCONS S.A.S.' },
      rol: { nombre: 'Abogado/a' },
      codigo: 'ACC-7K2',
    });
    expect(r.datos.solicitud).not.toHaveProperty('usuarioId');
  });

  test('no deja dos solicitudes pendientes a la misma empresa (409 SOLICITUD_EXISTENTE)', async () => {
    await canjear(CODIGOS_DE_PRUEBA.accons);

    expect(await canjear(CODIGOS_DE_PRUEBA.accons)).toMatchObject({ estado: 409, datos: { codigo: 'SOLICITUD_EXISTENTE' } });
  });

  test('GET /join-requests/me devuelve las solicitudes de la persona, al día', async () => {
    const { datos } = await canjear(CODIGOS_DE_PRUEBA.accons);
    decidirSolicitud(datos.solicitud.id, 'aprobada');

    const r = await pedir('GET', '/join-requests/me', undefined, token);

    expect(r.datos.solicitudes).toEqual([expect.objectContaining({ id: datos.solicitud.id, estado: 'aprobada' })]);
  });

  test('cancelar la deja cancelada y es idempotente; una que no existe responde 404', async () => {
    const { datos } = await canjear(CODIGOS_DE_PRUEBA.accons);
    const ruta = `/join-requests/me/${datos.solicitud.id}`;

    expect((await pedir('DELETE', ruta, undefined, token)).estado).toBe(204);
    expect((await pedir('DELETE', ruta, undefined, token)).estado).toBe(204);
    expect((await pedir('GET', '/join-requests/me', undefined, token)).datos.solicitudes[0].estado).toBe('cancelada');
    expect((await pedir('DELETE', '/join-requests/me/sol-99', undefined, token)).estado).toBe(404);
  });

  test('después de cancelar se puede volver a pedir', async () => {
    const { datos } = await canjear(CODIGOS_DE_PRUEBA.accons);
    await pedir('DELETE', `/join-requests/me/${datos.solicitud.id}`, undefined, token);

    expect((await canjear(CODIGOS_DE_PRUEBA.accons)).estado).toBe(201);
  });
});

describe('API simulada: crear empresa', () => {
  test('crea la empresa y devuelve una sesión cuyo token ya trae su tid', async () => {
    const r = await pedir('POST', '/tenants', EMPRESA, token);

    expect(r.estado).toBe(201);
    expect(r.datos.empresa).toMatchObject({ nombre: 'Mi Estudio', tipo: 'empresa' });
    expect(leerCarga(r.datos.tokenAcceso)?.tid).toBe(r.datos.empresa.id);
    expect(r.datos.usuario.correo).toBe(USUARIO_NUEVO.correo);
  });

  test('un RUC ya registrado responde 409 RUC_EN_USO', async () => {
    expect(await pedir('POST', '/tenants', { ...EMPRESA, ruc: RUC_TOMADO }, token)).toMatchObject({
      estado: 409,
      datos: { codigo: 'RUC_EN_USO' },
    });
  });

  test('datos incompletos responden 400 VALIDACION señalando cada campo', async () => {
    const r = await pedir('POST', '/tenants', { tipo: 'empresa', razonSocial: 'a', ruc: '12', tamanoEquipo: 'x' }, token);

    expect(r).toMatchObject({ estado: 400, datos: { codigo: 'VALIDACION' } });
    expect(Object.keys(r.datos.campos).sort()).toEqual(['razonSocial', 'ruc', 'tamanoEquipo']);
  });
});
