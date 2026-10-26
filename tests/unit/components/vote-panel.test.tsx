import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VotePanel } from "@/components/VotePanel";

const base = {
  status: null,
  waitPosition: null,
  blockReason: null,
  onVote: vi.fn().mockResolvedValue(undefined),
  onWithdraw: vi.fn().mockResolvedValue(undefined),
} as const;

describe("VotePanel 상태 표시", () => {
  it("아직 투표하지 않았으면 안내와 참석·불참 버튼만 보인다", () => {
    render(<VotePanel {...base} />);
    expect(screen.getByText("아직 투표하지 않았습니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "참석" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "불참" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "투표 철회" })).not.toBeInTheDocument();
  });

  it("참석이면 '참석 확정', 대기면 순번, 불참이면 '불참'을 보여 주고 철회 버튼이 생긴다", () => {
    const { rerender } = render(<VotePanel {...base} status="attending" />);
    expect(screen.getByText("참석 확정")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "참석" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "투표 철회" })).toBeInTheDocument();

    rerender(<VotePanel {...base} status="waiting" waitPosition={2} />);
    expect(screen.getByText("대기 2번")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "참석" })).toHaveAttribute("aria-pressed", "true");

    rerender(<VotePanel {...base} status="declined" />);
    expect(screen.getByRole("status")).toHaveTextContent("불참");
    expect(screen.getByRole("button", { name: "불참" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "참석" })).toHaveAttribute("aria-pressed", "false");
  });

  it("마감되면 버튼 없이 마감 안내와 내 상태만 보인다", () => {
    render(<VotePanel {...base} status="attending" blockReason="closed" />);
    expect(screen.getByText("투표가 마감되었습니다")).toBeInTheDocument();
    expect(screen.getByText("참석 확정")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("취소된 라운딩이면 버튼 없이 취소 안내가 보인다", () => {
    render(<VotePanel {...base} blockReason="cancelled" />);
    expect(screen.getByText("취소된 라운딩입니다")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("VotePanel 동작", () => {
  it("참석·불참 버튼이 선택을 전달한다", async () => {
    const onVote = vi.fn().mockResolvedValue(undefined);
    render(<VotePanel {...base} onVote={onVote} />);

    await userEvent.click(screen.getByRole("button", { name: "참석" }));
    expect(onVote).toHaveBeenLastCalledWith("attend");
    await userEvent.click(screen.getByRole("button", { name: "불참" }));
    expect(onVote).toHaveBeenLastCalledWith("decline");
  });

  it("철회 버튼이 onWithdraw 를 호출한다", async () => {
    const onWithdraw = vi.fn().mockResolvedValue(undefined);
    render(<VotePanel {...base} status="declined" onWithdraw={onWithdraw} />);

    await userEvent.click(screen.getByRole("button", { name: "투표 철회" }));
    expect(onWithdraw).toHaveBeenCalledTimes(1);
  });

  it("처리 중에는 모든 버튼을 비활성화해 중복 요청을 막는다", async () => {
    let resolve!: () => void;
    const onVote = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<VotePanel {...base} status="attending" onVote={onVote} />);

    await userEvent.click(screen.getByRole("button", { name: "불참" }));
    for (const name of ["참석", "불참", "투표 철회"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
    await userEvent.click(screen.getByRole("button", { name: "참석" }));
    expect(onVote).toHaveBeenCalledTimes(1);

    resolve();
    expect(await screen.findByRole("button", { name: "참석" })).toBeEnabled();
  });

  it("서버가 오류를 돌려주면 메시지를 보여 주고 다시 시도할 수 있다", async () => {
    const onVote = vi.fn().mockResolvedValue({ error: "이미 시작한 라운딩이라 변경할 수 없습니다" });
    render(<VotePanel {...base} onVote={onVote} />);

    await userEvent.click(screen.getByRole("button", { name: "참석" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("이미 시작한 라운딩");
    expect(screen.getByRole("button", { name: "참석" })).toBeEnabled();
  });

  it("요청이 예외로 실패해도 한국어 오류를 보여 주고 철회도 같은 방식으로 처리한다", async () => {
    const onVote = vi.fn().mockRejectedValue(new Error("network"));
    const onWithdraw = vi.fn().mockRejectedValue(new Error("network"));
    render(<VotePanel {...base} status="attending" onVote={onVote} onWithdraw={onWithdraw} />);

    await userEvent.click(screen.getByRole("button", { name: "불참" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("처리하지 못했습니다");

    await userEvent.click(screen.getByRole("button", { name: "투표 철회" }));
    expect(onWithdraw).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("alert")).toHaveTextContent("처리하지 못했습니다");
  });

  it("다음 요청이 성공하면 이전 오류 메시지를 지운다", async () => {
    const onVote = vi
      .fn()
      .mockResolvedValueOnce({ error: "처리하지 못했습니다" })
      .mockResolvedValueOnce(undefined);
    render(<VotePanel {...base} onVote={onVote} />);

    await userEvent.click(screen.getByRole("button", { name: "참석" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "참석" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
