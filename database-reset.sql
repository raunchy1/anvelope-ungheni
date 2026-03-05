-- Reset and Clean Database Script
-- Use this in Supabase SQL Editor to wipe out all data and reset incrementing keys

DELETE FROM service_records;
DELETE FROM clienti;
DELETE FROM masini;
DELETE FROM hotel_anvelope;
DELETE FROM stock_movements;
DELETE FROM stocuri;

ALTER SEQUENCE clienti_id_seq RESTART WITH 1;
ALTER SEQUENCE masini_id_seq RESTART WITH 1;
ALTER SEQUENCE service_records_id_seq RESTART WITH 1;
ALTER SEQUENCE hotel_anvelope_id_seq RESTART WITH 1;
ALTER SEQUENCE stocuri_id_seq RESTART WITH 1;
ALTER SEQUENCE stock_movements_id_seq RESTART WITH 1;
