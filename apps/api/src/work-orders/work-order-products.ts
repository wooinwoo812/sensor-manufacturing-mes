export interface DemoProduct {
  code: string;
  name: string;
  unit: string;
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  { code: "SEN-IR-640", name: "적외선 센서 모듈 640px", unit: "EA" },
  { code: "SEN-XR-1280", name: "X선 검출기 패널 1280px", unit: "EA" },
  { code: "SEN-IR-320-QC", name: "적외선 코어 320px QC 버전", unit: "EA" },
];
