import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoundForm } from "@/components/RoundForm";

async function fillValid() {
  await userEvent.click(screen.getByLabelText("스크린"));
  fireEvent.change(screen.getByLabelText("티오프 일시"), { target: { value: "2099-01-01T10:00" } });
  await userEvent.type(screen.getByLabelText("장소"), "  강남 스크린골프 ");
  await userEvent.clear(screen.getByLabelText("비용(원)"));
  await userEvent.type(screen.getByLabelText("비용(원)"), "25000");
}

describe("RoundForm", () => {
  it("빈 값으로 제출하면 항목별 오류를 보여 주고 onSubmit 을 호출하지 않는다", async () => {
    const onSubmit = vi.fn();
    render(<RoundForm submitLabel="등록" onSubmit={onSubmit} />);
    expect(screen.getByLabelText("스크린")).toBeChecked();
    expect(screen.getByLabelText("필드")).not.toBeChecked();

    await userEvent.click(screen.getByRole("button", { name: "등록" }));

    expect(screen.queryByText("종류를 선택해 주세요")).not.toBeInTheDocument();
    expect(screen.getByText("티오프 일시를 입력해 주세요")).toBeInTheDocument();
    expect(screen.getByText("티오프 일시를 입력해 주세요")).toBeInTheDocument();
    expect(screen.getByText("장소를 입력해 주세요")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("과거 일시는 오류를 보여 준다", async () => {
    const onSubmit = vi.fn();
    render(<RoundForm submitLabel="등록" onSubmit={onSubmit} />);
    await fillValid();
    fireEvent.change(screen.getByLabelText("티오프 일시"), { target: { value: "2000-01-01T10:00" } });

    await userEvent.click(screen.getByRole("button", { name: "등록" }));

    expect(screen.getByText("티오프 일시는 현재 이후여야 합니다")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("유효한 값은 정규화해서 onSubmit 에 전달하고 정원을 비우면 null 이다", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RoundForm submitLabel="등록" onSubmit={onSubmit} />);
    await fillValid();

    await userEvent.click(screen.getByRole("button", { name: "등록" }));

    expect(onSubmit).toHaveBeenCalledWith({
      kind: "screen",
      startsAt: "2099-01-01T01:00:00.000Z",
      location: "강남 스크린골프",
      fee: 25000,
      capacity: null,
    });
  });

  it("정원을 입력하면 숫자로 전달한다", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RoundForm submitLabel="등록" onSubmit={onSubmit} />);
    await fillValid();
    await userEvent.type(screen.getByLabelText("정원(선택)"), "8");

    await userEvent.click(screen.getByRole("button", { name: "등록" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ capacity: 8 }));
  });

  it("서버가 오류를 돌려주면 메시지를 보여 주고 다시 제출할 수 있다", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: "저장하지 못했습니다" });
    render(<RoundForm submitLabel="등록" onSubmit={onSubmit} />);
    await fillValid();

    await userEvent.click(screen.getByRole("button", { name: "등록" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("저장하지 못했습니다");
    expect(screen.getByRole("button", { name: "등록" })).toBeEnabled();
  });

  it("onSubmit 이 예외를 던져도 한국어 오류를 보여 준다", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("network"));
    render(<RoundForm submitLabel="등록" onSubmit={onSubmit} />);
    await fillValid();

    await userEvent.click(screen.getByRole("button", { name: "등록" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("저장하지 못했습니다");
  });

  it("제출 중에는 버튼을 비활성화해 중복 제출을 막는다", async () => {
    let resolve!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<RoundForm submitLabel="등록" onSubmit={onSubmit} />);
    await fillValid();

    const button = screen.getByRole("button", { name: "등록" });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    resolve();
  });
});
