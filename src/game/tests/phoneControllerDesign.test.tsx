import { createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ControllerSettings } from '../../phone/ControllerSettings';
import { PhoneControlDeck, type PhoneControlDeckProps } from '../../phone/PhoneControlDeck';
import { TouchInput } from '../../phone/TouchInput';
import { defaultTiltSettings } from '../../phone/steering';

function deck(overrides: Partial<PhoneControlDeckProps> = {}) {
  return renderToStaticMarkup(<PhoneControlDeck touch={new TouchInput()} mode="touch" enabled itemsEnabled calibrated={false}
    deckRef={createRef()} sliderRef={createRef()} onTouch={() => undefined} onMotion={() => undefined} onCalibrate={() => undefined} {...overrides} />);
}
describe('phone controller presentation and input availability', () => {
  it('exposes four named driving controls and an accessible centered steering pad', () => {
    const html = deck();
    for (const action of ['throttle', 'brake', 'drift', 'useItem']) expect(html).toContain(`class="drive-button ${action}"`);
    expect(html).toContain('role="slider"'); expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain('aria-valuemin="-1"'); expect(html).toContain('aria-valuemax="1"');
    expect(html).toContain('aria-label="Touch steering"'); expect(html).not.toContain('disabled=""');
    expect(html).toContain('Hold to reverse'); expect(html).toContain('Hold · release for turbo');
  });
  it('disables every driving action and keyboard steering while gameplay is unavailable', () => {
    const html = deck({ enabled: false });
    expect(html.match(/disabled=""/g)).toHaveLength(4);
    expect(html).toContain('tabindex="-1"'); expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-label="Steering mode"');
  });
  it('keeps the item unavailable in item-free modes while leaving pedals usable', () => {
    const html = deck({ itemsEnabled: false });
    expect(html.match(/disabled=""/g)).toHaveLength(1);
    expect(html).toContain('No items this mode'); expect(html).toContain('data-enabled="true"');
  });
  it('keeps calibration actionable before tilt driving is enabled', () => {
    const html = deck({ mode: 'tilt', enabled: false });
    expect(html).not.toContain('role="slider"'); expect(html).toContain('Calibrate to drive');
    expect(html).toContain('class="phone-calibrate"'); expect(html.match(/disabled=""/g)).toHaveLength(4);
    expect(deck({ mode: 'tilt', calibrated: true })).toContain('Recalibrate');
  });
  it('retains tuning, inversion, input rates and connection feedback in the settings dialog', () => {
    const html = renderToStaticMarkup(<ControllerSettings settings={{ ...defaultTiltSettings, inverted: true }} rate={45} rtt={18}
      message="Motion permission denied. Touch is available." onSettings={() => undefined} onRate={() => undefined} onClose={() => undefined} />);
    expect(html).toContain('role="dialog"'); expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Close controller settings"');
    for (const label of ['Tilt sensitivity', 'Dead zone', 'Smoothing', 'Input rate', 'Invert steering']) expect(html).toContain(label);
    expect(html).toContain('value="45" selected=""'); expect(html).toContain('checked=""');
    expect(html).toContain('18 ms round trip'); expect(html).toContain('Motion permission denied. Touch is available.');
  });
  it('keeps pressed feedback active until every finger or keyboard hold is released', () => {
    const touch = new TouchInput();
    touch.button('throttle', 1, true); touch.button('throttle', 2, true); touch.button('throttle', -1, true);
    touch.button('throttle', 1, false); touch.button('throttle', -1, false);
    expect(touch.isHeld('throttle')).toBe(true); expect(touch.sample().throttle).toBe(1);
    touch.button('throttle', 2, false); expect(touch.isHeld('throttle')).toBe(false);
    touch.button('drift', 3, true); touch.button('useItem', 4, true); touch.clear();
    expect(touch.isHeld('drift')).toBe(false); expect(touch.isHeld('useItem')).toBe(false);
    expect(touch.sample().useItem).toBe(false);
  });
});
