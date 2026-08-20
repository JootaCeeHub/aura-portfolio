import React from 'react';
import type { UseFormRegister, Control } from 'react-hook-form';
import { renderFieldError, sectionStyles } from '../utils/formUtils';

type Props = {
  register: UseFormRegister<any>;
  control: Control<any>;
  errors?: Record<string, string[]>;
};

export default function AgentSection({ register, control, errors }: Props) {
  return (
    <section style={sectionStyles.container}>
      <h3>Identidad del Agente</h3>
      <div style={sectionStyles.grid2Col}>
        <label>
          Nombre
          <input {...register('agent.name', { required: 'Nombre requerido', minLength: { value: 1, message: 'Min 1 caracter' } })} />
          {renderFieldError('agent.name', errors)}
        </label>
        <label>
          Rol
          <input {...register('agent.role', { required: 'Rol requerido' })} />
          {renderFieldError('agent.role', errors)}
        </label>
        <label>
          Estado
          <select {...register('agent.enabled', { setValueAs: (v) => v === 'true' })}>
            <option value={"true"}>Activo</option>
            <option value={"false"}>Desactivado</option>
          </select>
          {renderFieldError('agent.enabled', errors)}
        </label>
      </div>
    </section>
  );
}
