import { FallbackProps } from "react-error-boundary";

export function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error instanceof Error ? error.message : String(error)}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}
