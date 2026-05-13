import { visionMock, type VisionAssessRequest } from "./visionMock.ts";
import type { MovementAssessment } from "../hermes/types.ts";

export type { VisionAssessRequest };

export async function assessMovement(request: VisionAssessRequest): Promise<MovementAssessment> {
  if (!request.provider || request.provider === "mock") {
    return visionMock(request);
  }
  throw new Error("Only mock vision provider is wired in v1.");
}
