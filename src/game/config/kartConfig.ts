export const kartConfig = {
  maxForwardSpeed: 20,
  maxReverseSpeed: 6,
  acceleration: 6.5,
  reverseAcceleration: 4.5,
  braking: 19,
  coastDrag: 2.5,
  rollingDrag: 0.065,
  wheelBase: 2.05,
  maxSteerAngle: 0.48,
  highSpeedSteerReduction: 2.4,
  steeringResponse: 14,
  lateralGrip: 12,
  slipFactor: 0.09,
  collisionRadius: 1.8,
  collisionSkin: 0.04,
  impactRetention: 0.82,
  recoveryDistance: 18,
  wheelRadius: 0.39,
} as const;

export const loopConfig = { step: 1 / 60, maxFrame: 0.1, maxSteps: 6 } as const;
export const cameraConfig = {
  distance: 9.5, height: 5.2, lookAhead: 5.5, lookHeight: 1,
  positionDamping: 6.5, targetDamping: 10, fov: 57,
} as const;

export const sceneConfig = {
  roadY: 0.035, curbWidth: 0.65, railWidth: 0.28, railHeight: 0.62,
  dprMax: 1.5, shadowSize: 1024,
} as const;
