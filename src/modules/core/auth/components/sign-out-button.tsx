import { LogOut } from 'lucide-react';
import { SubmitButton } from '@/components/form/submit-button';
import { signOutAction } from '../actions';

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <SubmitButton variant="outline" className={className} pendingLabel="로그아웃하는 중…">
        <LogOut aria-hidden />
        로그아웃
      </SubmitButton>
    </form>
  );
}
