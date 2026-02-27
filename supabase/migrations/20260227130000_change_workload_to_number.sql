-- Change workload from TEXT to DOUBLE PRECISION
ALTER TABLE courses 
ALTER COLUMN workload TYPE DOUBLE PRECISION 
USING (
  CASE 
    WHEN workload ~ '^[0-9]+(\.[0-9]+)?$' THEN workload::DOUBLE PRECISION 
    ELSE NULL 
  END
);
