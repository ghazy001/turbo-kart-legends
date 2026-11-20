/** Decorative pedal plate; the parent remains one full-size native hold button. */
export function PedalFace({ accelerator = false }: { accelerator?: boolean }) {
  return <span className="pedal-face">
    <span className="pedal-fasteners" aria-hidden="true"><i /><i /><i /><i /></span>
    <span className="pedal-led" aria-hidden="true" />
    <span className="pedal-slots" aria-hidden="true"><i /><i /><i /></span>
    <strong>{accelerator ? 'GAS' : 'BRAKE'}</strong>
    <small>{accelerator ? 'Hold to accelerate' : 'Hold to reverse'}</small>
    <span className="pedal-heel" aria-hidden="true"><i /><i /><i /></span>
  </span>;
}
