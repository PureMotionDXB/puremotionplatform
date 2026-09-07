-- Removes the throwaway test client accounts created while verifying
-- the booking system. Cascades to their clients/bookings rows.
delete from auth.users
where email like 'pm-test-female%@mailinator.com'
   or email like 'pm-waitlist-test-%@mailinator.com';
