import { JwtService } from '@nestjs/jwt';
import type { Entorno } from '../config/entorno';
import { hashRefresco, TokensService } from './tokens.service';

const entorno = {
  JWT_SECRETO: 'x'.repeat(32),
  JWT_ACCESO_SEGUNDOS: 900,
  REFRESCO_DIAS: 30,
  REFRESCO_GRACIA_SEGUNDOS: 30,
} as Entorno;

const jwt = new JwtService({
  secret: entorno.JWT_SECRETO,
  signOptions: { algorithm: 'HS256', expiresIn: entorno.JWT_ACCESO_SEGUNDOS },
  verifyOptions: { algorithms: ['HS256'] },
});
const tokens = new TokensService(jwt, entorno);

describe('TokensService', () => {
  it('firma un JWT con sub, tid y sid que vence en 15 minutos', () => {
    const token = tokens.firmarAcceso({ sub: 'u-1', tid: null, sid: 's-1' });
    const contenido = jwt.verify<Record<string, unknown>>(token);
    expect(contenido).toMatchObject({ sub: 'u-1', tid: null, sid: 's-1' });
    expect(Number(contenido.exp) - Number(contenido.iat)).toBe(900);
    // Sin permisos ni datos personales dentro del token.
    expect(Object.keys(contenido).sort()).toEqual([
      'exp',
      'iat',
      'sid',
      'sub',
      'tid',
    ]);
  });

  it('un JWT firmado con otro secreto no se acepta', () => {
    const otro = new JwtService({ secret: 'y'.repeat(32) });
    const falso = otro.sign({ sub: 'u-1', tid: null, sid: 's-1' });
    expect(() => jwt.verify(falso)).toThrow();
  });

  it('crea refresh aleatorios de 43 caracteres y guarda solo su SHA-256', () => {
    const a = tokens.nuevoRefresco();
    const b = tokens.nuevoRefresco();
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).toBe(hashRefresco(a.token));
    expect(a.hash).not.toContain(a.token);
  });

  it('el refresh vence a los 30 días y la gracia es de 30 segundos', () => {
    const desde = new Date('2026-11-01T00:00:00Z');
    expect(tokens.vencimientoRefresco(desde).toISOString()).toBe(
      '2026-12-01T00:00:00.000Z',
    );
    expect(tokens.msGracia).toBe(30_000);
    expect(tokens.segundosAcceso).toBe(900);
  });
});

describe('TokensService.verificarAcceso', () => {
  const contenido = {
    sub: '8f1c2d7a-3b4e-4f6a-9c1d-2e3f4a5b6c7d',
    tid: null,
    sid: 'b2a4c6e8-1d3f-4a5b-8c7d-9e0f1a2b3c4d',
  };
  const codigoDe = (promesa: Promise<unknown>) =>
    promesa.then(
      () => 'sin error',
      (error: { codigo?: string }) => error.codigo,
    );

  it('devuelve sub, tid y sid de un token válido', async () => {
    const token = tokens.firmarAcceso(contenido);
    await expect(tokens.verificarAcceso(token)).resolves.toEqual(contenido);
  });

  it('TOKEN_EXPIRADO si venció', async () => {
    const vencido = jwt.sign(contenido, { expiresIn: -10 });
    expect(await codigoDe(tokens.verificarAcceso(vencido))).toBe(
      'TOKEN_EXPIRADO',
    );
  });

  it.each([
    ['basura', 'no.es.unjwt'],
    [
      'firmado con otro secreto',
      new JwtService({ secret: 'y'.repeat(32) }).sign(contenido),
    ],
    [
      'alg "none" (sin firma)',
      `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(contenido)).toString('base64url')}.`,
    ],
    ['contenido con otra forma', jwt.sign({ sub: 'no-es-uuid', sid: 'x' })],
  ])('TOKEN_INVALIDO: %s', async (_caso, token) => {
    expect(await codigoDe(tokens.verificarAcceso(token))).toBe(
      'TOKEN_INVALIDO',
    );
  });
});
