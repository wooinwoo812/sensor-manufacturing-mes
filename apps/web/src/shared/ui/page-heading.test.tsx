import { fireEvent, render, screen } from "@testing-library/react";
import { PageHeading } from "./page-heading";

it("행동과 부가 정보가 없는 제목은 빈 보조 열을 만들지 않는다", () => {
  const { container } = render(
    <PageHeading title="작업지시" description="목록을 확인합니다." />,
  );
  expect(container.querySelector("header")!.children).toHaveLength(1);
  expect(
    screen.getByRole("heading", { level: 1, name: "작업지시" }),
  ).toBeInTheDocument();
});
it("행동과 부가 정보는 하나의 보조 열에 묶고 돌아가기를 제공한다", () => {
  const onBack = vi.fn();
  const { container } = render(
    <PageHeading
      title="작업 상세"
      description="상태를 확인합니다."
      actions={<button>자재 예약</button>}
      meta="참고 정보"
      back={{ label: "목록으로", onClick: onBack }}
    />,
  );
  expect(container.querySelector("header")!.children).toHaveLength(2);
  expect(
    screen
      .getByRole("button", { name: "자재 예약" })
      .closest('[data-tour="page-actions"]'),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(onBack).toHaveBeenCalledOnce();
});
