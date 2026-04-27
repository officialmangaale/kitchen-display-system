export async function loginUser({ email, password }) {
  const res = await fetch("https://user-prod.mangaale.com/users/login", {
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
