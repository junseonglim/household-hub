import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // <Link href>와 router.push()에 존재하지 않는 경로를 쓰면 타입 오류로 알려 준다
  typedRoutes: true,
  // 개발 모드 표시(N 버튼)가 휴대폰 하단 탭을 가리지 않도록 오른쪽 위로 옮긴다
  devIndicators: { position: 'top-right' },
};

export default nextConfig;
