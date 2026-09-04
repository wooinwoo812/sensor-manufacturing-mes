import { useEffect, useState } from "react";
import {
  fetchMaterialLots,
  type MaterialLotListItem,
} from "@/entities/material-lot";
import {
  fetchMaterialReservations,
  releaseMaterialAllocation,
  reserveMaterial,
  type MaterialReservationView,
} from "../api/material-reservations";
import { ApiRequestError } from "@/shared/api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from "@/shared/ui";

interface MaterialReservationPanelProps {
  workOrderId: string;
  orderNumber: string;
  csrfToken: string;
  canReserve: boolean;
  canRelease: boolean;
  isReleased: boolean;
}

export function MaterialReservationPanel({
  workOrderId,
  orderNumber,
  csrfToken,
  canReserve,
  canRelease,
  isReleased,
}: MaterialReservationPanelProps) {
  const [reservations, setReservations] = useState<MaterialReservationView[] | null>(
    null,
  );
  const [availableLots, setAvailableLots] = useState<MaterialLotListItem[]>([]);
  const [lotId, setLotId] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [pending, setPending] = useState<"reserve" | `release:${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetchMaterialReservations(workOrderId, controller.signal)
      .then((rows) => {
        if (!active) {
          return;
        }
        setReservations(rows);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setReservations([]);
      });
    if (canReserve) {
      fetchMaterialLots(new URLSearchParams("availability=available"), controller.signal)
        .then((result) => {
          if (!active) {
            return;
          }
          setAvailableLots(result.items);
          setLotId((current) => current || (result.items[0]?.id ?? ""));
        })
        .catch(() => {
          if (!active) {
            return;
          }
          setAvailableLots([]);
        });
    }
    return () => {
      active = false;
      controller.abort();
    };
  }, [workOrderId, canReserve]);

  async function runReserve() {
    if (lotId === "" || pending !== null) {
      return;
    }
    setPending("reserve");
    setError(null);
    try {
      const rows = await reserveMaterial(
        workOrderId,
        { materialLotId: lotId, quantity: Number(quantity) },
        csrfToken,
      );
      setReservations(rows);
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiRequestError ? cause.message : "예약하지 못했습니다.",
      );
    } finally {
      setPending(null);
    }
  }

  async function runRelease(allocationId: string) {
    if (pending !== null) {
      return;
    }
    setPending(`release:${allocationId}`);
    setError(null);
    try {
      const rows = await releaseMaterialAllocation(allocationId, csrfToken);
      setReservations(rows);
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiRequestError ? cause.message : "해제하지 못했습니다.",
      );
    } finally {
      setPending(null);
    }
  }

  const activeCount =
    reservations?.filter((row) => row.status === "ACTIVE").length ?? 0;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle>
          <h3>자재 예약</h3>
        </CardTitle>
        <CardDescription>
          {`활성 예약 ${activeCount}건 · 발행 상태에서만 예약할 수 있습니다 (${orderNumber}).`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5 py-4">
        {reservations === null ? (
          <p className="text-sm text-text-muted" role="status">
            예약을 확인하는 중입니다.
          </p>
        ) : reservations.length === 0 ? (
          <p className="text-sm text-text-muted" role="status">
            아직 예약된 자재가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {reservations.map((row) => (
              <li
                className="flex flex-wrap items-center justify-between gap-2 py-3"
                key={row.id}
              >
                <span className="flex flex-wrap items-center gap-3">
                  <span className="text-xs tabular-nums font-bold">{row.lotNumber}</span>
                  <span className="text-sm">
                    {row.materialName} ({row.materialCode})
                  </span>
                  <span className="text-sm tabular-nums font-semibold tabular-nums">
                    {row.quantity.toLocaleString("ko-KR")} {row.unit}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={row.status === "ACTIVE" ? "info" : "neutral"}>
                    {row.status === "ACTIVE" ? "활성" : "종료"}
                  </Badge>
                  {row.status === "ACTIVE" && canRelease ? (
                    <Button
                      variant="secondary"
                      loading={pending === `release:${row.id}`}
                      onClick={() => void runRelease(row.id)}
                    >
                      해제
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}

        {canReserve ? (
          isReleased ? (
            <div className="rounded-panel border border-border bg-surface p-4">
              <p className="text-sm font-semibold">자재 LOT 예약</p>
              <p className="mt-1 text-xs text-text-muted">
                가용 자재 LOT만 선택할 수 있고 예약량은 가용 수량 안에서 검증됩니다.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="min-w-64 flex-1">
                  <Select
                    label="자재 LOT"
                    options={availableLots.map((lot) => ({
                      label: `${lot.materialName} ${lot.lotNumber} (가용 ${lot.availableQuantity})`,
                      value: lot.id,
                    }))}
                    value={lotId}
                    onValueChange={setLotId}
                  />
                </div>
                <div className="w-28">
                  <Input
                    id="reserve-quantity"
                    label="수량"
                    min={1}
                    name="reserveQuantity"
                    onChange={(event) => setQuantity(event.target.value)}
                    type="number"
                    value={quantity}
                  />
                </div>
                <Button
                  disabled={lotId === "" || pending !== null}
                  loading={pending === "reserve"}
                  onClick={() => void runReserve()}
                >
                  예약
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              발행 상태가 아니면 예약할 수 없습니다. 현재 상태를 확인해 주세요.
            </p>
          )
        ) : (
          <p className="text-xs text-text-muted">
            예약·해제는 자재 담당자 권한(material-allocation:create/release)이
            필요합니다. 현재 역할로는 예약 현황을 조회할 수 있습니다.
          </p>
        )}

        {error !== null ? (
          <p className="rounded-panel border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger-strong">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
