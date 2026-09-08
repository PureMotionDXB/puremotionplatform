-- Removes the throwaway test client accounts created while verifying
-- the booking system and signup form. Cascades to their clients/bookings rows.
delete from auth.users
where email like 'pm-test-female%@mailinator.com'
   or email like 'pm-waitlist-test-%@mailinator.com'
   or email like 'pm-signup-test-%@mailinator.com'
   or email like 'pm-layout-test-%@mailinator.com'
   or email like 'pm-security-check-%@mailinator.com'
   or email = 'pm-lockdown-check@mailinator.com';
