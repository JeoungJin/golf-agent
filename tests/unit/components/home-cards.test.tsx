import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorRetry } from "@/components/ErrorRetry";
import { NextRoundCard } from "@/components/NextRoundCard";
import { NoticeCard } from "@/components/NoticeCard";
import type { Notice, Round } from "@/domain/types";

const round: Round = {
  id: "r1",
  kind: "field",
  startsAt: "2026-10-31T04:30:00Z",
  location: "레이크사이드 CC",
  fee: 180000,
  capacity: null,
  status: "scheduled",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

const notice: Notice = {
  id: "n1",
  title: "10월 정모 안내",
  body: "이번 달 정모는\n토요일 오후에 진행됩니다.",
  authorId: "u1",
  createdAt: "2026-10-20T00:00:00Z",
  updatedAt: "2026-10-20T00:00:00Z",
};

describe("NextRoundCard", () => {
  it("종류·일시·장소·비용을 표시한다", () => {
    render(<NextRoundCard round={round} />);
    expect(screen.getByText("필드")).toBeInTheDocument();
    expect(screen.getByText("10월 31일(토) 오후 1:30")).toBeInTheDocument();
    expect(screen.getByText("레이크사이드 CC")).toBeInTheDocument();
    expect(screen.getByText("180,000원")).toBeInTheDocument();
  });

  it("라운딩이 없으면 빈 상태 안내를 표시한다", () => {
    render(<NextRoundCard round={null} />);
    expect(screen.getByText("예정된 라운딩이 없습니다")).toBeInTheDocument();
  });

  it("'스크린 목록'·'필드 목록' 버튼으로 종류별 목록에 이동할 수 있다 (라운딩이 없어도)", () => {
    const { unmount } = render(<NextRoundCard round={round} />);
    expect(screen.getByRole("link", { name: "스크린 목록" })).toHaveAttribute(
      "href",
      "/rounds?kind=screen",
    );
    expect(screen.getByRole("link", { name: "필드 목록" })).toHaveAttribute(
      "href",
      "/rounds?kind=field",
    );
    unmount();
    render(<NextRoundCard round={null} />);
    expect(screen.getByRole("link", { name: "스크린 목록" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "필드 목록" })).toBeInTheDocument();
  });
});

describe("NoticeCard", () => {
  it("제목과 본문 요약을 표시하고 상세로 링크한다", () => {
    render(<NoticeCard notice={notice} />);
    expect(screen.getByText("10월 정모 안내")).toBeInTheDocument();
    expect(screen.getByText("이번 달 정모는 토요일 오후에 진행됩니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /10월 정모 안내/ })).toHaveAttribute(
      "href",
      "/notices/n1",
    );
  });

  it("'공지 목록' 버튼으로 전체 공지 목록에 이동할 수 있다", () => {
    render(<NoticeCard notice={notice} />);
    expect(screen.getByRole("link", { name: "공지 목록" })).toHaveAttribute("href", "/notices");
  });

  it("공지가 없으면 빈 상태 안내를 표시한다", () => {
    render(<NoticeCard notice={null} />);
    expect(screen.getByText("등록된 공지가 없습니다")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /공지가 없습니다/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "공지 목록" })).toHaveAttribute("href", "/notices");
  });
});

describe("ErrorRetry", () => {
  it("오류 문구와 다시 시도 버튼을 표시하고 클릭하면 onRetry 를 호출한다", async () => {
    const onRetry = vi.fn();
    render(<ErrorRetry onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("정보를 불러오지 못했습니다");
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
