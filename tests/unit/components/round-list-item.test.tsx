import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoundListItem } from "@/components/RoundListItem";
import type { Round } from "@/domain/types";

const round: Round = {
  id: "r1",
  kind: "field",
  startsAt: "2026-10-31T04:30:00Z",
  location: "레이크사이드 CC",
  fee: 180000,
  capacity: 8,
  status: "scheduled",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

describe("RoundListItem", () => {
  it("종류·일시·장소·비용·참석 인원을 표시하고 상세로 링크한다", () => {
    render(<RoundListItem round={round} attending={3} />);

    expect(screen.getByText("필드")).toBeInTheDocument();
    expect(screen.getByText("10월 31일(토) 오후 1:30")).toBeInTheDocument();
    expect(screen.getByText("레이크사이드 CC")).toBeInTheDocument();
    expect(screen.getByText("180,000원")).toBeInTheDocument();
    expect(screen.getByText("참석 3/8명")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/rounds/r1");
    expect(screen.queryByText("취소됨")).not.toBeInTheDocument();
  });

  it("정원이 없으면 인원만 표시한다", () => {
    render(<RoundListItem round={{ ...round, capacity: null }} attending={5} />);
    expect(screen.getByText("참석 5명")).toBeInTheDocument();
  });

  it("취소된 라운딩은 '취소됨' 배지를 보여 준다", () => {
    render(<RoundListItem round={{ ...round, status: "cancelled" }} attending={3} />);
    expect(screen.getByText("취소됨")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/rounds/r1");
  });
});
