export enum ExerciseAttributeValueEnum {
  ABDOMINALS = "ABDOMINALS",
  BACK = "BACK",
  BICEPS = "BICEPS",
  CALVES = "CALVES",
  CHEST = "CHEST",
  FOREARMS = "FOREARMS",
  GLUTES = "GLUTES",
  HAMSTRINGS = "HAMSTRINGS",
  OBLIQUES = "OBLIQUES",
  QUADRICEPS = "QUADRICEPS",
  SHOULDERS = "SHOULDERS",
  TRAPS = "TRAPS",
  TRICEPS = "TRICEPS"
}

export type MuscleKey = ExerciseAttributeValueEnum;

export const MUSCLE_LABELS: Record<MuscleKey, string> = {
  [ExerciseAttributeValueEnum.ABDOMINALS]: "腹部",
  [ExerciseAttributeValueEnum.BACK]: "背部",
  [ExerciseAttributeValueEnum.BICEPS]: "二头肌",
  [ExerciseAttributeValueEnum.CALVES]: "小腿",
  [ExerciseAttributeValueEnum.CHEST]: "胸部",
  [ExerciseAttributeValueEnum.FOREARMS]: "前臂",
  [ExerciseAttributeValueEnum.GLUTES]: "臀部",
  [ExerciseAttributeValueEnum.HAMSTRINGS]: "腘绳肌",
  [ExerciseAttributeValueEnum.OBLIQUES]: "腹斜肌",
  [ExerciseAttributeValueEnum.QUADRICEPS]: "股四头肌",
  [ExerciseAttributeValueEnum.SHOULDERS]: "肩部",
  [ExerciseAttributeValueEnum.TRAPS]: "斜方肌",
  [ExerciseAttributeValueEnum.TRICEPS]: "三头肌"
};

export function formatMuscleSelection(muscles: MuscleKey[]): string {
  return muscles.map((muscle) => MUSCLE_LABELS[muscle]).join("、");
}
