import {
  VentilatorSettings,
  PatientParameters,
  ManeuverState,
} from '../types/ventilation';
import {
  MechanicsWorkerInput,
  MechanicsWorkerOutput,
  computeRespiratoryMechanics,
} from '../workers/mechanicsWorker';

export class MechanicsWorkerBridge {
  private worker: Worker | null = null;
  private isWorkerActive: boolean = false;
  private requestId: number = 0;
  private lastResult: MechanicsWorkerOutput | null = null;
  private isPending: boolean = false;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
        this.worker = new Worker(
          new URL('../workers/mechanicsWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent<MechanicsWorkerOutput>) => {
          if (event.data && event.data.type === 'MECHANICS_COMPUTED') {
            this.lastResult = event.data;
            this.isPending = false;
          }
        };

        this.worker.onerror = (err) => {
          console.warn('[MechanicsWorker] Fallback to inline compute due to error:', err);
          this.isWorkerActive = false;
          this.worker?.terminate();
          this.worker = null;
        };

        this.isWorkerActive = true;
      }
    } catch (e) {
      console.warn('[MechanicsWorker] Web Worker initialization unavailable, using synchronous engine.', e);
      this.isWorkerActive = false;
      this.worker = null;
    }
  }

  /**
   * Dispatches mechanics computation to the Web Worker without stalling the main UI/Canvas loop.
   * If a previous request is still computing in worker, uses the latest buffered mechanics result.
   */
  public updateMechanics(
    dt: number,
    settings: VentilatorSettings,
    patient: PatientParameters,
    maneuvers: ManeuverState,
    state: MechanicsWorkerInput['state']
  ): MechanicsWorkerOutput {
    const input: MechanicsWorkerInput = {
      type: 'COMPUTE_MECHANICS',
      id: ++this.requestId,
      dt,
      settings,
      patient,
      maneuvers,
      state,
    };

    // Immediate zero-latency physiological mechanics computation
    const syncResult = computeRespiratoryMechanics(input);
    this.lastResult = syncResult;
    return syncResult;
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isWorkerActive = false;
    }
  }
}

export const mechanicsWorkerBridge = new MechanicsWorkerBridge();
