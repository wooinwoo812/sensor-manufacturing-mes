import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import {
  Button,
  ConfirmDialog,
  DataTable,
  Input,
  type DataTableColumn,
} from "./index";

test("loading 버튼은 중복 실행을 차단하고 진행 상태를 읽어준다", () => {
  render(<Button loading>저장</Button>);

  const button = screen.getByRole("button", { name: "처리 중" });
  expect(button).toBeDisabled();
});

test("로딩 표시가 버튼 내용의 자리를 없애거나 폭을 추가하지 않는다", () => {
  const view = render(<Button>현황 새로고침</Button>);
  const label = screen.getByText("현황 새로고침");
  const button = screen.getByRole("button");
  view.rerender(<Button loading>현황 새로고침</Button>);
  expect(screen.getByRole("button", { name: "처리 중" })).toBe(button);
  expect(label).toBeInTheDocument();
  expect(label).toHaveClass("invisible");
  expect(button.querySelector("svg")).toHaveClass("absolute");
  expect(button).toHaveAttribute("aria-busy", "true");
});
test("asChild 버튼은 단일 링크 요소에 동작과 스타일을 위임한다", () => {
  render(
    <Button asChild>
      <a href="/dashboard">운영 대시보드로 이동</a>
    </Button>,
  );

  expect(
    screen.getByRole("link", { name: "운영 대시보드로 이동" }),
  ).toHaveAttribute("href", "/dashboard");
});

test("입력 오류를 label과 설명으로 연결한다", () => {
  render(
    <Input
      label="부적합 사유"
      defaultValue="짧은 사유"
      error="20자 이상 입력해 주세요."
    />,
  );

  const input = screen.getByRole("textbox", { name: "부적합 사유" });
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription("20자 이상 입력해 주세요.");
});

test("위험 대화상자는 제목과 설명을 읽고 Escape로 닫힌다", async () => {
  const user = userEvent.setup();

  render(
    <ConfirmDialog
      danger
      title="생산 LOT를 폐기할까요?"
      description="폐기 사유가 감사이력에 기록됩니다."
      confirmLabel="폐기 확정"
      trigger={<Button variant="danger">위험 행동</Button>}
    />,
  );

  await user.click(screen.getByRole("button", { name: "위험 행동" }));

  expect(
    screen.getByRole("dialog", { name: "생산 LOT를 폐기할까요?" }),
  ).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("빈 업무 표는 caption과 복구 문맥을 유지한다", () => {
  interface Row {
    id: string;
  }

  const columns: DataTableColumn<Row>[] = [
    { key: "id", align: "left", header: "번호", cell: (row) => row.id },
  ];

  render(
    <DataTable
      caption="작업지시 목록"
      columns={columns}
      emptyMessage="조건에 맞는 작업지시가 없습니다."
      getRowKey={(row) => row.id}
      rows={[]}
    />,
  );

  expect(
    screen.getByRole("table", { name: "작업지시 목록" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("조건에 맞는 작업지시가 없습니다."),
  ).toBeInTheDocument();
});

test("확정 대화상자의 callback은 명시적 확인에서만 실행된다", async () => {
  const user = userEvent.setup();
  const onConfirm = vi.fn();

  render(
    <ConfirmDialog
      title="작업지시를 릴리스할까요?"
      description="revision snapshot이 고정됩니다."
      confirmLabel="릴리스"
      onConfirm={onConfirm}
      trigger={<Button>릴리스 준비</Button>}
    />,
  );

  await user.click(screen.getByRole("button", { name: "릴리스 준비" }));
  await user.click(screen.getByRole("button", { name: "릴리스" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
