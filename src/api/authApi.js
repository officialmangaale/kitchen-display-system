const USER_SERVICE_BASE_URL = import.meta.env?.VITE_USER_SERVICE_BASE_URL || '';

export async function loginUser({ email, password }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const loginURL = new URL(USER_SERVICE_BASE_URL || origin, origin);
  loginURL.pathname = `${loginURL.pathname.replace(/\/+$/, '')}/users/login`;
  const res = await fetch(loginURL.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.status !== "success") {
    throw new Error(data.message || "Login failed");
  }

  return data.data;
}
