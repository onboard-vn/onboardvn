export function clubJoinErrorMessage(status: number | null): string {
  if (status === 423 || status === 429) {
    return 'Không thể liên kết lúc này. Vui lòng thử lại sau.';
  }
  return 'Không thể liên kết. Vui lòng thử lại hoặc hỏi admin CLB.';
}
