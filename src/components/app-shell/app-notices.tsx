import { KeyRound, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';

/** 모든 화면 위쪽에 띄우는 안내 (임시 비밀번호, 가입 승인 대기) */
export function AppNotices({
  mustChangePassword,
  pendingCount,
}: {
  mustChangePassword: boolean;
  pendingCount: number;
}) {
  if (!mustChangePassword && pendingCount === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-2">
      {mustChangePassword && (
        <Alert>
          <KeyRound aria-hidden />
          <AlertDescription>
            <span>
              임시 비밀번호로 로그인했어요.{' '}
              <Link href="/settings/profile" className="font-medium text-foreground underline">
                비밀번호를 바꿔 주세요
              </Link>
            </span>
          </AlertDescription>
        </Alert>
      )}
      {pendingCount > 0 && (
        <Alert>
          <UserPlus aria-hidden />
          <AlertDescription>
            <span>
              가입 승인을 기다리는 사람이 {pendingCount}명 있어요.{' '}
              <Link href="/settings/household" className="font-medium text-foreground underline">
                확인하기
              </Link>
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
