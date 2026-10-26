/**
 * 동시 투표 테스트: 화면 없이 RPC 를 병렬 호출해 정원 초과가 생기지 않는지 확인한다.
 * 라운딩 행 잠금이 같은 라운딩의 투표를 직렬화하는지 검증하는 것이 목적이다.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import {
  admin,
  createApprovedMember,
  createTestUser,
  daysFromNow,
  resetDatabase,
  seedRound,
  type TestUser,
} from "./helpers/session";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function clientFor(user: TestUser) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw error;
  return client;
}

async function countStatuses(roundId: string) {
  const { data, error } = await admin().from("round_votes").select("status").eq("round_id", roundId);
  if (error) throw error;
  const rows = data as { status: string }[];
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  return { attending: count("attending"), waiting: count("waiting"), declined: count("declined") };
}

test.beforeEach(async () => {
  await resetDatabase();
});

test("정원 2 라운딩에 5명이 동시에 참석을 신청해도 참석은 정확히 2명이다 (여러 번 반복)", async () => {
  await createTestUser("매니저");
  const users = await Promise.all(
    Array.from({ length: 5 }, (_, i) => createApprovedMember(`동시${i + 1}`)),
  );
  const clients = await Promise.all(users.map(clientFor));

  for (let round = 0; round < 5; round++) {
    const roundId = await seedRound({
      startsAt: daysFromNow(3 + round),
      location: `동시성 ${round}`,
      capacity: 2,
    });

    const results = await Promise.all(
      clients.map((c) => c.rpc("cast_vote", { p_round: roundId, p_choice: "attend" })),
    );
    expect(results.every((r) => !r.error)).toBe(true);

    expect(await countStatuses(roundId)).toEqual({ attending: 2, waiting: 3, declined: 0 });
  }
});

test("정원이 없으면 동시에 신청한 전원이 참석이 된다", async () => {
  await createTestUser("매니저");
  const users = await Promise.all(
    Array.from({ length: 5 }, (_, i) => createApprovedMember(`무제한${i + 1}`)),
  );
  const clients = await Promise.all(users.map(clientFor));
  const roundId = await seedRound({ startsAt: daysFromNow(3), location: "무제한", capacity: null });

  await Promise.all(clients.map((c) => c.rpc("cast_vote", { p_round: roundId, p_choice: "attend" })));

  expect(await countStatuses(roundId)).toEqual({ attending: 5, waiting: 0, declined: 0 });
});

test("참석자들이 동시에 불참해도 대기자가 정원만큼만 승격되고 초과하지 않는다", async () => {
  await createTestUser("매니저");
  const users = await Promise.all(
    Array.from({ length: 6 }, (_, i) => createApprovedMember(`교차${i + 1}`)),
  );
  const clients = await Promise.all(users.map(clientFor));
  const roundId = await seedRound({ startsAt: daysFromNow(3), location: "교차", capacity: 2 });

  // 순서를 보장하기 위해 먼저 순차로 신청: 앞 2명 참석, 뒤 4명 대기
  for (const c of clients) {
    const { error } = await c.rpc("cast_vote", { p_round: roundId, p_choice: "attend" });
    expect(error).toBeNull();
  }
  expect(await countStatuses(roundId)).toEqual({ attending: 2, waiting: 4, declined: 0 });

  // 참석자 2명이 동시에 불참하고, 그 사이 대기자 한 명은 철회한다
  await Promise.all([
    clients[0].rpc("cast_vote", { p_round: roundId, p_choice: "decline" }),
    clients[1].rpc("cast_vote", { p_round: roundId, p_choice: "decline" }),
    clients[5].rpc("withdraw_vote", { p_round: roundId }),
  ]);

  expect(await countStatuses(roundId)).toEqual({ attending: 2, waiting: 1, declined: 2 });

  // 승격된 두 명은 가장 먼저 신청한 대기자(3, 4번째 신청자)여야 한다
  const { data } = await admin()
    .from("round_votes")
    .select("member_id, status")
    .eq("round_id", roundId)
    .eq("status", "attending");
  const attendingIds = (data as { member_id: string }[]).map((r) => r.member_id).sort();
  expect(attendingIds).toEqual([users[2].id, users[3].id].sort());
});
