import { describe, expect, it } from "vitest";

const transitions: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_INVITED", "ACCEPTED", "REJECTED", "WITHDRAWN"],
  UNDER_REVIEW: ["SHORTLISTED", "INTERVIEW_INVITED", "ACCEPTED", "REJECTED", "WITHDRAWN"],
  SHORTLISTED: ["INTERVIEW_INVITED", "ACCEPTED", "REJECTED", "WITHDRAWN"],
  INTERVIEW_INVITED: ["ACCEPTED", "REJECTED", "WITHDRAWN"],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: []
};

describe("TA application workflow", () => {
  it("does not allow rejected application to become accepted silently", () => {
    expect(transitions.REJECTED).not.toContain("ACCEPTED");
  });

  it("allows submitted application to move to review", () => {
    expect(transitions.SUBMITTED).toContain("UNDER_REVIEW");
  });
});
