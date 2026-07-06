-- Enforce the grade score upper bound at the database layer.
-- Grade records must never exceed the related grade item's maxScore, and a
-- grade item's maxScore cannot be lowered beneath any already-stored score.

CREATE OR REPLACE FUNCTION "enforce_grade_record_score_bound"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  item_max_score numeric;
BEGIN
  SELECT "maxScore" INTO item_max_score
  FROM "GradeItem"
  WHERE "id" = NEW."gradeItemId";

  IF NEW."score" > item_max_score THEN
    RAISE EXCEPTION 'Score cannot exceed grade item max score'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "grade_record_score_bound" ON "GradeRecord";
CREATE TRIGGER "grade_record_score_bound"
BEFORE INSERT OR UPDATE OF "gradeItemId", "score"
ON "GradeRecord"
FOR EACH ROW
EXECUTE FUNCTION "enforce_grade_record_score_bound"();

CREATE OR REPLACE FUNCTION "prevent_grade_item_max_score_reduction"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."maxScore" < OLD."maxScore" AND EXISTS (
    SELECT 1
    FROM "GradeRecord"
    WHERE "gradeItemId" = OLD."id"
      AND "score" > NEW."maxScore"
  ) THEN
    RAISE EXCEPTION 'Grade item max score cannot be lowered below existing grade records'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "grade_item_max_score_guard" ON "GradeItem";
CREATE TRIGGER "grade_item_max_score_guard"
BEFORE UPDATE OF "maxScore"
ON "GradeItem"
FOR EACH ROW
EXECUTE FUNCTION "prevent_grade_item_max_score_reduction"();
