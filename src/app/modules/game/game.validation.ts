import RequestValidationError from "../../errors/requestValidationError";

export const MAX_SCORE = 100;
// Upper bound for a finished game, in seconds (24 hours).
export const MAX_TIME_SECONDS = 24 * 60 * 60;

export type GameResult = { score: number; time: number };

/** Validates `{ score, time }` from the game. Other body fields are ignored. */
export function parseGameResult(input: unknown): GameResult {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new RequestValidationError({ body: "সঠিক তথ্য পাঠান" });
  const body = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const { score, time } = body;
  if (
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE
  )
    errors.score = `স্কোর ০ থেকে ${MAX_SCORE} এর মধ্যে একটি পূর্ণ সংখ্যা হতে হবে`;
  if (
    typeof time !== "number" ||
    !Number.isFinite(time) ||
    time <= 0 ||
    time > MAX_TIME_SECONDS
  )
    errors.time = "সময় (সেকেন্ড) ০ এর বেশি এবং ২৪ ঘণ্টার কম হতে হবে";
  if (Object.keys(errors).length) throw new RequestValidationError(errors);
  return {
    score: score as number,
    // Millisecond precision is enough to break ties and avoids float noise.
    time: Math.round((time as number) * 1000) / 1000,
  };
}
