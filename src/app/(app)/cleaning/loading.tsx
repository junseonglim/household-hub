import { PageSkeleton } from '@/components/page-skeleton';

// 청소 메뉴로 오거나 메뉴 안에서 화면을 옮길 때 누르자마자 보여 주는 뼈대
export default function Loading() {
  return <PageSkeleton title="청소" tabs={2} />;
}
