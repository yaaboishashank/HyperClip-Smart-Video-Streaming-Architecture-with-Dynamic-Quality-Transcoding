import { useCallback, useEffect, useRef, useState } from "react";
// Callers supply a stable key describing the resource (ID, page, filters).
export function useResource(key, loader) {
  const load = useRef(loader);
  load.current = loader;
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({
    key,
    version: -1,
    data: null,
    error: "",
    loading: true,
  });
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ key, version, data: null, error: "", loading: true });
    Promise.resolve()
      .then(() => load.current(controller.signal))
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ key, version, data, error: "", loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            key,
            version,
            data: null,
            error: error.message,
            loading: false,
          });
      });
    return () => controller.abort();
  }, [key, version]);
  const current =
    state.key === key && state.version === version
      ? state
      : { data: null, error: "", loading: true };
  return { ...current, reload };
}
