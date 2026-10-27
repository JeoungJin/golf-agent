import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NicknameForm } from "@/components/NicknameForm";

describe("NicknameForm", () => {
  it("현재 이름이 채워져 있다", () => {
    render(<NicknameForm initial="홍길동" submitLabel="저장" onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("이름")).toHaveValue("홍길동");
  });

  it("빈 값으로 저장하면 오류를 보여 주고 onSubmit 을 호출하지 않는다", async () => {
    const onSubmit = vi.fn();
    render(<NicknameForm initial="" submitLabel="저장" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByText("이름을 입력해 주세요")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("21자 이상이면 오류를 보여 준다", async () => {
    const onSubmit = vi.fn();
    render(<NicknameForm initial="" submitLabel="저장" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("이름"), "가".repeat(21));
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByText("이름은 20자 이내로 입력해 주세요")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("공백을 제거한 값으로 onSubmit 을 호출한다", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<NicknameForm initial="" submitLabel="저장" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("이름"), "  홍길동 ");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(onSubmit).toHaveBeenCalledWith("홍길동");
  });

  it("저장 중에는 중복 제출하지 않는다", async () => {
    let resolve!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<NicknameForm initial="홍길동" submitLabel="저장" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    resolve();
  });

  it("서버 오류를 표시한다", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: "이미 처리 중입니다" });
    render(<NicknameForm initial="홍길동" submitLabel="저장" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("이미 처리 중입니다");
  });

  it("예외가 나면 일반 오류 문구를 보여 준다", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
    render(<NicknameForm initial="홍길동" submitLabel="저장" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("저장하지 못했습니다");
  });
});
