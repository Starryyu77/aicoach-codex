export type PoseMockInput = {
  exercise: string;
  media: string;
};

export function poseMock(input: PoseMockInput) {
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

