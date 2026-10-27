import { NicknameForm } from "@/components/NicknameForm";
import { getCurrentMember } from "@/lib/members";
import { updateNickname } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const member = await getCurrentMember();
  const needsName = member?.nicknameSet === false;

  return (
    <main className="space-y-4 py-4">
      <h1 className="text-lg font-bold">{needsName ? "사용할 이름을 입력해 주세요" : "이름 수정"}</h1>
      {needsName && (
        <p className="text-sm text-neutral-600">
          카카오 계정에서 닉네임을 받아오지 못했습니다. 모임에서 사용할 이름을 입력하면 이용할 수 있습니다.
        </p>
      )}
      <NicknameForm
        initial={needsName ? "" : (member?.nickname ?? "")}
        submitLabel="저장"
        onSubmit={updateNickname}
      />
    </main>
  );
}
