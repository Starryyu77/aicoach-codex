import type { MovementAssessment } from "../../hermes/types.ts";
import type { ProviderInstance, ProviderTestResult, VisionAssessInput, VisionProvider } from "../types.ts";

export class MockVisionProvider implements VisionProvider {
  readonly instance: ProviderInstance;

  constructor(instance: ProviderInstance) {
    this.instance = instance;
  }

  async assess(input: VisionAssessInput): Promise<MovementAssessment> {
    return {
      event_type: "movement_assessment",
      exercise: input.exercise || "高位下拉",
      assessment: {
        shoulder_elevation: "slightly_high",
        torso_swing: "moderate",
        range_of_motion: "acceptable",
        fatigue_signal: "possible"
      },
      recommendation_needed: true
    };
  }

  async test(): Promise<ProviderTestResult> {
    return {
      ok: true,
      providerId: this.instance.id,
      providerType: this.instance.type,
      message: "Mock Vision provider is available."
    };
  }
}
