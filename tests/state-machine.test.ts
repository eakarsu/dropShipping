import { describe, expect, it } from "vitest";
import { nextOrderState, OrderTransitionError } from "@/lib/orders/state-machine";

describe("order state machine", () => {
  it("covers reservation, payment and complete fulfillment", () => {
    expect(nextOrderState("draft", "reserve")).toBe("reserved");
    expect(nextOrderState("reserved", "begin_payment")).toBe("payment_pending");
    expect(nextOrderState("payment_pending", "payment_succeeded")).toBe("paid");
    expect(nextOrderState("paid", "fulfill", { allFulfilled: true })).toBe("fulfilled");
    expect(nextOrderState("fulfilled", "deliver")).toBe("delivered");
  });

  it("keeps partial fulfillment open", () => {
    expect(nextOrderState("paid", "fulfill", { allFulfilled: false })).toBe("partially_fulfilled");
    expect(nextOrderState("partially_fulfilled", "fulfill", { allFulfilled: false })).toBe("partially_fulfilled");
  });

  it("covers refund success and failure", () => {
    expect(nextOrderState("delivered", "request_refund")).toBe("refund_pending");
    expect(nextOrderState("refund_pending", "refund_succeeded")).toBe("refunded");
    expect(nextOrderState("refund_pending", "refund_failed")).toBe("refund_failed");
  });

  it("allows only explicit exception recovery targets", () => {
    expect(nextOrderState("exception", "recover", { recoveryState: "paid" })).toBe("paid");
    expect(() => nextOrderState("exception", "recover", { recoveryState: "refunded" })).toThrow(OrderTransitionError);
  });

  it("rejects invalid and terminal transitions", () => {
    expect(() => nextOrderState("draft", "payment_succeeded")).toThrow(OrderTransitionError);
    expect(() => nextOrderState("cancelled", "reserve")).toThrow(OrderTransitionError);
    expect(() => nextOrderState("refunded", "request_refund")).toThrow(OrderTransitionError);
  });
});
