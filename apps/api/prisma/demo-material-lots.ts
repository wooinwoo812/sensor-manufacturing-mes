const seoulStartOfToday = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return Date.parse(`${parts}T00:00:00+09:00`);
};

const dayOffset = (days: number, hour = 9) =>
  new Date(seoulStartOfToday() + days * 86_400_000 + hour * 3_600_000);

export interface DemoMaterial {
  code: string;
  name: string;
  unit: string;
}

export const DEMO_MATERIALS: DemoMaterial[] = [
  { code: "SEN-MAT-014", name: "적외선 감지 다이오드 어레이", unit: "EA" },
  { code: "SEN-MAT-021", name: "세라믹 패키지", unit: "EA" },
  { code: "SEN-MAT-032", name: "TE 쿨링 모듈", unit: "EA" },
  { code: "SEN-MAT-045", name: "신호 커넥터", unit: "EA" },
];

export interface DemoMaterialLot {
  lotNumber: string;
  materialCode: string;
  receivedQuantity: number;
  onHand: number;
  reservedQuantity: number;
  consumedQuantity: number;
  scrappedQuantity: number;
  qualityDisposition: "PENDING" | "ACCEPTED" | "HOLD" | "QUARANTINED" | "REJECTED";
  expiresAt: Date | null;
  receivedAt: Date;
}

export const DEMO_MATERIAL_LOTS: DemoMaterialLot[] = [
  {
    lotNumber: "ML-2026-0301",
    materialCode: "SEN-MAT-014",
    receivedQuantity: 500,
    onHand: 320,
    reservedQuantity: 120,
    consumedQuantity: 180,
    scrappedQuantity: 0,
    qualityDisposition: "ACCEPTED",
    expiresAt: dayOffset(45),
    receivedAt: dayOffset(-20),
  },
  {
    lotNumber: "ML-2026-0302",
    materialCode: "SEN-MAT-014",
    receivedQuantity: 300,
    onHand: 300,
    reservedQuantity: 300,
    consumedQuantity: 0,
    scrappedQuantity: 0,
    qualityDisposition: "ACCEPTED",
    expiresAt: dayOffset(38),
    receivedAt: dayOffset(-12),
  },
  {
    lotNumber: "ML-2026-0303",
    materialCode: "SEN-MAT-014",
    receivedQuantity: 200,
    onHand: 200,
    consumedQuantity: 0,
    reservedQuantity: 0,
    scrappedQuantity: 0,
    qualityDisposition: "ACCEPTED",
    expiresAt: dayOffset(-2),
    receivedAt: dayOffset(-40),
  },
  {
    lotNumber: "ML-2026-0311",
    materialCode: "SEN-MAT-021",
    receivedQuantity: 800,
    onHand: 640,
    reservedQuantity: 90,
    consumedQuantity: 160,
    scrappedQuantity: 0,
    qualityDisposition: "ACCEPTED",
    expiresAt: dayOffset(120),
    receivedAt: dayOffset(-15),
  },
  {
    lotNumber: "ML-2026-0312",
    materialCode: "SEN-MAT-021",
    receivedQuantity: 400,
    onHand: 400,
    reservedQuantity: 0,
    consumedQuantity: 0,
    scrappedQuantity: 0,
    qualityDisposition: "PENDING",
    expiresAt: dayOffset(120),
    receivedAt: dayOffset(-2),
  },
  {
    lotNumber: "ML-2026-0321",
    materialCode: "SEN-MAT-032",
    receivedQuantity: 150,
    onHand: 96,
    reservedQuantity: 40,
    consumedQuantity: 54,
    scrappedQuantity: 0,
    qualityDisposition: "ACCEPTED",
    expiresAt: dayOffset(15),
    receivedAt: dayOffset(-25),
  },
  {
    lotNumber: "ML-2026-0322",
    materialCode: "SEN-MAT-032",
    receivedQuantity: 150,
    onHand: 150,
    reservedQuantity: 0,
    consumedQuantity: 0,
    scrappedQuantity: 0,
    qualityDisposition: "HOLD",
    expiresAt: dayOffset(15),
    receivedAt: dayOffset(-8),
  },
  {
    lotNumber: "ML-2026-0323",
    materialCode: "SEN-MAT-032",
    receivedQuantity: 100,
    onHand: 100,
    reservedQuantity: 0,
    consumedQuantity: 0,
    scrappedQuantity: 0,
    qualityDisposition: "QUARANTINED",
    expiresAt: dayOffset(10),
    receivedAt: dayOffset(-30),
  },
  {
    lotNumber: "ML-2026-0331",
    materialCode: "SEN-MAT-045",
    receivedQuantity: 1000,
    onHand: 410,
    reservedQuantity: 260,
    consumedQuantity: 590,
    scrappedQuantity: 0,
    qualityDisposition: "ACCEPTED",
    expiresAt: null,
    receivedAt: dayOffset(-60),
  },
  {
    lotNumber: "ML-2026-0332",
    materialCode: "SEN-MAT-045",
    receivedQuantity: 500,
    onHand: 0,
    reservedQuantity: 0,
    consumedQuantity: 480,
    scrappedQuantity: 20,
    qualityDisposition: "REJECTED",
    expiresAt: null,
    receivedAt: dayOffset(-55),
  },
];
