import { readFileSync, statSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { logoArtwork } from '../config/branding';
import { GameLogo } from '../ui/GameLogo';
import { LoadingScreen } from '../ui/LoadingScreen';
import { SelectionHeader } from '../ui/selection/SelectionHeader';

describe('generated logo integration', () => {
  it.each(['home', 'compact', 'loading', 'phone'] as const)('%s: labels the brand once and uses responsive display images', variant => {
    const markup = renderToStaticMarkup(<GameLogo variant={variant} />);
    expect(markup).toContain('role="img" aria-label="Turbo Kart Legends"');
    expect(markup).toContain('alt="" aria-hidden="true"');
    expect(markup).toContain(`${logoArtwork.small} 384w, ${logoArtwork.large} 768w`);
    expect(markup).toContain(`width="${logoArtwork.width}" height="${logoArtwork.height}"`);
    expect(markup).not.toContain('logo-v1.png');
    expect(markup).toContain(`fetchPriority="${variant === 'home' || variant === 'loading' ? 'high' : 'auto'}"`);
  });
  it('ships small valid WebP files instead of making menu headers fetch the source PNG', () => {
    for (const [url, limit] of [[logoArtwork.small, 32_000], [logoArtwork.large, 80_000]] as const) {
      const file = new URL(`../../../public${url}`, import.meta.url), bytes = readFileSync(file);
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF'); expect(bytes.subarray(8, 12).toString()).toBe('WEBP');
      expect(bytes.byteLength).toBeGreaterThan(0); expect(bytes.byteLength).toBeLessThan(limit);
      expect(bytes.byteLength).toBeLessThan(statSync(new URL('../../../public/assets/branding/turbo-kart-legends-logo-v1.png', import.meta.url)).size / 10);
    }
  });
  it('keeps loading progress, cancellation and legacy selection labels when showing the new logo', () => {
    const loading = renderToStaticMarkup(<LoadingScreen title="Sunshine Circuit" progress={0.5} onCancel={() => undefined} />);
    expect(loading).toContain('role="dialog"'); expect(loading).toContain('aria-label="Preparing the game"');
    expect(loading).toContain('Back to menu'); expect(loading).toContain('game-logo--loading');
    const selection = renderToStaticMarkup(<SelectionHeader step="racer" />);
    expect(selection).toContain('game-logo--compact'); expect(selection).toContain('aria-label="Race preparation"');
  });
});
