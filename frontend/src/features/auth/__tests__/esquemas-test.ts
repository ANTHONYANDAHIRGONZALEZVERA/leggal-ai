import { esquemaInicioSesion, esquemaRegistro } from '../esquemas';

// Reglas de los formularios de acceso. Se prueba el esquema directo (sin
// pantalla) para cubrir cada mensaje de error que ve la persona.

/** Primer mensaje de error de un campo, o undefined si el campo es válido. */
function errorDe(resultado: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }, campo: string) {
  return resultado.error?.issues.find((i) => i.path[0] === campo)?.message;
}

describe('esquemaInicioSesion (Login, F07)', () => {
  test('limpia espacios y pasa el correo a minúsculas antes de validarlo', () => {
    // Pasa mucho con el autocompletado del teclado: " Ana@Empresa.com ".
    const r = esquemaInicioSesion.safeParse({ correo: '  Ana@Empresa.COM ', contrasena: 'x' });
    expect(r.success).toBe(true);
    expect(r.data?.correo).toBe('ana@empresa.com');
  });

  test('rechaza un correo sin formato válido', () => {
    const r = esquemaInicioSesion.safeParse({ correo: 'ana.empresa.com', contrasena: 'x' });
    expect(errorDe(r, 'correo')).toBe('Ingresa un correo válido');
  });

  test('pide la contraseña si está vacía', () => {
    const r = esquemaInicioSesion.safeParse({ correo: 'ana@empresa.com', contrasena: '' });
    expect(errorDe(r, 'contrasena')).toBe('Ingresa tu contraseña');
  });
});

describe('esquemaRegistro (Registro, F08)', () => {
  const validos = {
    nombre: 'Ana Pérez',
    correo: 'ana@empresa.com',
    contrasena: 'Leggal2026!',
    aceptaTerminos: true,
  };

  test('acepta un registro completo y correcto', () => {
    expect(esquemaRegistro.safeParse(validos).success).toBe(true);
  });

  test('pide el nombre completo si tiene menos de 3 letras (sin contar espacios)', () => {
    const r = esquemaRegistro.safeParse({ ...validos, nombre: '  Al  ' });
    expect(errorDe(r, 'nombre')).toBe('Ingresa tu nombre completo');
  });

  test('limita el nombre a 80 caracteres', () => {
    const r = esquemaRegistro.safeParse({ ...validos, nombre: 'a'.repeat(81) });
    expect(errorDe(r, 'nombre')).toBe('Máximo 80 caracteres');
  });

  test('exige una contraseña de mínimo 8 caracteres', () => {
    expect(errorDe(esquemaRegistro.safeParse({ ...validos, contrasena: '1234567' }), 'contrasena')).toBe(
      'Mínimo 8 caracteres',
    );
    expect(esquemaRegistro.safeParse({ ...validos, contrasena: '12345678' }).success).toBe(true);
  });

  test('limita la contraseña a 72 caracteres', () => {
    // 72 es el máximo que procesa bcrypt; más largo se cortaría sin avisar.
    const r = esquemaRegistro.safeParse({ ...validos, contrasena: 'a'.repeat(73) });
    expect(errorDe(r, 'contrasena')).toBe('Máximo 72 caracteres');
  });

  test('no deja crear la cuenta sin aceptar Términos y Política', () => {
    // Consentimiento expreso: la casilla empieza sin marcar y es obligatoria.
    const r = esquemaRegistro.safeParse({ ...validos, aceptaTerminos: false });
    expect(errorDe(r, 'aceptaTerminos')).toBe('Debes aceptar los Términos y la Política para continuar');
  });
});
