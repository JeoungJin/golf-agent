import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PendingMemberList } from "@/components/PendingMemberList";

const members = [
  { id: "m1", nickname: "홍길동", createdAt: "2026-10-26T03:00:00Z" },
  { id: "m2", nickname: "김철수", createdAt: "2026-10-27T05:30:00Z" },
];

describe("PendingMemberList", () => {
  it("닉네임과 신청 시각(KST)을 표시한다", () => {
    render(<PendingMemberList members={members} onApprove={vi.fn()} onReject={vi.fn()} />);

    const first = screen.getByText("홍길동").closest("li")!;
    expect(first).toHaveTextContent("오후 12:00"); // 03:00Z = KST 12:00
    expect(screen.getByText("김철수")).toBeInTheDocument();
  });

  it("승인 버튼은 해당 회원 id 로 onApprove 를 호출한다", async () => {
    const onApprove = vi.fn();
    render(<PendingMemberList members={members} onApprove={onApprove} onReject={vi.fn()} />);

    const row = screen.getByText("김철수").closest("li")!;
    await userEvent.click(within(row).getByRole("button", { name: "승인" }));
    expect(onApprove).toHaveBeenCalledWith("m2");
  });

  it("거절 버튼은 해당 회원 id 로 onReject 를 호출한다", async () => {
    const onReject = vi.fn();
    render(<PendingMemberList members={members} onApprove={vi.fn()} onReject={onReject} />);

    const row = screen.getByText("홍길동").closest("li")!;
    await userEvent.click(within(row).getByRole("button", { name: "거절" }));
    expect(onReject).toHaveBeenCalledWith("m1");
  });

  it("목록이 비면 안내 문구를 표시한다", () => {
    render(<PendingMemberList members={[]} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText("대기 중인 신청이 없습니다")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("처리 중에는 중복 클릭을 막는다", async () => {
    let resolve!: () => void;
    const onApprove = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    render(<PendingMemberList members={members} onApprove={onApprove} onReject={vi.fn()} />);

    const row = screen.getByText("홍길동").closest("li")!;
    const button = within(row).getByRole("button", { name: "승인" });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onApprove).toHaveBeenCalledTimes(1);
    resolve();
  });
});
