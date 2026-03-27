import { MemberFormScreen } from "@/domains/members/screens/MemberFormScreen";
import { ErrorState } from "@/components";

interface EditMemberPageProps {
  params: Promise<{ memberId: string }>;
}

export default async function EditMemberPage({ params }: EditMemberPageProps) {
  const { memberId } = await params;
  const numericMemberId = Number(memberId);

  if (!Number.isFinite(numericMemberId)) {
    return (
      <ErrorState
        description="The requested member identifier is not valid."
        error={new Error("Invalid member identifier.")}
        title="Member route is invalid"
      />
    );
  }

  return <MemberFormScreen key={numericMemberId} memberId={numericMemberId} />;
}
