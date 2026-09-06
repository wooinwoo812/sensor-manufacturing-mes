import { useNavigationSafety } from "@/shared/lib";
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
import { Badge, Button, Panel, Input, Select } from "@/shared/ui";

interface MaterialReservationPanelProps {
  workOrderId: string;
  orderNumber: string;
  csrfToken: string;
  canReserve: boolean;
  canRelease: boolean;
  isReleased: boolean;
  requirements?: readonly { materialCode: string; materialName: string; requiredQuantity: number; unit: string }[];
  onChanged?: () => void;
}

export function MaterialReservationPanel({
  workOrderId,
  orderNumber,
  csrfToken,
  canReserve,
  canRelease,
  isReleased,
  requirements = [],
  onChanged,
}: MaterialReservationPanelProps) {
  const [reservations, setReservations] = useState<
    MaterialReservationView[] | null
  >(null);
  const [availableLots, setAvailableLots] = useState<MaterialLotListItem[]>([]);
  const [lotId, setLotId] = useState("");
  const [lotEdited, setLotEdited] = useState(false);
  const [quantity, setQuantity] = useState("10");
  const [pending, setPending] = useState<
    "reserve" | `release:${string}` | null
  >(null);
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
      fetchMaterialLots(
        new URLSearchParams("availability=available"),
        controller.signal,
      )
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

  useNavigationSafety(quantity !== "10" || lotEdited, pending !== null);

  const eligibleLots = availableLots.filter((lot) => requirements.length === 0 || requirements.some((row) => row.materialCode === lot.materialCode));
  const selectedLot = eligibleLots.find((lot) => lot.id === lotId) ?? eligibleLots[0];
  const required = requirements.find((row) => row.materialCode === selectedLot?.materialCode);
  const reserved = reservations?.filter((row) => row.materialCode === selectedLot?.materialCode && row.status === "ACTIVE").reduce((sum, row) => sum + row.quantity, 0) ?? 0;
  const maxQuantity = Math.min(selectedLot?.availableQuantity ?? 0, required ? Math.max(0, required.requiredQuantity - reserved) : Infinity);
  const validQuantity = quantity.trim() !== "" && Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0 && Number(quantity) <= maxQuantity;

  async function runReserve() {
    if (!selectedLot || !validQuantity || pending !== null) {
      return;
    }
    setPending("reserve");
    setError(null);
    try {
      const rows = await reserveMaterial(
        workOrderId,
        { materialLotId: selectedLot.id, quantity: Number(quantity) },
        csrfToken,
      );
      setReservations(rows);
      setQuantity("10");
      setLotEdited(false);
      onChanged?.();
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "예약하지 못했습니다.",
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
      onChanged?.();
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "해제하지 못했습니다.",
      );
    } finally {
      setPending(null);
    }
  }

  const activeCount =
    reservations?.filter((row) => row.status === "ACTIVE").length ?? 0;

  return (
    <Panel
      title="자재 예약"
      tourAnchor="reservations"
      headingLevel="h3"
      description={isReleased ? `활성 예약 ${activeCount}건 · ${orderNumber}` : `예약부터 투입까지의 기록 · ${orderNumber}`}
      bodyClassName="grid gap-5"
    >
      {requirements.length > 0 ? (
        <div className="rounded-panel border border-border p-3">
          <p className="mb-2 text-sm font-semibold">발행 시 확정된 자재 필요량</p>
          <ul className="space-y-1 text-sm">
            {requirements.map((requirement) => {
              const reserved = reservations?.filter((row) => row.materialCode === requirement.materialCode && row.status === "ACTIVE").reduce((sum, row) => sum + row.quantity, 0) ?? 0;
              const consumed = reservations?.filter(row => row.materialCode === requirement.materialCode && row.closedReason === "FULFILLED").reduce((sum, row) => sum + row.quantity, 0) ?? 0;
              return <li key={requirement.materialCode}>{requirement.materialName} ({requirement.materialCode}) · 필요 {requirement.requiredQuantity} {requirement.unit} / 예약 {reserved} · 투입 {consumed} {requirement.unit}</li>;
            })}
          </ul>
          {isReleased ? <p className="mt-2 text-xs text-text-muted">필요량만큼 예약하면 첫 공정을 시작할 수 있습니다. 예약 자재는 공정 시작 시 투입됩니다.</p> : null}
        </div>
      ) : null}
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
                <span className="text-xs tabular-nums font-bold">
                  {row.lotNumber}
                </span>
                <span className="text-sm">
                  {row.materialName} ({row.materialCode})
                </span>
                <span className="text-sm tabular-nums font-semibold tabular-nums">
                  {row.quantity.toLocaleString("ko-KR")} {row.unit}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={row.status === "ACTIVE" ? "info" : "neutral"}>
                  {row.status === "ACTIVE" ? "활성" : row.closedReason === "FULFILLED" ? "투입 완료" : row.closedReason === "CANCELLED" ? "취소로 해제" : "예약 해제"}
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
          <div className="border-t border-border pt-5">
            <p className="text-sm font-semibold">자재 LOT 예약</p>
            <p className="mt-1 text-xs text-text-muted">
              가용 자재 LOT만 선택할 수 있고 예약량은 가용 수량 안에서
              검증됩니다.
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-0 basis-full">
                <Select
                  label="자재 LOT"
                  tourAnchor="reservation-lot"
                  options={eligibleLots.map((lot) => ({
                    label: `${lot.materialName} ${lot.lotNumber} (가용 ${lot.availableQuantity})`,
                    value: lot.id,
                  }))}
                  value={selectedLot?.id ?? ""}
                  onValueChange={(value) => {
                    setLotId(value);
                    setLotEdited(true);
                  }}
                />
              </div>
              <div className="w-32">
                <Input
                  id="reserve-quantity"
                  data-tour="reservation-quantity"
                  label="수량"
                  min={1}
                  max={maxQuantity}
                  step={1}
                  hint={`현재 예약 가능 ${maxQuantity}개`}
                  name="reserveQuantity"
                  onChange={(event) => setQuantity(event.target.value)}
                  type="number"
                  value={quantity}
                />
              </div>
              <Button
                disabled={!selectedLot || !validQuantity || pending !== null}
                loading={pending === "reserve"}
                onClick={() => void runReserve()}
              >
                예약
              </Button>
            </div>
          </div>
        ) : null
      ) : (
        <p className="text-xs text-text-muted">
          예약·해제는 자재 담당자가 처리합니다. 현재 역할로는 예약 현황을 조회할 수 있습니다.
        </p>
      )}

      {error !== null ? (
        <p className="rounded-panel border border-danger/40 bg-danger-soft/40 px-4 py-3 text-sm text-danger-strong">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}
