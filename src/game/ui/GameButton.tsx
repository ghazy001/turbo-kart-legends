import type { ComponentPropsWithoutRef } from 'react';
import '../../styles/buttons.css';

type GameButtonProps = ComponentPropsWithoutRef<'button'> & {
  tone?: 'accent' | 'quiet' | 'surface';
  size?: 'regular' | 'small';
};

/** Shared menu actions; keep native button semantics and existing input hooks. */
export function GameButton({ tone = 'accent', size = 'regular', className = '', type = 'button', ...props }: GameButtonProps) {
  return <button {...props} type={type} className={`game-button ${className}`} data-tone={tone} data-size={size} />;
}
