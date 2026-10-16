import { PageSkeleton } from '@/components/page-skeleton';

// 설정 메뉴로 오거나 메뉴 안에서 화면을 옮길 때 누르자마자 보여 주는 뼈대
export default function Loading() {
  // 하위 화면(내 정보 · 구성원)은 제목이 달라서 제목 자리도 뼈대로 둔다
  return <PageSkeleton />;
}
