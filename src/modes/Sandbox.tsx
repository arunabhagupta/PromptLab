import { Composer } from './Composer';
import { Transport } from './Transport';
import { PipelineCanvas } from '../pipeline/Canvas';

export function Sandbox() {
  return (
    <>
      <div className="sandbox">
        <Composer />
        <PipelineCanvas />
      </div>
      <Transport />
    </>
  );
}
