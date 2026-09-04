const seoulStartOfToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return Date.parse(`${parts}T00:00:00+09:00`);
};

const dayOffset = (days: number, hour = 10) =>
  new Date(seoulStartOfToday() + days * 86_400_000 + hour * 3_600_000);

export interface DemoQualityIncident {
  incidentNumber: string;
  title: string;
  sourceType: "MATERIAL_LOT" | "PRODUCTION_LOT" | "FINISHED_UNIT";
  sourceLotNumber: string;
  description: string | null;
  status: "OPEN" | "ASSESSED" | "CONTAINED" | "CLOSED";
  detectedAt: Date;
  resolvedAt: Date | null;
}

export const DEMO_QUALITY_INCIDENTS: DemoQualityIncident[] = [
  {
    incidentNumber: "QI-2026-0701",
    title: "TE 쿨링 모듈 열전달 성능 편차 의심",
    sourceType: "MATERIAL_LOT",
    sourceLotNumber: "ML-2026-0323",
    description:
      "공정 중 온도 상승 예상치 벗어남. 동일 LOT 전량 사용 중단 후 격리 조사 중.",
    status: "OPEN",
    detectedAt: dayOffset(-1, 14),
    resolvedAt: null,
  },
  {
    incidentNumber: "QI-2026-0688",
    title: "세라믹 패키지 표면 미세 균열 신고",
    sourceType: "MATERIAL_LOT",
    sourceLotNumber: "ML-2026-0322",
    description: "현장 작업자 신고. 영향 범위 평가 완료, 재검토 결과 대기 중.",
    status: "CONTAINED",
    detectedAt: dayOffset(-6, 11),
    resolvedAt: null,
  },
  {
    incidentNumber: "QI-2026-0651",
    title: "신호 커넥터 접점 불량 사후 발견",
    sourceType: "MATERIAL_LOT",
    sourceLotNumber: "ML-2026-0332",
    description: "조립 공정 불량 원인 추적에서 접점 도금 불량 확인. 잔량 폐기 처분 완료.",
    status: "CLOSED",
    detectedAt: dayOffset(-18, 16),
    resolvedAt: dayOffset(-14, 15),
  },
];
