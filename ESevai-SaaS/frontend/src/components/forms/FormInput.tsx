import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input, type InputProps } from '../ui/Input';

interface FormInputProps extends Omit<InputProps, 'name'> {
  name: string;
  label: string;
}

export const FormInput: React.FC<FormInputProps> = ({ name, label, className, ...props }) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name];

  return (
    <div className={className}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5" htmlFor={name}>
        {label}
      </label>
      <Input
        id={name}
        error={!!error}
        {...register(name)}
        {...props}
      />
      {error && (
        <span className="block mt-1.5 text-xs font-medium text-red-400 animate-fade-in">
          {error.message as string}
        </span>
      )}
    </div>
  );
};
