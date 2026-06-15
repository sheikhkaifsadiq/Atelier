import { costFor, getCredits } from "../services/billing.service.js";

/**
 * Reject with 402 when the user can't afford this interaction type.
 * Actual deduction happens AFTER the AI call succeeds.
 */
export const requireCredits = (type) => async (req, res, next) => {
  try {
    const cost = costFor(type);
    const balance = await getCredits(req.user.userId);
    if (balance < cost) {
      return res.status(402).json({
        message: "Insufficient credits",
        balance,
        required: cost,
        type,
      });
    }
    req.creditCost = cost;
    req.creditType = type;
    next();
  } catch (err) {
    next(err);
  }
};
