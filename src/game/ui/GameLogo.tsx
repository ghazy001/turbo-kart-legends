import { useState } from 'react';
import { logoArtwork } from '../config/branding';
import '../../styles/branding.css';

type LogoVariant = 'home' | 'compact' | 'loading' | 'phone';
const sizes: Record<LogoVariant, string> = {
  home: '(max-width: 760px) 220px, 280px',
  compact: '(max-width: 760px) 136px, 160px',
  loading: '(max-width: 480px) 240px, 280px',
  phone: '(max-width: 600px) 116px, 140px',
};

/** Decorative artwork with one accessible brand name and a readable network-error fallback. */
export function GameLogo({ variant = 'compact' }: { variant?: LogoVariant }) {
  const [failed, setFailed] = useState(false);
  return <div className={`game-logo game-logo--${variant}`} role="img" aria-label="Turbo Kart Legends">
    {failed ? <span className="game-logo__fallback" aria-hidden="true"><span>Turbo Kart</span><small>Legends</small></span>
      : <img className="game-logo__image" src={logoArtwork.small} srcSet={`${logoArtwork.small} 384w, ${logoArtwork.large} 768w`} sizes={sizes[variant]}
        width={logoArtwork.width} height={logoArtwork.height} alt="" aria-hidden="true" draggable={false} decoding="async"
        fetchPriority={variant === 'home' || variant === 'loading' ? 'high' : 'auto'} onError={() => setFailed(true)} />}
  </div>;
}
