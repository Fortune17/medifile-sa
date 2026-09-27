import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://qmtqftidafgzxauqfawg.supabase.co', 'sb_publishable_amEcgiYwJtL0NZkkpzEKBQ_uyeqzW9X');

async function testSignup() {
  console.log("Attempting signup...");
  const { data, error } = await supabase.auth.signUp({
    email: 'test' + Date.now() + '@example.com',
    password: 'password123',
    options: {
      data: {
        role: 'patient',
        first_name: 'Test',
        last_name: 'User',
        id_number: '9901015009087'
      }
    }
  });

  if (error) {
    console.error("Signup failed:", error);
  } else {
    console.log("Signup succeeded:", data);
  }
}

testSignup();
