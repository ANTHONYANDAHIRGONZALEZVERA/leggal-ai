import { codigoConGuion, esquemaEmpresa, normalizarCodigo, problemaRuc } from '../esquemas';

// Reglas del 4/5 (F33): código de invitación y datos para crear una empresa.

describe('normalizarCodigo', () => {
  test.each([
    ['acc7k2', 'ACC7K2'],
    ['ACC-7K2', 'ACC7K2'],
    [' acc 7k2 ', 'ACC7K2'],
    ['ACC-7K2-EXTRA', 'ACC7K2'],
    ['ñ#$%', ''],
  ])('"%s" → "%s"', (escrito, esperado) => {
    expect(normalizarCodigo(escrito)).toBe(esperado);
  });

  test('codigoConGuion lo deja como lo genera el backend', () => {
    expect(codigoConGuion('ACC7K2')).toBe('ACC-7K2');
  });
});

describe('problemaRuc (Ecuador)', () => {
  test.each([
    ['sociedad privada', '1790012345001'],
    ['persona natural', '0102030405001'],
    ['entidad pública', '1760001230001'],
    ['otro establecimiento', '1790012345002'],
    ['ecuatoriano en el exterior', '3090012345001'],
  ])('acepta un RUC de %s', (_caso, ruc) => {
    expect(problemaRuc(ruc)).toBeNull();
  });

  test.each([
    ['menos de 13 dígitos', '179001234500', 'El RUC tiene 13 dígitos'],
    ['letras', '17900123450AB', 'El RUC tiene 13 dígitos'],
    ['provincia 00', '0090012345001', 'provincia'],
    ['provincia 25', '2590012345001', 'provincia'],
    ['tercer dígito 7', '1770012345001', 'tercer dígito'],
    ['tercer dígito 8', '1780012345001', 'tercer dígito'],
    ['establecimiento 000', '1790012345000', '000'],
    ['establecimiento público 0000', '1760001230000', '000'],
  ])('rechaza un RUC con %s', (_caso, ruc, mensaje) => {
    expect(problemaRuc(ruc)).toContain(mensaje);
  });
});

describe('esquemaEmpresa', () => {
  const valida = { razonSocial: 'ACCONS S.A.S.', ruc: '1790012345001', tamanoEquipo: '6-20' } as const;

  test('acepta datos completos y quita espacios de la razón social', () => {
    expect(esquemaEmpresa.parse({ ...valida, razonSocial: '  ACCONS S.A.S.  ' })).toEqual(valida);
  });

  test.each([
    ['sin razón social', { razonSocial: '' }, 'razonSocial'],
    ['razón social solo con símbolos', { razonSocial: '---' }, 'razonSocial'],
    ['RUC inválido', { ruc: '123' }, 'ruc'],
    ['sin tamaño de equipo', { tamanoEquipo: undefined }, 'tamanoEquipo'],
    ['tamaño inventado', { tamanoEquipo: '1000' }, 'tamanoEquipo'],
  ])('rechaza %s', (_caso, cambios, campo) => {
    const r = esquemaEmpresa.safeParse({ ...valida, ...cambios });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual([campo]);
  });
});
