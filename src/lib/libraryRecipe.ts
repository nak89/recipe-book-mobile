import type { Step } from '@/types/recipe'

export function numberLibrarySteps(steps: string[]): Step[] {
  return steps.map((instruction, index) => ({ instruction, stepNumber: index + 1 }))
}
