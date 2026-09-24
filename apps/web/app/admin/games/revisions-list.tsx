interface Revision {
  id: string;
  editorName: string | null;
  createdAt: string;
  licenseAcceptedAt: string | null;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN');
}

export function RevisionsList({ revisions }: { revisions: Revision[] }) {
  if (revisions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Lịch sử chỉnh sửa</h2>
      <table className="text-sm">
        <thead>
          <tr className="text-muted-foreground text-left text-xs">
            <th className="pr-4 font-normal">Người sửa</th>
            <th className="pr-4 font-normal">Thời gian</th>
            <th className="font-normal">Đồng ý CC BY-SA</th>
          </tr>
        </thead>
        <tbody>
          {revisions.map((r) => (
            <tr key={r.id}>
              <td className="pr-4 py-1">{r.editorName ?? 'Không rõ'}</td>
              <td className="pr-4 py-1">{formatDateTime(r.createdAt)}</td>
              <td className="py-1">
                {r.licenseAcceptedAt ? formatDateTime(r.licenseAcceptedAt) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
