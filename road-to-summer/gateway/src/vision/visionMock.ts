import type { MovementAssessment } from "../hermes/types.ts";

export type VisionAssessRequest = {
  exercise: string;
  media: string;
  provider?: "mock";
};

export async function visionMock(request: VisionAssessRequest): Promise<MovementAssessment> {
  return {
    event_type: "movement_assessment",
    exercise: request.exercise || "高位下拉",
    assessment: {
      shoulder_elevation: "slightly_high",
      torso_swing: "moderate",
      range_of_motion: "acceptable",
      fatigue_signal: "possible"
    },
    recommendation_needed: true
  };
}

