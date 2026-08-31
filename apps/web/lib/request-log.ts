export function logRequest(input: {
  method: string;
  path: string;
  status: number;
}): void {
  console.info(
    JSON.stringify({
      method: input.method,
      path: input.path,
      status: input.status,
    }),
  );
}
