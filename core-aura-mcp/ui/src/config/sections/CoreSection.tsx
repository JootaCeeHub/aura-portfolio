import React from 'react';
import type { UseFormRegister, Control } from 'react-hook-form';
import { renderFieldError, sectionStyles } from '../utils/formUtils';

type Props = {
  register: UseFormRegister<any>;
  control: Control<any>;
  errors?: Record<string, string[]>;
};

export default function CoreSection({ register, control, errors }: Props) {
  return (
    <section style={sectionStyles.container}>
      <h3>Servidor Core</h3>
      <div style={sectionStyles.grid2Col}>
        <label>
          Host
          <input {...register('core.host', { required: 'Host requerido' })} />
          {renderFieldError('core.host', errors)}
        </label>
        <label>
          Puerto
          <input type="number" {...register('core.port', { required: 'Puerto requerido', min: { value: 1024, message: 'Min 1024' }, max: { value: 65535, message: 'Max 65535' }, setValueAs: (v) => Number(v) })} />
          {renderFieldError('core.port', errors)}
        </label>
        <label>
          WebSocket
          <select {...register('core.enableWs', { setValueAs: (v) => v === 'true' })}>
            <option value={"true"}>Habilitado</option>
            <option value={"false"}>Deshabilitado</option>
          </select>
          {renderFieldError('core.enableWs', errors)}
        </label>
        <label>
          Nivel de log
          <select {...register('core.logLevel', { required: 'Nivel de log requerido' })}>
            <option value="">Seleccionar...</option>
            <option value="debug">debug</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
          </select>
          {renderFieldError('core.logLevel', errors)}
        </label>
      </div>
    </section>
  );
}
