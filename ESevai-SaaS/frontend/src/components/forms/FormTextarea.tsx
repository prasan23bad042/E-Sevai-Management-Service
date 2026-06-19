import React from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '../../utils/cn';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  label: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({ name, label, className, rows = 3, ...props }) => {
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
      <textarea
        id={name}
        rows={rows}
        className={cn(
          'flex w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-y',
          error && 'border-red-500 focus:ring-red-500'
        )}
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
