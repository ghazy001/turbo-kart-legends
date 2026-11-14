import { driverAssets, kartAssets, type RacerId, type KartId, type VisualSelection } from '../../config/visualAssets';
import { SelectionCard } from './SelectionCard';
import { selectionEntries, type SelectionStep } from './selectionStore';

export function SelectionGrid({ step, selectedIndex, selection, onSelect }: {
  step: SelectionStep; selectedIndex: number; selection: VisualSelection; onSelect: (index: number) => void;
}) {
  const entries = selectionEntries(step);
  return <section className="selection-roster" aria-label={step === 'racer' ? 'Racer roster' : 'Kart collection'}>
    <div className="selection-roster-heading"><span>{step === 'racer' ? 'THE STARTING LINEUP' : 'THE SUNSHINE GARAGE'}</span><span>{String(entries.length).padStart(2, '0')} AVAILABLE</span></div>
    <div className="selection-grid" role="radiogroup" aria-label={step === 'racer' ? 'Choose racer' : 'Choose kart'}>
      {entries.map((asset, index) => <SelectionCard key={`${step}:${asset.id}`} asset={asset} index={index} selected={index === selectedIndex} step={step}
        driver={driverAssets[step === 'racer' ? asset.id as RacerId : selection.racerId]} kart={kartAssets[step === 'kart' ? asset.id as KartId : selection.kartId]} onSelect={onSelect} />)}
    </div>
    <div className="selection-roster-caption"><span className="selection-line" /><p>{step === 'racer' ? 'Big personalities. Your starting line.' : 'Find your favorite silhouette.'}<small>All appearances. All the same great handling.</small></p></div>
  </section>;
}
