SELECT id, name, code, status FROM schools;
SELECT id, name, code, status FROM academic_years;
SELECT id, name, code, sequence, status FROM terms;
SELECT id, name, code, level, status FROM classes;
SELECT id, name, code, status FROM subjects;
SELECT id, admission_number, first_name, last_name, status FROM students;
SELECT id, name, type, max_marks, weight, status FROM assessments;
SELECT id, score, entered FROM assessment_marks LIMIT 5;
