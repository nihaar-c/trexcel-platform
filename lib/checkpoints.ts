export const CHECKPOINT_FORMS: Record<number, string> = {
  1: "https://docs.google.com/forms/d/e/1FAIpQLSegErVPCbNO5X2OWGgaMJXu6JEyb182GNDE1Z92H2KKnY72cA/viewform",
  2: "https://docs.google.com/forms/d/e/1FAIpQLSdGCObfqm6L76_8tSUurQL7KAYUh6qE-V1LrNR2n3hKWvgkVg/viewform",
};

// Checkpoints the admin can check off (3 and 4 have no student form yet).
export const ADMIN_CHECKPOINTS = [1, 2, 3, 4] as const;
