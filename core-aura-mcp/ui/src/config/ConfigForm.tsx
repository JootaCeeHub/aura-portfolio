import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import AgentSection from './sections/AgentSection';
import CoreSection from './sections/CoreSection';
import RepositoriesSection from './sections/RepositoriesSection';

type Props = {
  initial?: any;
  onSubmit: (data: any) => Promise<void>;
  onPreview?: (data: any) => Promise<void>;
  previewErrors?: Record<string, string[]>;
};

export default function ConfigForm({ initial = {}, onSubmit, onPreview, previewErrors }: Props) {
  const { register, handleSubmit, formState, control, watch } = useForm({
    defaultValues: initial,
    mode: 'onChange'
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>(previewErrors || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const data = watch();

  useEffect(() => {
    if (previewErrors) setValidationErrors(previewErrors);
  }, [previewErrors]);

  async function onSubmitWithValidation(formData: any) {
    setIsSubmitting(true);
    setValidationErrors({});
    try {
      await onSubmit(formData);
    } catch (err: any) {
      if (err.message?.includes('Validation failed')) {
        setValidationErrors(err.errors || {});
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onPreviewWithValidation(formData: any) {
    setValidationErrors({});
    try {
      if (onPreview) await onPreview(formData);
    } catch (err: any) {
      // ignora preview errors, validationErrors se actualiza en ConfigPage
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitWithValidation)} style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <AgentSection register={register} control={control} errors={validationErrors} />
        <CoreSection register={register} control={control} errors={validationErrors} />
        <RepositoriesSection register={register} control={control} errors={validationErrors} />
      </div>
      <div style={{ width: 360 }}>
        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <button type="submit" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.6 : 1 }}>
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
          {onPreview && (
            <button type="button" onClick={handleSubmit(onPreviewWithValidation)}>
              Previsualizar
            </button>
          )}
          {Object.keys(validationErrors).length > 0 && (
            <div style={{ color: '#f88', fontSize: '0.85rem', padding: '8px', background: '#200', borderRadius: 4 }}>
              <strong>Errores de validación:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                {Object.entries(validationErrors).map(([field, msgs]) => (
                  <li key={field}>
                    <strong>{field}:</strong> {(msgs as string[]).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {formState.errors && Object.keys(formState.errors).length > 0 && (
            <div style={{ color: '#f88', fontSize: '0.85rem', padding: '8px', background: '#200', borderRadius: 4 }}>
              <strong>Errores de formulario:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
                {Object.entries(formState.errors).map(([k, v]: any) => (
                  <li key={k}>
                    {k}: {v?.message || 'error'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
