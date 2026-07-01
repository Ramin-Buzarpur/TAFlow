import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/auth/password";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword("Admin@12345678");

  const department = await prisma.department.upsert({
    where: { code: "EE" },
    update: {},
    create: { code: "EE", name: "دانشکده مهندسی برق" }
  });

  const semester = await prisma.semester.upsert({
    where: { code: "1405-01" },
    update: {},
    create: {
      code: "1405-01",
      title: "نیمسال اول ۱۴۰۵",
      startsAt: new Date("2026-09-23T00:00:00.000Z"),
      endsAt: new Date("2027-01-20T00:00:00.000Z"),
      status: "ACTIVE"
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.edu" },
    update: {},
    create: {
      name: "مدیر آموزش",
      email: "admin@example.edu",
      emailVerified: new Date(),
      passwordHash,
      globalRole: "SYSTEM_ADMIN",
      status: "ACTIVE"
    }
  });

  const professor = await prisma.user.upsert({
    where: { email: "rezai@example.edu" },
    update: {},
    create: {
      name: "دکتر علی رضایی",
      email: "rezai@example.edu",
      emailVerified: new Date(),
      passwordHash,
      globalRole: "PROFESSOR",
      status: "ACTIVE",
      professorProfile: {
        create: {
          departmentId: department.id,
          academicRank: "استادیار",
          officeLocation: "ساختمان برق، اتاق ۲۰۷"
        }
      }
    }
  });

  const student = await prisma.user.upsert({
    where: { email: "student@example.edu" },
    update: {},
    create: {
      name: "سارا احمدی",
      email: "student@example.edu",
      emailVerified: new Date(),
      passwordHash,
      globalRole: "STUDENT",
      status: "ACTIVE",
      studentProfile: {
        create: {
          departmentId: department.id,
          studentNumber: "405123456",
          entryYear: 1403,
          degreeLevel: "کارشناسی",
          gpa: 18.45
        }
      }
    }
  });

  const headTa = await prisma.user.upsert({
    where: { email: "headta@example.edu" },
    update: {},
    create: {
      name: "امیرحسین نادری",
      email: "headta@example.edu",
      emailVerified: new Date(),
      passwordHash,
      globalRole: "STUDENT",
      status: "ACTIVE",
      studentProfile: {
        create: {
          departmentId: department.id,
          studentNumber: "403987654",
          entryYear: 1402,
          degreeLevel: "کارشناسی",
          gpa: 19.1
        }
      }
    }
  });

  const course = await prisma.course.upsert({
    where: { code: "EE-201" },
    update: {},
    create: {
      departmentId: department.id,
      code: "EE-201",
      title: "مدارهای الکتریکی ۱",
      units: 3,
      description: "درس پایه مدارهای الکتریکی برای مهندسی برق."
    }
  });

  const offering = await prisma.courseOffering.upsert({
    where: {
      courseId_semesterId_professorId_section: {
        courseId: course.id,
        semesterId: semester.id,
        professorId: professor.id,
        section: "01"
      }
    },
    update: {},
    create: {
      courseId: course.id,
      semesterId: semester.id,
      professorId: professor.id,
      section: "01",
      capacity: 80,
      status: "ACTIVE"
    }
  });

  await prisma.courseRoleAssignment.upsert({
    where: { courseOfferingId_userId_role: { courseOfferingId: offering.id, userId: professor.id, role: "PROFESSOR" } },
    update: {},
    create: { courseOfferingId: offering.id, userId: professor.id, role: "PROFESSOR", assignedById: admin.id }
  });

  await prisma.courseRoleAssignment.upsert({
    where: { courseOfferingId_userId_role: { courseOfferingId: offering.id, userId: headTa.id, role: "HEAD_TA" } },
    update: {},
    create: { courseOfferingId: offering.id, userId: headTa.id, role: "HEAD_TA", assignedById: professor.id }
  });

  await prisma.courseEnrollment.upsert({
    where: { courseOfferingId_studentId: { courseOfferingId: offering.id, studentId: student.id } },
    update: {},
    create: { courseOfferingId: offering.id, studentId: student.id }
  });

  await prisma.courseRoleAssignment.upsert({
    where: { courseOfferingId_userId_role: { courseOfferingId: offering.id, userId: student.id, role: "STUDENT" } },
    update: {},
    create: { courseOfferingId: offering.id, userId: student.id, role: "STUDENT", assignedById: admin.id }
  });

  await prisma.tAOpportunity.create({
    data: {
      courseOfferingId: offering.id,
      createdById: professor.id,
      title: "جذب TA و Head TA برای مدارهای الکتریکی ۱",
      description: "ثبت درخواست برای همکاری آموزشی در نیمسال جاری.",
      requiredTAs: 4,
      needsHeadTA: true,
      requirements: "نمره درس حداقل ۱۷، توانایی حل تمرین و پاسخ‌گویی منظم.",
      deadline: new Date("2026-10-10T20:30:00.000Z"),
      status: "PUBLISHED",
      publishedAt: new Date()
    }
  });

  await prisma.officeHourSession.create({
    data: {
      courseOfferingId: offering.id,
      createdById: headTa.id,
      hostId: headTa.id,
      title: "جلسه رفع اشکال مدارهای الکتریکی ۱",
      startsAt: new Date("2026-10-04T10:30:00.000Z"),
      endsAt: new Date("2026-10-04T12:00:00.000Z"),
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      status: "SCHEDULED"
    }
  });



  const category = await prisma.gradeCategory.upsert({
    where: { courseOfferingId_name: { courseOfferingId: offering.id, name: "تمرین‌ها" } },
    update: {},
    create: { courseOfferingId: offering.id, createdById: professor.id, name: "تمرین‌ها", weight: 30, maxScore: 100 }
  });

  const gradeItem = await prisma.gradeItem.upsert({
    where: { courseOfferingId_title: { courseOfferingId: offering.id, title: "تمرین سری ۱" } },
    update: {},
    create: { courseOfferingId: offering.id, categoryId: category.id, createdById: headTa.id, title: "تمرین سری ۱", maxScore: 20, visibility: "PUBLISHED" }
  });

  await prisma.gradeRecord.upsert({
    where: { gradeItemId_studentId: { gradeItemId: gradeItem.id, studentId: student.id } },
    update: {},
    create: { gradeItemId: gradeItem.id, studentId: student.id, editedById: headTa.id, score: 18.5, feedback: "حل خوب و مرتب", status: "PUBLISHED", publishedAt: new Date() }
  });

  await prisma.announcement.create({
    data: { createdById: professor.id, courseOfferingId: offering.id, title: "تمدید مهلت ثبت درخواست TA", body: "مهلت ثبت درخواست تا پایان هفته تمدید شد.", priority: "important", publishedAt: new Date() }
  });

  await prisma.academicCalendarEvent.create({
    data: { createdById: admin.id, semesterId: semester.id, title: "مهلت حذف اضطراری", startsAt: new Date("2026-11-20T00:00:00.000Z"), eventType: "deadline", isImportant: true }
  });

  const thread = await prisma.messageThread.create({
    data: { courseOfferingId: offering.id, createdById: student.id, type: "COURSE_GENERAL", subject: "سؤال درباره تمرین سری ۱", participants: { create: [{ userId: student.id }, { userId: headTa.id }] }, messages: { create: { senderId: student.id, body: "سلام، در سوال دوم تمرین سری ۱ نیاز به راهنمایی دارم." } } }
  });

  const survey = await prisma.survey.create({
    data: { courseOfferingId: offering.id, createdById: professor.id, title: "ارزشیابی میان‌ترم TA", description: "بازخورد کوتاه درباره عملکرد TA", type: "TA_MIDTERM", isAnonymous: true, minResponses: 3, opensAt: new Date("2026-10-01T00:00:00.000Z"), closesAt: new Date("2026-12-01T00:00:00.000Z"), questions: { create: [{ text: "کیفیت توضیح TA را ارزیابی کنید.", type: "RATING", orderIndex: 0 }] } }
  });

  await prisma.availabilityPoll.create({
    data: { courseOfferingId: offering.id, createdById: headTa.id, title: "انتخاب زمان جلسه رفع اشکال", pollType: "OFFICE_HOUR_TIME", deadline: new Date("2026-10-02T20:30:00.000Z"), status: "OPEN", options: { create: [{ label: "شنبه ۱۴ تا ۱۵", orderIndex: 0 }, { label: "یکشنبه ۱۶ تا ۱۷", orderIndex: 1 }] } }
  });

  await prisma.notification.create({ data: { userId: student.id, type: "ANNOUNCEMENT", title: "اطلاعیه جدید درس", body: "تمدید مهلت ثبت درخواست TA", href: "/announcements" } });

  console.log({ admin: admin.email, professor: professor.email, student: student.email, headTa: headTa.email, password: "Admin@12345678", courseOfferingId: offering.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
