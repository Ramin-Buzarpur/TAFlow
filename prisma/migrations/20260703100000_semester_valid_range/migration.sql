-- Semester was the only date-ranged model still missing a DB-level range
-- check (OfficeHourSession, Interview and AcademicCalendarEvent already
-- have one from the integrity_constraints migration).
ALTER TABLE "Semester" ADD CONSTRAINT "semester_valid_range" CHECK ("endsAt" > "startsAt");
