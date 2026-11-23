import {
  alcanzaNivel,
  MODULOS,
  puedeAprobarIa,
  ROLES_BASE,
  type ClaveRolBase,
  type ModuloClave,
} from './catalogo';

const nivelDe = (rol: ClaveRolBase, modulo: ModuloClave) =>
  ROLES_BASE.find((r) => r.clave === rol)!.permisos[modulo];

describe('Catálogo de módulos y roles base', () => {
  it('tiene los 8 módulos de "Permisos por rol", en orden y sin repetir', () => {
    expect(MODULOS.map((m) => m.clave)).toEqual([
      'casos',
      'clientes',
      'documentos',
      'actividades',
      'asistente_ia',
      'aprobar_ia',
      'administracion',
      'auditoria',
    ]);
  });

  it('tiene los 5 roles base con sus nombres de la app', () => {
    expect(ROLES_BASE.map((r) => [r.clave, r.nombre])).toEqual([
      ['administrador', 'Administrador'],
      ['abogado', 'Abogado/a'],
      ['asistente_legal', 'Asistente legal'],
      ['contador', 'Contador/a'],
      ['solo_lectura', 'Solo lectura'],
    ]);
  });

  // La tabla del plan (sección "Roles y permisos"), escrita aparte a
  // propósito: si alguien cambia la matriz del catálogo, esta prueba falla.
  it.each([
    //               Admin     Abogado   Asistente Contador  Solo lectura
    ['casos', ['editar', 'editar', 'editar', 'ver', 'ver']],
    ['clientes', ['editar', 'editar', 'editar', 'ver', 'ver']],
    ['documentos', ['editar', 'editar', 'editar', 'ver', 'ver']],
    ['actividades', ['editar', 'editar', 'editar', 'ver', 'ver']],
    ['asistente_ia', ['editar', 'editar', 'editar', 'ninguno', 'ninguno']],
    ['aprobar_ia', ['editar', 'editar', 'ninguno', 'ninguno', 'ninguno']],
    ['administracion', ['editar', 'ninguno', 'ninguno', 'ninguno', 'ninguno']],
    ['auditoria', ['ver', 'ninguno', 'ninguno', 'ninguno', 'ninguno']],
  ] as const)('matriz del plan: %s', (modulo, esperados) => {
    const roles: ClaveRolBase[] = [
      'administrador',
      'abogado',
      'asistente_legal',
      'contador',
      'solo_lectura',
    ];
    expect(roles.map((rol) => nivelDe(rol, modulo))).toEqual(esperados);
  });

  it('cada rol trae un nivel para cada uno de los 8 módulos', () => {
    for (const rol of ROLES_BASE) {
      expect(Object.keys(rol.permisos).sort()).toEqual(
        MODULOS.map((m) => m.clave).sort(),
      );
    }
  });

  it('regla de negocio: solo Administrador y Abogado/a aprueban respuestas de la IA', () => {
    const aprueban = ROLES_BASE.filter(
      (r) => r.permisos.aprobar_ia !== 'ninguno',
    ).map((r) => r.clave);
    expect(aprueban).toEqual(['administrador', 'abogado']);
    expect(puedeAprobarIa('administrador')).toBe(true);
    expect(puedeAprobarIa('abogado')).toBe(true);
    expect(puedeAprobarIa('asistente_legal')).toBe(false);
    expect(puedeAprobarIa('contador')).toBe(false);
    expect(puedeAprobarIa('solo_lectura')).toBe(false);
    expect(puedeAprobarIa(null)).toBe(false); // rol creado por la empresa
  });

  it('auditoría nunca es "editar": la bitácora es de solo inserción', () => {
    expect(ROLES_BASE.every((r) => r.permisos.auditoria !== 'editar')).toBe(
      true,
    );
  });
});

describe('alcanzaNivel', () => {
  it.each([
    ['editar', 'ver', true],
    ['editar', 'editar', true],
    ['ver', 'ver', true],
    ['ver', 'editar', false],
    ['ninguno', 'ver', false],
    ['ninguno', 'editar', false],
  ] as const)('tiene %s, exige %s → %s', (tiene, exige, esperado) => {
    expect(alcanzaNivel(tiene, exige)).toBe(esperado);
  });
});
