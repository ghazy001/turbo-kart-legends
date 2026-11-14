import { cupPoints } from '../../race/CupSession';
import type { TrialRecords } from '../../timeTrial/TrialRecords';
import { TimeTrialRecordSummary } from '../TimeTrialHUD';
import { lapLabel } from '../../config/raceOptions';
import { pointAtDistance } from '../../race/trackProgress';
import { trackCatalog, trackDefinition, sunshineCup } from '../../tracks/trackCatalog';
import type { RaceFlowStore } from './raceFlowStore';
import type { ReactNode } from 'react';
import { lavaPools } from '../../tracks/volcanoScenery';

type Course = typeof trackCatalog[number];
export function CourseMap({ compact = false, course = trackCatalog[0] }: { compact?: boolean; course?: Course }) {
  const samples = course.track.samples;
  const minX = Math.min(...samples.map(p => p.x)), minZ = Math.min(...samples.map(p => p.z));
  const maxX = Math.max(...samples.map(p => p.x)), maxZ = Math.max(...samples.map(p => p.z));
  const roadPath = samples.map((point, i) => `${i ? 'L' : 'M'}${point.x.toFixed(2)},${point.z.toFixed(2)}`).join(' ') + ' Z';
  const start = pointAtDistance(course.track, course.track.definition.startDistance ?? 0);
  return <svg className="course-map-art" viewBox={`${minX - 32} ${minZ - 35} ${maxX - minX + 64} ${maxZ - minZ + 70}`} role="img" aria-label={`${course.name}, a closed flowing loop with twelve checkpoint gates`}>
    <rect x={minX - 40} y={minZ - 45} width={maxX - minX + 80} height={maxZ - minZ + 90} rx="28" fill={course.theme.map} />
    {!course.theme.volcanic && <><path d={`M${minX - 40} ${maxZ - 5}Q0 60 ${maxX + 40} ${maxZ - 50}V${maxZ + 45}H${minX - 40}Z`} fill={course.theme.winter ? '#d9e9f2' : course.theme.candy ? '#b9daca' : '#68bbca'} />
    <path d={`M${minX - 40} ${maxZ - 17}Q0 48 ${maxX + 40} ${maxZ - 62}`} fill="none" stroke="#edcf98" strokeWidth="15" /></>}
    {Array.from({ length: 19 }, (_, i) => { const x = minX + (i * 71 % Math.floor(maxX - minX)), y = minZ + (i * 47 % Math.floor(maxZ - minZ)); return <g key={i}><circle cx={x} cy={y + 2} r={i % 3 + 5} fill="#426e6033" /><circle cx={x - 1} cy={y - 1} r={i % 3 + 5} fill={course.theme.leaves[i % 4]} /></g>; })}
    {course.theme.winter && <g aria-hidden="true"><path d="M-48 28-14-38 15 28ZM-10 34 22-20 53 34Z" fill="#789bb8" /><path d="m-26-14 12-24 11 24-11-5Zm36 13 12-19 11 19-11-4Z" fill="#f4fbff" /></g>}
    {course.theme.volcanic && <g aria-hidden="true">{lavaPools(course.track).map((pool, i) => <ellipse key={i} cx={pool.x} cy={pool.z} rx={pool.rx} ry={pool.rz} transform={`rotate(${-pool.rotation * 180 / Math.PI} ${pool.x} ${pool.z})`} fill="#fb9546" stroke="#ed5f33" strokeWidth="4" />)}<path d="m-32 27 22-49h18l26 49Z" fill="#a77b83" /><path d="M-10-22 0-17 8-22 4-12-3-10Z" fill="#ffb752" /><path d="m2-11 5 13-7 11" stroke="#fa8540" strokeWidth="3" fill="none" /></g>}
    <path d={roadPath} fill="none" stroke="#234e4e44" strokeWidth="23" transform="translate(0 5)" /><path d={roadPath} fill="none" stroke="#f0d7ac" strokeWidth="19" /><path d={roadPath} fill="none" stroke="#fb795a" strokeWidth="16" strokeDasharray="5 5" /><path d={roadPath} fill="none" stroke={course.theme.road} strokeWidth="12" /><path d={roadPath} fill="none" stroke="#d8dec890" strokeWidth=".8" strokeDasharray="3 5" />
    <g transform={`translate(${start.x} ${start.z}) rotate(${-Math.atan2(start.tx, start.tz) * 180 / Math.PI})`}><rect x="-7" y="-2" width="14" height="4" fill="#fff5dc" /><path d="M-7-2h3v2h-3m6 0h3v2h-3m6-4h3v2H5" fill="#25444b" /></g>
    {!compact && <text x="0" y="-3" textAnchor="middle" fill="#f8f1d2" fontSize="11" fontWeight="800" letterSpacing="2">{course.theme.sign}</text>}
  </svg>;
}
export function PreviewPanel({ label, name, description, region, children }: { label: string; name: string; description: string; region: string; children: ReactNode }) {
  return <section className="selection-preview course-preview" aria-label={`${name} preview`}><div className="selection-preview-top"><span><i /> COURSE SHOWCASE</span><span>{region}</span></div><div className="course-preview-image">{children}</div><div className="selection-nameplate" key={name}><div><span>{label}</span><h3>{name}</h3></div><span className="selection-name-arrow" aria-hidden="true">↗</span></div><p className="selection-description">{description}</p></section>;
}
export function TrackSelectScreen({ store, records, cup = false }: { store: RaceFlowStore; records?: TrialRecords; cup?: boolean }) {
  const state = store.getSnapshot(), championship = cup || state.currentMode === 'grand-prix';
  const track = trackDefinition(state.selectedTrack);
  return <><section className="track-roster"><div className="selection-roster-heading"><span>{championship ? 'YOUR CHAMPIONSHIP' : 'FIND YOUR FAVORITE LINE'}</span><span>{championship ? '01 CUP' : `${String(trackCatalog.length).padStart(2, '0')} COURSES`}</span></div>
    {championship ? <div className="cup-itinerary"><span className="cup-emblem" aria-hidden="true">♜</span><h3>{sunshineCup.name}</h3><p>{sunshineCup.description}</p><ol aria-label="Cup race order">{sunshineCup.tracks.map((id, index) => <li key={id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{trackDefinition(id).name}</strong><small>3 laps · 3 CPU rivals</small></div></li>)}</ol><p className="cup-points">1st <b>10</b> · 2nd <b>7</b> · 3rd <b>4</b> · 4th <b>1</b> point</p></div> :
      <div className="track-list" role="radiogroup" aria-label="Choose track">{trackCatalog.map((entry, index) => <button key={entry.id} className="track-select-card" role="radio" aria-checked={entry.id === state.selectedTrack} data-menu-current={entry.id === state.selectedTrack} tabIndex={entry.id === state.selectedTrack ? 0 : -1} onClick={() => store.choose(index)}><CourseMap compact course={entry} /><span className="track-select-card-copy"><small>{entry.region}</small><strong>{entry.name}</strong><span>{lapLabel(state.currentMode === 'vs-race' ? state.vsOptions.laps : entry.laps)} · {Math.round(entry.track.length)} m · {entry.difficulty}</span></span>{entry.id === state.selectedTrack && <span className="track-check" aria-hidden="true">✓</span>}</button>)}</div>}
    <div className="course-meta"><span>{String(championship ? sunshineCup.tracks.length : trackCatalog.length).padStart(2, '0')}<small>{championship ? 'ROUNDS' : 'ORIGINAL COURSES'}</small></span><span>{state.currentMode === 'vs-race' ? String(state.vsOptions.laps).padStart(2, '0') : '03'}<small>LAPS PER RACE</small></span><span>{championship ? String(cupPoints[0] * sunshineCup.tracks.length) : state.currentMode === 'time-trial' ? '01' : '04'}<small>{championship ? 'MAXIMUM POINTS' : state.currentMode === 'time-trial' ? 'SOLO RACER' : 'RACERS ON GRID'}</small></span></div>{state.currentMode === 'time-trial' && records && <TimeTrialRecordSummary records={records} track={track.track} />}</section>
    <PreviewPanel label={championship ? 'YOUR CHAMPIONSHIP' : 'YOUR CIRCUIT'} name={championship ? sunshineCup.name : track.name} region={championship ? 'COAST TO CALDERA' : track.region} description={championship ? 'Points carry between races. The highest total takes the cup. Ties use finishing-place countback, then the final race.' : track.description}>
      {championship ? <div className="cup-route-preview">{sunshineCup.tracks.map((id, index) => <div key={id}><CourseMap compact course={trackDefinition(id)} /><span>RACE {index + 1} / {trackDefinition(id).name}</span></div>)}</div> : <CourseMap key={track.id} course={track} />}
    </PreviewPanel></>;
}
