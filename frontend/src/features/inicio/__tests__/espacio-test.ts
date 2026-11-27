import type { EmpresaApi } from '@/services/api/contrato';

import { espacioActivo } from '../espacio';

// Qué espacio muestra el encabezado del Inicio (F12).
const empresa = (id: string, cambios: Partial<EmpresaApi> = {}): EmpresaApi => ({
  id,
  nombre: id,
  tipo: 'empresa',
  rol: 'Abogado/a',
  estadoMembresia: 'activa',
  ...cambios,
});
const PERSONAL = empresa('esp-1', { nombre: 'Espacio personal', tipo: 'personal', rol: 'Administrador' });

describe('espacioActivo', () => {
  test('usa el de la sesión (empresaActivaId = tid del token)', () => {
    expect(espacioActivo({ empresaActivaId: 'emp-b', empresas: [empresa('emp-a'), empresa('emp-b')] })?.id).toBe('emp-b');
  });

  test('si el token aún no trae empresa, la primera empresa donde ya es miembro', () => {
    expect(espacioActivo({ empresaActivaId: null, empresas: [PERSONAL, empresa('emp-a')] })?.id).toBe('emp-a');
  });

  test('sin empresas, su espacio personal', () => {
    expect(espacioActivo({ empresaActivaId: null, empresas: [PERSONAL] })?.nombre).toBe('Espacio personal');
  });

  test('una solicitud en espera nunca es el espacio activo', () => {
    const pendiente = empresa('emp-a', { estadoMembresia: 'en_espera' });
    expect(espacioActivo({ empresaActivaId: 'emp-a', empresas: [pendiente, PERSONAL] })?.id).toBe('esp-1');
  });

  test('sin nada, ninguno', () => {
    expect(espacioActivo({ empresaActivaId: null, empresas: [] })).toBeNull();
  });
});
