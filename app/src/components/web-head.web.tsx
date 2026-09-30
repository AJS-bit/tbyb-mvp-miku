// 웹 문서 제목·설명: 플랫폼(tbyb · 태그라인)과 첫 비교팩(MacBook Air · Pro)을 나눠 부른다.
import Head from 'expo-router/head';

import { FIRST_PACK, TAGLINE, WORDMARK } from '@/lib/brand';

export function WebHead() {
  return (
    <Head>
      <title>{`${WORDMARK} — ${FIRST_PACK} 데모 앱`}</title>
      <meta name="description" content={`${WORDMARK} · ${TAGLINE} ${FIRST_PACK}: MacBook Air · MacBook Pro 14형. 시연용 데모 — 입력한 내용은 이 기기에만 저장돼요.`} />
    </Head>
  );
}
