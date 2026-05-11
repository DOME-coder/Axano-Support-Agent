import { redirect } from 'next/navigation';

// Root just bounces to /avatar; middleware will redirect to /login
// if there is no valid session cookie.

export default function HomePage() {
  redirect('/avatar');
}
