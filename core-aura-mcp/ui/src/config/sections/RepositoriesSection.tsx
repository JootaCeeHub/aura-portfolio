import React from 'react';
import type { UseFormRegister, Control } from 'react-hook-form';
import { renderFieldError, renderPathHelper, sectionStyles } from '../utils/formUtils';

type Props = {
  register: UseFormRegister<any>;
  control: Control<any>;
  errors?: Record<string, string[]>;
};

export default function RepositoriesSection({ register, control, errors }: Props) {
  return (
    <section style={sectionStyles.container}>
      <h3>Repositorio</h3>
      <div style={sectionStyles.grid1Col}>
        <label>
          Prompts
          <input {...register('repositories.promptsPath')} />
          {renderPathHelper('Ruta relativa o absoluta a carpeta de prompts')}
          {renderFieldError('repositories.promptsPath', errors)}
        </label>
        <label>
          Templates
          <input {...register('repositories.templatesPath')} />
          {renderPathHelper('Ruta a carpeta de templates')}
          {renderFieldError('repositories.templatesPath', errors)}
        </label>
        <label>
          Forms
          <input {...register('repositories.formsPath')} />
          {renderPathHelper('Ruta a carpeta de formularios')}
          {renderFieldError('repositories.formsPath', errors)}
        </label>
        <label>
          Knowledge
          <input {...register('repositories.knowledgePath')} />
          {renderPathHelper('Ruta a carpeta de knowledge base')}
          {renderFieldError('repositories.knowledgePath', errors)}
        </label>
      </div>
    </section>
  );
}
