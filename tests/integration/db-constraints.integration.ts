import {
  CertificateRequestStatus,
  CertificateRole,
  CourseOfferingStatus,
  CourseRoleType,
  GlobalRole,
  GradeVisibility,
  PollStatus,
  PollType,
  PrismaClient,
  QuestionType,
  SemesterStatus,
  SurveyType,
  UserStatus
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const prisma = new PrismaClient();
const runId = `db-constraints-${Date.now()}-${randomUUID().slice(0, 8)}`;

let professorId: string;
let studentId: string;
let semesterId: string;
let courseId: string;
let courseOfferingId: string;

async function expectDbRejection(action: Promise<unknown>) {
  await expect(action).rejects.toThrow();
}

async function createGradeFixture() {
  const category = await prisma.gradeCategory.create({
    data: {
      courseOfferingId,
      createdById: professorId,
      name: `${runId}-category-${randomUUID()}`,
      weight: 40,
      maxScore: 100,
      visibility: GradeVisibility.STAFF_ONLY
    }
  });
  const item = await prisma.gradeItem.create({
    data: {
      courseOfferingId,
      categoryId: category.id,
      createdById: professorId,
      title: `${runId}-item-${randomUUID()}`,
      maxScore: 20,
      visibility: GradeVisibility.STAFF_ONLY
    }
  });

  return { category, item };
}

beforeAll(async () => {
  const professor = await prisma.user.create({
    data: {
      email: `${runId}-professor@example.test`,
      name: "DB Constraint Professor",
      passwordHash: "test-password-hash",
      globalRole: GlobalRole.PROFESSOR,
      status: UserStatus.ACTIVE,
      emailVerified: new Date()
    }
  });
  const student = await prisma.user.create({
    data: {
      email: `${runId}-student@example.test`,
      name: "DB Constraint Student",
      passwordHash: "test-password-hash",
      globalRole: GlobalRole.STUDENT,
      status: UserStatus.ACTIVE,
      emailVerified: new Date()
    }
  });
  const semester = await prisma.semester.create({
    data: {
      title: `${runId} semester`,
      code: `${runId}-sem`,
      startsAt: new Date("2026-09-01T00:00:00.000Z"),
      endsAt: new Date("2027-01-15T00:00:00.000Z"),
      status: SemesterStatus.ACTIVE
    }
  });
  const course = await prisma.course.create({
    data: {
      code: `${runId}-course`,
      title: "Database Constraint Testing"
    }
  });
  const offering = await prisma.courseOffering.create({
    data: {
      courseId: course.id,
      semesterId: semester.id,
      professorId: professor.id,
      status: CourseOfferingStatus.ACTIVE
    }
  });

  professorId = professor.id;
  studentId = student.id;
  semesterId = semester.id;
  courseId = course.id;
  courseOfferingId = offering.id;
}, 30_000);

afterAll(async () => {
  await prisma.courseOffering.deleteMany({ where: { id: courseOfferingId } });
  await prisma.course.deleteMany({ where: { id: courseId } });
  await prisma.semester.deleteMany({ where: { id: semesterId } });
  await prisma.user.deleteMany({ where: { id: { in: [professorId, studentId].filter(Boolean) } } });
  await prisma.$disconnect();
});

describe("database integrity constraints", () => {
  it("rejects invalid date ranges for semesters and office-hour sessions", async () => {
    const startsAt = new Date("2026-10-10T10:00:00.000Z");
    const endsAt = new Date("2026-10-10T09:00:00.000Z");

    await expectDbRejection(
      prisma.semester.create({
        data: {
          title: `${runId}-invalid-semester`,
          code: `${runId}-invalid-semester`,
          startsAt,
          endsAt,
          status: SemesterStatus.DRAFT
        }
      })
    );

    await expectDbRejection(
      prisma.officeHourSession.create({
        data: {
          courseOfferingId,
          createdById: professorId,
          hostId: professorId,
          title: `${runId}-invalid-office-hour`,
          startsAt,
          endsAt
        }
      })
    );
  });

  it("rejects invalid grade bounds at the database layer", async () => {
    const { category, item } = await createGradeFixture();

    await expectDbRejection(
      prisma.gradeCategory.create({
        data: {
          courseOfferingId,
          createdById: professorId,
          name: `${runId}-bad-weight`,
          weight: 101,
          maxScore: 100
        }
      })
    );
    await expectDbRejection(
      prisma.gradeCategory.create({
        data: {
          courseOfferingId,
          createdById: professorId,
          name: `${runId}-bad-category-max`,
          weight: 10,
          maxScore: 0
        }
      })
    );
    await expectDbRejection(
      prisma.gradeItem.create({
        data: {
          courseOfferingId,
          categoryId: category.id,
          createdById: professorId,
          title: `${runId}-bad-item-max`,
          maxScore: 0
        }
      })
    );
    await expectDbRejection(
      prisma.gradeRecord.create({
        data: {
          gradeItemId: item.id,
          studentId,
          editedById: professorId,
          score: -1
        }
      })
    );
    await expectDbRejection(
      prisma.gradeRecord.create({
        data: {
          gradeItemId: item.id,
          studentId,
          editedById: professorId,
          score: 21
        }
      })
    );

    const record = await prisma.gradeRecord.create({
      data: {
        gradeItemId: item.id,
        studentId,
        editedById: professorId,
        score: 18
      }
    });
    await expectDbRejection(
      prisma.gradeRecord.update({
        where: { id: record.id },
        data: { score: 21 }
      })
    );
    await expectDbRejection(
      prisma.gradeItem.update({
        where: { id: item.id },
        data: { maxScore: 17 }
      })
    );
  });

  it("enforces active-only uniqueness while preserving history", async () => {
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        courseOfferingId,
        studentId
      }
    });

    await expectDbRejection(
      prisma.courseEnrollment.create({
        data: {
          courseOfferingId,
          studentId
        }
      })
    );

    await prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: { droppedAt: new Date() }
    });
    await expect(
      prisma.courseEnrollment.create({
        data: {
          courseOfferingId,
          studentId
        }
      })
    ).resolves.toBeTruthy();

    const role = await prisma.courseRoleAssignment.create({
      data: {
        courseOfferingId,
        userId: studentId,
        assignedById: professorId,
        role: CourseRoleType.TA
      }
    });
    await expectDbRejection(
      prisma.courseRoleAssignment.create({
        data: {
          courseOfferingId,
          userId: studentId,
          assignedById: professorId,
          role: CourseRoleType.TA
        }
      })
    );
    await prisma.courseRoleAssignment.update({
      where: { id: role.id },
      data: { revokedAt: new Date(), revokedById: professorId }
    });
    await expect(
      prisma.courseRoleAssignment.create({
        data: {
          courseOfferingId,
          userId: studentId,
          assignedById: professorId,
          role: CourseRoleType.TA
        }
      })
    ).resolves.toBeTruthy();
  });

  it("treats nullable course-offering section values as unique keys", async () => {
    await expectDbRejection(
      prisma.courseOffering.create({
        data: {
          courseId,
          semesterId,
          professorId,
          status: CourseOfferingStatus.ACTIVE
        }
      })
    );
  });

  it("deduplicates anonymous poll votes by respondent hash", async () => {
    const poll = await prisma.availabilityPoll.create({
      data: {
        courseOfferingId,
        createdById: professorId,
        title: `${runId}-poll`,
        pollType: PollType.CUSTOM,
        deadline: new Date("2026-12-01T00:00:00.000Z"),
        isAnonymous: true,
        status: PollStatus.OPEN
      }
    });
    const firstOption = await prisma.pollOption.create({
      data: {
        pollId: poll.id,
        label: "First"
      }
    });
    const secondOption = await prisma.pollOption.create({
      data: {
        pollId: poll.id,
        label: "Second",
        orderIndex: 1
      }
    });

    await prisma.pollVote.create({
      data: {
        pollId: poll.id,
        optionId: firstOption.id,
        respondentHash: `${runId}-anonymous-voter`
      }
    });
    await expectDbRejection(
      prisma.pollVote.create({
        data: {
          pollId: poll.id,
          optionId: secondOption.id,
          respondentHash: `${runId}-anonymous-voter`
        }
      })
    );
  });

  it("deduplicates survey answers by question and respondent hash", async () => {
    const survey = await prisma.survey.create({
      data: {
        courseOfferingId,
        createdById: professorId,
        title: `${runId}-survey`,
        type: SurveyType.CUSTOM,
        isAnonymous: true,
        opensAt: new Date("2026-10-01T00:00:00.000Z"),
        closesAt: new Date("2026-12-01T00:00:00.000Z")
      }
    });
    const question = await prisma.surveyQuestion.create({
      data: {
        surveyId: survey.id,
        text: "How was it?",
        type: QuestionType.TEXT
      }
    });

    await prisma.surveyAnswer.create({
      data: {
        surveyId: survey.id,
        questionId: question.id,
        respondentHash: `${runId}-survey-voter`,
        valueJson: { text: "first" }
      }
    });
    await expectDbRejection(
      prisma.surveyAnswer.create({
        data: {
          surveyId: survey.id,
          questionId: question.id,
          respondentHash: `${runId}-survey-voter`,
          valueJson: { text: "second" }
        }
      })
    );
  });

  it("allows a new certificate request only after the active one reaches a terminal status", async () => {
    const request = await prisma.certificateRequest.create({
      data: {
        userId: studentId,
        courseOfferingId,
        role: CertificateRole.TA,
        status: CertificateRequestStatus.SUBMITTED
      }
    });

    await expectDbRejection(
      prisma.certificateRequest.create({
        data: {
          userId: studentId,
          courseOfferingId,
          role: CertificateRole.TA,
          status: CertificateRequestStatus.DRAFT
        }
      })
    );

    await prisma.certificateRequest.update({
      where: { id: request.id },
      data: { status: CertificateRequestStatus.REJECTED }
    });
    await expect(
      prisma.certificateRequest.create({
        data: {
          userId: studentId,
          courseOfferingId,
          role: CertificateRole.TA,
          status: CertificateRequestStatus.SUBMITTED
        }
      })
    ).resolves.toBeTruthy();
  });

  it("allows only one open regrade request per grade record and student", async () => {
    const { item } = await createGradeFixture();
    const record = await prisma.gradeRecord.create({
      data: {
        gradeItemId: item.id,
        studentId,
        editedById: professorId,
        score: 15
      }
    });
    const firstRequest = await prisma.regradeRequest.create({
      data: {
        gradeRecordId: record.id,
        studentId,
        reason: "Please review this grade."
      }
    });

    await expectDbRejection(
      prisma.regradeRequest.create({
        data: {
          gradeRecordId: record.id,
          studentId,
          reason: "Duplicate open request."
        }
      })
    );

    await prisma.regradeRequest.update({
      where: { id: firstRequest.id },
      data: { status: "REJECTED", resolvedAt: new Date(), respondedById: professorId }
    });
    await expect(
      prisma.regradeRequest.create({
        data: {
          gradeRecordId: record.id,
          studentId,
          reason: "New request after terminal response."
        }
      })
    ).resolves.toBeTruthy();
  });
});
