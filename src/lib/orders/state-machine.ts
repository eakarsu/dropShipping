export const ORDER_STATES = [
  "draft", "reserved", "payment_pending", "paid", "payment_failed",
  "partially_fulfilled", "fulfilled", "delivered", "cancelled",
  "refund_pending", "refunded", "refund_failed", "exception",
] as const;

export type OrderState = (typeof ORDER_STATES)[number];
export type OrderAction =
  | "reserve" | "begin_payment" | "payment_succeeded" | "payment_failed"
  | "fulfill" | "deliver" | "cancel" | "request_refund"
  | "refund_succeeded" | "refund_failed" | "flag_exception" | "recover";

const FIXED: Partial<Record<OrderState, Partial<Record<OrderAction, OrderState>>>> = {
  draft: { reserve: "reserved", cancel: "cancelled", flag_exception: "exception" },
  reserved: { begin_payment: "payment_pending", cancel: "cancelled", flag_exception: "exception" },
  payment_pending: { payment_succeeded: "paid", payment_failed: "payment_failed", flag_exception: "exception" },
  payment_failed: { reserve: "reserved", cancel: "cancelled", flag_exception: "exception" },
  paid: { fulfill: "partially_fulfilled", request_refund: "refund_pending", flag_exception: "exception" },
  partially_fulfilled: { fulfill: "partially_fulfilled", request_refund: "refund_pending", flag_exception: "exception" },
  fulfilled: { deliver: "delivered", request_refund: "refund_pending", flag_exception: "exception" },
  delivered: { request_refund: "refund_pending", flag_exception: "exception" },
  refund_pending: { refund_succeeded: "refunded", refund_failed: "refund_failed", flag_exception: "exception" },
  refund_failed: { request_refund: "refund_pending", flag_exception: "exception" },
};

const RECOVERABLE: OrderState[] = ["draft", "reserved", "payment_failed", "paid", "partially_fulfilled", "fulfilled"];

export function nextOrderState(
  current: OrderState,
  action: OrderAction,
  context: { allFulfilled?: boolean; recoveryState?: OrderState } = {},
): OrderState {
  if (action === "recover") {
    if (current !== "exception" || !context.recoveryState || !RECOVERABLE.includes(context.recoveryState)) {
      throw new OrderTransitionError(current, action);
    }
    return context.recoveryState;
  }
  const next = FIXED[current]?.[action];
  if (!next) throw new OrderTransitionError(current, action);
  if (action === "fulfill" && context.allFulfilled) return "fulfilled";
  return next;
}

export class OrderTransitionError extends Error {
  readonly code = "INVALID_ORDER_TRANSITION";
  constructor(state: string, action: string) {
    super(`Cannot apply ${action} while order is ${state}`);
  }
}
