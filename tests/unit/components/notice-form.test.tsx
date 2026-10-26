import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NoticeForm } from "@/components/NoticeForm";

describe("NoticeForm", () => {
  it("빈 값으로 제출하면 오류를 보여 주고 onSubmit 을 호출하지 않는다", async () => {
    const onSubmit = vi.fn();
    render(<NoticeForm submitLabel="등록" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "등록" }));

    expect(screen.getByText("제목을 입력해 주세요")).toBeInTheDocument();
    expect(screen.getByText("내용을 입력해 주세요")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("유효한 값은 공백을 정리해 onSubmit 에 전달한다", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<NoticeForm submitLabel="등록" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("제목"), "  정모 안내 ");
    await userEvent.type(screen.getByLabelText("내용"), "토요일 1시");
    await userEvent.click(screen.getByRole("button", { name: "등록" }));

    expect(onSubmit).toHaveBeenCalledWith({ title: "정모 안내", body: "토요일 1시" });
  });

  it("초기값을 채워서 보여 준다", () => {
    render(
      <NoticeForm
        submitLabel="저장"
        initial={{ title: "기존 제목", body: "기존 내용" }}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("제목")).toHaveValue("기존 제목");
    expect(screen.getByLabelText("내용")).toHaveValue("기존 내용");
  });

  it("서버가 오류를 돌려주면 메시지를 보여 주고 다시 제출할 수 있다", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: "저장하지 못했습니다" });
    render(<NoticeForm submitLabel="저장" initial={{ title: "제목", body: "내용" }} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("저장하지 못했습니다");
    expect(screen.getByRole("button", { name: "저장" })).toBeEnabled();
  });

  it("제출 중에는 버튼을 비활성화해 중복 제출을 막는다", async () => {
    let resolve!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<NoticeForm submitLabel="저장" initial={{ title: "제목", body: "내용" }} onSubmit={onSubmit} />);

    const button = screen.getByRole("button", { name: "저장" });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    resolve();
  });
});
