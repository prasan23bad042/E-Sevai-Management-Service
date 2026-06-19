import React from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '../../utils/cn';

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string;
  label: string;
  options: Option[];
}

export const FormSelect: React.FC<FormSelectProps> = ({ name, label, options, className, ...props }) => {
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
      <div className="relative">
        <select
          id={name}
          className={cn(
            'flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all appearance-none cursor-pointer',
            error && 'border-red-500 focus:ring-red-500'
          )}
          {...register(name)}
          {...props}
        >
          <option value="" disabled className="bg-slate-950 text-slate-500">Select option...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-100">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
      {error && (
        <span className="block mt-1.5 text-xs font-medium text-red-400 animate-fade-in">
          {error.message as string}
        </span>
      )}
    </div>
  );
};
