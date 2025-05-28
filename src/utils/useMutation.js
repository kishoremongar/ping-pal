import { useState } from "react";

function useMutation(method) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const mutate = async (url, body) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();
      setResponse(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error, response };
}

export const usePost = () => useMutation("POST");
export const usePut = () => useMutation("PUT");
