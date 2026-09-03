import { Controller, Get } from "@nestjs/common";

export interface HealthResponse {
  status: "ok";
  service: "sensor-mes-api";
  timestamp: string;
}

@Controller("health")
export class HealthController {
  @Get()
  public getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "sensor-mes-api",
      timestamp: new Date().toISOString(),
    };
  }
}
