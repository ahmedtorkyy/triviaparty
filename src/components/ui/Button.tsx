import React from 'react';

interface ButtonProps {
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
}

export function Button({
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  children,
  ariaLabel,
}: ButtonProps) {
  const baseClass = 'tp-button';
  const variantClass = `${baseClass}--${variant}`;
  const sizeClass = `${baseClass}--${size}`;

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${fullWidth ? `${baseClass}--full` : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
