import { redirect } from 'next/navigation';

// 대시보드가 생기기 전까지는 청소 화면이 첫 화면이다 (docs/03-architecture.md 8절).
export default function Home() {
  redirect('/cleaning');
}
