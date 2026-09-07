-- Replaces the placeholder seeded schedule with the real weekly timetable.
-- Run this whole block once in Supabase SQL Editor.

delete from classes;
delete from instructors where id in ('leila', 'noor', 'sophie', 'amira');

insert into classes (day, time, name, family, ladies_only, credit_cost, instructor_id, capacity, booked) values
(0, '08:30', 'Reformer Intermediate | Sculpt', 'reformer', false, 1, null, 10, 6),
(0, '09:30', 'Reformer Intermediate | Booty Pump', 'reformer', true, 1, null, 10, 9),
(0, '10:30', 'Reformer All Levels', 'reformer', true, 1, null, 10, 7),
(0, '11:30', 'Reformer All Levels', 'reformer', false, 1, null, 10, 9),
(0, '16:30', 'Reformer Essential', 'reformer', false, 1, null, 10, 4),
(0, '17:30', 'Reformer Intermediate | Sculpt', 'reformer', false, 1, null, 10, 10),
(0, '18:30', 'Reformer Advanced', 'reformer', false, 1, null, 10, 5),
(0, '19:00', 'Deep Stretch | Evening Reset Yoga', 'mat', false, 1, null, 8, 5),

(1, '07:00', 'Reformer Intermediate | Sculpt', 'reformer', false, 1, null, 10, 2),
(1, '08:30', 'Reformer All Levels', 'reformer', false, 1, null, 10, 7),
(1, '09:30', 'Reformer All Levels', 'reformer', true, 1, null, 10, 10),
(1, '10:30', 'Reformer Intermediate | Booty Pump', 'reformer', true, 1, null, 10, 7),
(1, '11:30', 'Reformer Intermediate | Sculpt', 'reformer', false, 1, null, 10, 3),
(1, '16:30', 'Reformer Essential', 'reformer', false, 1, null, 10, 6),
(1, '17:30', 'Reformer All Levels', 'reformer', false, 1, null, 10, 7),
(1, '18:30', 'Reformer Intermediate | Sculpt', 'reformer', false, 1, null, 10, 10),

(2, '07:30', 'Reformer Intermediate | Sculpt', 'reformer', false, 1, null, 10, 1),
(2, '08:30', 'Reformer Intermediate | Sculpt', 'reformer', true, 1, null, 10, 6),
(2, '09:30', 'Reformer All Levels', 'reformer', false, 1, null, 10, 7),
(2, '10:30', 'Reformer Intermediate | Abs & Glutes', 'reformer', true, 1, null, 10, 9),
(2, '11:30', 'Reformer Intermediate | Sculpt', 'reformer', false, 1, null, 10, 1),
(2, '16:30', 'Reformer All Levels', 'reformer', false, 1, null, 10, 4),
(2, '17:30', 'Reformer Intermediate | Sculpt', 'reformer', false, 1, null, 10, 7),
(2, '18:30', 'Reformer Advanced', 'reformer', false, 1, null, 10, 7),
(2, '19:00', 'Deep Stretch | Evening Reset Yoga', 'mat', true, 1, null, 8, 2),

(3, '07:00', 'Reformer Advanced', 'reformer', false, 1, null, 10, 2),
(3, '08:30', 'Reformer Intermediate | Abs & Glutes', 'reformer', true, 1, null, 10, 6),
(3, '09:30', 'Reformer Intermediate | Booty Pump', 'reformer', true, 1, null, 10, 10),
(3, '10:30', 'Reformer All Levels', 'reformer', false, 1, null, 10, 8),
(3, '11:30', 'Reformer All Levels', 'reformer', true, 1, null, 10, 3),
(3, '16:30', 'Reformer All Levels', 'reformer', false, 1, null, 10, 3),
(3, '17:30', 'Reformer Intermediate | Abs & Glutes', 'reformer', true, 1, null, 10, 5),
(3, '18:30', 'Reformer Intermediate | Sculpt', 'reformer', false, 1, null, 10, 4),

(4, '07:00', 'Reformer Intermediate | Sculpt', 'reformer', false, 1, null, 10, 3),
(4, '08:00', 'Full Body Burn | Mat Pilates', 'mat', true, 1, null, 8, 0),
(4, '08:30', 'Reformer Advanced', 'reformer', false, 1, null, 10, 6),
(4, '09:30', 'Reformer Essential', 'reformer', false, 1, null, 10, 5),
(4, '10:30', 'Reformer Intermediate | Sculpt', 'reformer', false, 1, null, 10, 1),
(4, '11:30', 'Reformer Intermediate | Booty Pump', 'reformer', true, 1, null, 10, 5),
(4, '12:30', 'Reformer Intermediate | Sculpt', 'reformer', false, 1, null, 10, 4),
(4, '13:30', 'Reformer All Levels', 'reformer', true, 1, null, 10, 1),
(4, '17:00', 'Sound Healing', 'mat', false, 1, null, 10, 4),

(5, '08:30', 'Reformer Intermediate | Sculpt', 'reformer', false, 1, null, 10, 5),
(5, '09:30', 'Reformer Intermediate | Abs & Glutes', 'reformer', true, 1, null, 10, 2),
(5, '10:30', 'Reformer All Levels', 'reformer', false, 1, null, 10, 6),
(5, '11:30', 'Reformer All Levels', 'reformer', true, 1, null, 10, 3),
(5, '12:30', 'Reformer Intermediate | Booty & Core', 'reformer', false, 1, null, 10, 1),
(5, '13:30', 'Reformer All Levels', 'reformer', false, 1, null, 10, 2),

(6, '08:30', 'Reformer Intermediate | Booty & Core', 'reformer', false, 1, null, 10, 4),
(6, '09:30', 'Reformer All Levels', 'reformer', false, 1, null, 10, 3),
(6, '10:30', 'Reformer Intermediate | Sculpt', 'reformer', true, 1, null, 10, 1),
(6, '11:30', 'Reformer All Levels', 'reformer', false, 1, null, 10, 2);
